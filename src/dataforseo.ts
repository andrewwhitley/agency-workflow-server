/**
 * ═══════════════════════════════════════════════════════════════
 *  DataForSEO Service
 *  Provides keyword metrics and suggestions via DataForSEO API.
 *  Follows the GoogleAuthService pattern — graceful degradation
 *  when credentials are not set.
 *  Env vars: DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD (Basic Auth)
 * ═══════════════════════════════════════════════════════════════
 */

// ── Types ────────────────────────────────────────────────────

export interface KeywordMetrics {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;          // 0-1
  competitionLevel: "LOW" | "MEDIUM" | "HIGH";
  keywordDifficulty?: number;   // 0-100
  trend?: number[];             // 12-month search volume trend
}

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  competitionLevel: "LOW" | "MEDIUM" | "HIGH";
  keywordDifficulty?: number;
}

interface SearchVolumeResult {
  keyword: string;
  search_volume?: number;
  cpc?: number;
  competition?: number;
  competition_level?: string;
  monthly_searches?: Array<{ search_volume: number }>;
}

interface KeywordSuggestionItem {
  keyword?: string;
  keyword_info?: {
    search_volume?: number;
    cpc?: number;
    competition?: number;
    competition_level?: string;
    monthly_searches?: Array<{ search_volume: number }>;
  };
  keyword_properties?: {
    keyword_difficulty?: number;
  };
}

// ── Service ──────────────────────────────────────────────────

const API_BASE = "https://api.dataforseo.com";
const DEFAULT_LOCATION_CODE = 2840; // United States

export class DataForSEOService {
  private authHeader: string | null = null;
  private login: string = "";

  constructor() {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (login && password) {
      this.login = login;
      this.authHeader = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
    }
  }

  isAuthenticated(): boolean {
    return this.authHeader !== null;
  }

  getLogin(): string {
    return this.login;
  }

  /**
   * Bulk keyword metrics lookup. Two-step approach:
   * 1. Bulk difficulty (cheap, 1000 keywords/call) for keyword_difficulty
   * 2. Keyword suggestions with include_seed_keyword for vol/CPC/competition
   *    (only for keywords where step 1 didn't return volume)
   */
  async getKeywordMetrics(
    keywords: string[],
    locationCode: number = DEFAULT_LOCATION_CODE,
  ): Promise<KeywordMetrics[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");
    if (!keywords.length) return [];

    // Step 1: Bulk difficulty for all keywords at once (cheap)
    const difficultyMap = new Map<string, number>();
    const batches: string[][] = [];
    for (let i = 0; i < keywords.length; i += 1000) {
      batches.push(keywords.slice(i, i + 1000));
    }

    for (const batch of batches) {
      const startTime = Date.now();
      const response = await this.apiCall(
        "/v3/dataforseo_labs/google/bulk_keyword_difficulty/live",
        [{ keywords: batch, location_code: locationCode, language_code: "en" }],
      );
      const elapsed = Date.now() - startTime;
      const cost = response?.cost ?? 0;
      console.log(`[dataforseo] Bulk difficulty: ${batch.length} keywords, $${cost.toFixed(4)}, ${elapsed}ms`);

      for (const task of response?.tasks || []) {
        for (const item of task?.result?.[0]?.items || []) {
          if (item.keyword && item.keyword_difficulty != null) {
            difficultyMap.set(item.keyword.toLowerCase(), item.keyword_difficulty);
          }
        }
      }
    }

    // Step 2: Get volume/CPC via keyword suggestions (seed data)
    // Process in parallel batches of 10 to avoid rate limits
    const allResults: KeywordMetrics[] = [];
    const parallelLimit = 10;

    for (let i = 0; i < keywords.length; i += parallelLimit) {
      const chunk = keywords.slice(i, i + parallelLimit);
      const promises = chunk.map(async (kw) => {
        try {
          const response = await this.apiCall(
            "/v3/dataforseo_labs/google/keyword_suggestions/live",
            [{
              keyword: kw,
              location_code: locationCode,
              language_code: "en",
              limit: 1,
              include_seed_keyword: true,
              include_serp_info: false,
            }],
          );

          const seed = response?.tasks?.[0]?.result?.[0]?.seed_keyword_data;
          const ki = seed?.keyword_info;
          const kp = seed?.keyword_properties;

          return {
            keyword: kw,
            searchVolume: ki?.search_volume ?? 0,
            cpc: ki?.cpc ?? 0,
            competition: ki?.competition ?? 0,
            competitionLevel: normalizeCompetitionLevel(ki?.competition_level),
            keywordDifficulty: kp?.keyword_difficulty ?? difficultyMap.get(kw.toLowerCase()),
            trend: ki?.monthly_searches?.map((m: any) => m.search_volume),
          } as KeywordMetrics;
        } catch {
          // Fallback to difficulty-only data
          return {
            keyword: kw,
            searchVolume: 0,
            cpc: 0,
            competition: 0,
            competitionLevel: "LOW" as const,
            keywordDifficulty: difficultyMap.get(kw.toLowerCase()),
          } as KeywordMetrics;
        }
      });

      const results = await Promise.all(promises);
      allResults.push(...results);
    }

    const totalCostNote = keywords.length > 5 ? " (multiple API calls)" : "";
    console.log(`[dataforseo] Enriched ${allResults.length} keywords${totalCostNote}`);

    return allResults;
  }

  /**
   * Get keyword suggestions from a seed keyword via DataForSEO Labs.
   * Returns related keywords with metrics.
   */
  async getKeywordSuggestions(
    seed: string,
    locationCode: number = DEFAULT_LOCATION_CODE,
    limit: number = 50,
  ): Promise<KeywordSuggestion[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const payload = [{
      keyword: seed,
      location_code: locationCode,
      language_code: "en",
      limit,
      include_seed_keyword: true,
      include_serp_info: false,
    }];

    const startTime = Date.now();
    const response = await this.apiCall(
      "/v3/dataforseo_labs/google/keyword_suggestions/live",
      payload,
    );
    const elapsed = Date.now() - startTime;

    const cost = response?.cost ?? 0;
    console.log(`[dataforseo] Keyword suggestions for "${seed}": $${cost.toFixed(4)}, ${elapsed}ms`);

    const results: KeywordSuggestion[] = [];
    const tasks = response?.tasks || [];

    for (const task of tasks) {
      const items: KeywordSuggestionItem[] = task?.result?.[0]?.items || [];
      for (const item of items) {
        if (!item.keyword) continue;
        results.push({
          keyword: item.keyword,
          searchVolume: item.keyword_info?.search_volume ?? 0,
          cpc: item.keyword_info?.cpc ?? 0,
          competition: item.keyword_info?.competition ?? 0,
          competitionLevel: normalizeCompetitionLevel(item.keyword_info?.competition_level),
          keywordDifficulty: item.keyword_properties?.keyword_difficulty,
        });
      }
    }

    return results;
  }

  // ── Private ──────────────────────────────────────────────

  private async apiCall(path: string, payload: unknown): Promise<any> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Authorization": this.authHeader!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`DataForSEO API error ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json();
  }
}

function normalizeCompetitionLevel(level?: string): "LOW" | "MEDIUM" | "HIGH" {
  const upper = (level || "").toUpperCase();
  if (upper === "HIGH") return "HIGH";
  if (upper === "MEDIUM") return "MEDIUM";
  return "LOW";
}
