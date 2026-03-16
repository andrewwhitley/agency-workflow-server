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

interface KeywordSuggestionResult {
  keyword_data?: {
    keyword: string;
    keyword_info?: {
      search_volume?: number;
      cpc?: number;
      competition?: number;
      competition_level?: string;
    };
    keyword_properties?: {
      keyword_difficulty?: number;
    };
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
   * Bulk keyword metrics lookup via Google Ads Search Volume API.
   * Costs ~$0.05 per 700 keywords.
   */
  async getKeywordMetrics(
    keywords: string[],
    locationCode: number = DEFAULT_LOCATION_CODE,
  ): Promise<KeywordMetrics[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");
    if (!keywords.length) return [];

    // API accepts max 700 keywords per request
    const batches: string[][] = [];
    for (let i = 0; i < keywords.length; i += 700) {
      batches.push(keywords.slice(i, i + 700));
    }

    const allResults: KeywordMetrics[] = [];

    for (const batch of batches) {
      const payload = [{
        keywords: batch,
        location_code: locationCode,
        language_code: "en",
      }];

      const startTime = Date.now();
      const response = await this.apiCall(
        "/v3/keywords_data/google_ads/search_volume/live",
        payload,
      );
      const elapsed = Date.now() - startTime;

      const cost = response?.cost ?? 0;
      console.log(`[dataforseo] Search volume: ${batch.length} keywords, $${cost.toFixed(4)}, ${elapsed}ms`);

      const tasks = response?.tasks || [];
      for (const task of tasks) {
        const results: SearchVolumeResult[] = task?.result || [];
        for (const r of results) {
          allResults.push({
            keyword: r.keyword,
            searchVolume: r.search_volume ?? 0,
            cpc: r.cpc ?? 0,
            competition: r.competition ?? 0,
            competitionLevel: normalizeCompetitionLevel(r.competition_level),
            trend: r.monthly_searches?.map((m) => m.search_volume),
          });
        }
      }
    }

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
      const items: KeywordSuggestionResult[] = task?.result?.[0]?.items || [];
      for (const item of items) {
        const kd = item.keyword_data;
        if (!kd?.keyword) continue;
        results.push({
          keyword: kd.keyword,
          searchVolume: kd.keyword_info?.search_volume ?? 0,
          cpc: kd.keyword_info?.cpc ?? 0,
          competition: kd.keyword_info?.competition ?? 0,
          competitionLevel: normalizeCompetitionLevel(kd.keyword_info?.competition_level),
          keywordDifficulty: kd.keyword_properties?.keyword_difficulty,
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
