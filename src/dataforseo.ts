/**
 * ═══════════════════════════════════════════════════════════════
 *  DataForSEO Service
 *  Full SEO research suite: keywords, SERP, domain analytics,
 *  on-page audits, content analysis, and business data.
 *  Env vars: DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD (Basic Auth)
 * ═══════════════════════════════════════════════════════════════
 */

// ── Keyword Types ────────────────────────────────────────────

export interface KeywordMetrics {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  competitionLevel: "LOW" | "MEDIUM" | "HIGH";
  keywordDifficulty?: number;
  trend?: number[];
}

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  competitionLevel: "LOW" | "MEDIUM" | "HIGH";
  keywordDifficulty?: number;
}

// ── SERP Types ───────────────────────────────────────────────

export interface SerpResult {
  keyword: string;
  locationCode: number;
  totalResults: number;
  items: SerpItem[];
  relatedSearches?: string[];
  peopleAlsoAsk?: string[];
}

export interface SerpItem {
  type: string;            // "organic", "local_pack", "featured_snippet", "people_also_ask", etc.
  position: number;
  title?: string;
  url?: string;
  domain?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  address?: string;
}

// ── Domain Analytics Types ───────────────────────────────────

export interface DomainOverview {
  target: string;
  organicTraffic: number;
  organicKeywords: number;
  rank: number;
  backlinks?: number;
  referringDomains?: number;
  metrics?: Record<string, any>;
}

export interface RankedKeyword {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
  cpc: number;
  competition: number;
  difficulty?: number;
}

export interface DomainCompetitor {
  domain: string;
  avgPosition: number;
  keywordIntersections: number;
  organicTraffic?: number;
}

// ── On-Page Types ────────────────────────────────────────────

export interface OnPageResult {
  url: string;
  statusCode: number;
  onpageScore: number;
  title?: string;
  description?: string;
  h1?: string[];
  loadTime?: number;
  size: number;
  checks: Record<string, boolean>;
  brokenLinks: number;
  brokenResources: number;
  duplicateTitle: boolean;
  duplicateDescription: boolean;
  resourceErrors?: any[];
}

// ── Content Analysis Types ───────────────────────────────────

export interface ContentAnalysisResult {
  url: string;
  title: string;
  author?: string;
  datePublished?: string;
  contentLength?: number;
  language?: string;
  sentiment?: { score: number; label: string };
  socialMetrics?: {
    facebook?: number;
    pinterest?: number;
    reddit?: number;
  };
  rating?: { value: number; count: number };
}

// ── Business Data Types ──────────────────────────────────────

export interface BusinessListing {
  title: string;
  address?: string;
  phone?: string;
  url?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  latitude?: number;
  longitude?: number;
  workHours?: Record<string, string>;
  placeId?: string;
  cid?: string;
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

  // ═══════════════════════════════════════════════════════════
  //  KEYWORDS
  // ═══════════════════════════════════════════════════════════

  async getKeywordMetrics(
    keywords: string[],
    locationCode: number = DEFAULT_LOCATION_CODE,
  ): Promise<KeywordMetrics[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");
    if (!keywords.length) return [];

    // Step 1: Bulk difficulty (cheap, up to 1000 keywords)
    const difficultyMap = new Map<string, number>();
    for (let i = 0; i < keywords.length; i += 1000) {
      const batch = keywords.slice(i, i + 1000);
      const response = await this.apiCall(
        "/v3/dataforseo_labs/google/bulk_keyword_difficulty/live",
        [{ keywords: batch, location_code: locationCode, language_code: "en" }],
      );
      this.logCost("Bulk difficulty", batch.length + " keywords", response);

      for (const task of response?.tasks || []) {
        for (const item of task?.result?.[0]?.items || []) {
          if (item.keyword && item.keyword_difficulty != null) {
            difficultyMap.set(item.keyword.toLowerCase(), item.keyword_difficulty);
          }
        }
      }
    }

    // Step 2: Get volume/CPC via keyword suggestions (seed data)
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

    console.log(`[dataforseo] Enriched ${allResults.length} keywords`);
    return allResults;
  }

  async getKeywordSuggestions(
    seed: string,
    locationCode: number = DEFAULT_LOCATION_CODE,
    limit: number = 50,
  ): Promise<KeywordSuggestion[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const response = await this.apiCall(
      "/v3/dataforseo_labs/google/keyword_suggestions/live",
      [{
        keyword: seed,
        location_code: locationCode,
        language_code: "en",
        limit,
        include_seed_keyword: true,
        include_serp_info: false,
      }],
    );
    this.logCost("Keyword suggestions", `"${seed}"`, response);

    const results: KeywordSuggestion[] = [];
    for (const task of response?.tasks || []) {
      for (const item of task?.result?.[0]?.items || []) {
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

  // ═══════════════════════════════════════════════════════════
  //  SERP
  // ═══════════════════════════════════════════════════════════

  async getSerpResults(
    keyword: string,
    locationCode: number = DEFAULT_LOCATION_CODE,
    depth: number = 20,
  ): Promise<SerpResult> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const response = await this.apiCall(
      "/v3/serp/google/organic/live/advanced",
      [{
        keyword,
        location_code: locationCode,
        language_code: "en",
        depth,
      }],
    );
    this.logCost("SERP", `"${keyword}"`, response);

    const result = response?.tasks?.[0]?.result?.[0] || {};
    const rawItems: any[] = result.items || [];

    const items: SerpItem[] = [];
    const relatedSearches: string[] = [];
    const peopleAlsoAsk: string[] = [];

    for (const item of rawItems) {
      if (item.type === "related_searches" && item.items) {
        for (const rs of item.items) {
          if (rs.title) relatedSearches.push(rs.title);
        }
        continue;
      }
      if (item.type === "people_also_ask" && item.items) {
        for (const paa of item.items) {
          if (paa.title) peopleAlsoAsk.push(paa.title);
        }
        continue;
      }

      // All other types: organic, local_pack, featured_snippet, etc.
      if (item.type === "local_pack" && item.items) {
        for (const lp of item.items) {
          items.push({
            type: "local_pack",
            position: lp.rank_absolute || item.rank_absolute,
            title: lp.title,
            url: lp.url,
            domain: lp.domain,
            description: lp.description,
            rating: lp.rating?.value,
            reviewCount: lp.rating?.votes_count,
            address: lp.address,
          });
        }
      } else {
        items.push({
          type: item.type,
          position: item.rank_absolute,
          title: item.title,
          url: item.url,
          domain: item.domain,
          description: item.description,
        });
      }
    }

    return {
      keyword,
      locationCode,
      totalResults: result.se_results_count ?? 0,
      items,
      relatedSearches: relatedSearches.length ? relatedSearches : undefined,
      peopleAlsoAsk: peopleAlsoAsk.length ? peopleAlsoAsk : undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  DOMAIN ANALYTICS
  // ═══════════════════════════════════════════════════════════

  async getDomainOverview(
    domain: string,
    locationCode: number = DEFAULT_LOCATION_CODE,
  ): Promise<DomainOverview> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const response = await this.apiCall(
      "/v3/dataforseo_labs/google/domain_rank_overview/live",
      [{ target: domain, location_code: locationCode, language_code: "en" }],
    );
    this.logCost("Domain overview", domain, response);

    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    const item = items[0] || {};
    const metrics = item.metrics || {};
    const organic = metrics.organic || {};

    return {
      target: domain,
      organicTraffic: organic.etv ?? item.organic_etv ?? 0,
      organicKeywords: organic.count ?? item.organic_count ?? 0,
      rank: item.rank ?? 0,
      backlinks: item.backlinks ?? undefined,
      referringDomains: item.referring_domains ?? undefined,
      metrics,
    };
  }

  async getDomainRankedKeywords(
    domain: string,
    locationCode: number = DEFAULT_LOCATION_CODE,
    limit: number = 50,
  ): Promise<RankedKeyword[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const response = await this.apiCall(
      "/v3/dataforseo_labs/google/ranked_keywords/live",
      [{
        target: domain,
        location_code: locationCode,
        language_code: "en",
        limit,
        order_by: ["ranked_serp_element.serp_item.rank_absolute,asc"],
      }],
    );
    this.logCost("Ranked keywords", domain, response);

    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    return items.map((item: any) => {
      const kd = item.keyword_data || {};
      const ki = kd.keyword_info || {};
      const se = item.ranked_serp_element?.serp_item || {};

      return {
        keyword: kd.keyword || "",
        position: se.rank_absolute ?? se.rank_group ?? 0,
        searchVolume: ki.search_volume ?? 0,
        url: se.url || "",
        cpc: ki.cpc ?? 0,
        competition: ki.competition ?? 0,
        difficulty: kd.keyword_properties?.keyword_difficulty,
      };
    });
  }

  async getDomainCompetitors(
    domain: string,
    locationCode: number = DEFAULT_LOCATION_CODE,
    limit: number = 20,
  ): Promise<DomainCompetitor[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const response = await this.apiCall(
      "/v3/dataforseo_labs/google/competitors_domain/live",
      [{
        target: domain,
        location_code: locationCode,
        language_code: "en",
        limit,
      }],
    );
    this.logCost("Domain competitors", domain, response);

    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    return items.map((item: any) => ({
      domain: item.domain || "",
      avgPosition: item.avg_position ?? 0,
      keywordIntersections: item.intersections ?? 0,
      organicTraffic: item.metrics?.organic?.etv,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  //  ON-PAGE ANALYSIS
  // ═══════════════════════════════════════════════════════════

  async analyzePageInstant(url: string): Promise<OnPageResult> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const response = await this.apiCall(
      "/v3/on_page/instant_pages",
      [{ url, enable_javascript: true }],
    );
    this.logCost("On-page analysis", url, response);

    const page = response?.tasks?.[0]?.result?.[0]?.items?.[0];
    if (!page) throw new Error("No page data returned — URL may be unreachable");

    const meta = page.meta || {};
    const htags = meta.htags || {};
    const checks = page.checks || {};
    const timing = page.page_timing || {};

    return {
      url: page.url || url,
      statusCode: page.status_code ?? 0,
      onpageScore: page.onpage_score ?? 0,
      title: meta.title,
      description: meta.description,
      h1: htags.h1 || [],
      loadTime: timing.duration_time,
      size: page.size ?? 0,
      checks,
      brokenLinks: page.broken_links ?? 0,
      brokenResources: page.broken_resources ?? 0,
      duplicateTitle: page.duplicate_title ?? false,
      duplicateDescription: page.duplicate_description ?? false,
      resourceErrors: page.resource_errors,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  CONTENT ANALYSIS
  // ═══════════════════════════════════════════════════════════

  async searchContent(
    keyword: string,
    limit: number = 20,
  ): Promise<ContentAnalysisResult[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    const response = await this.apiCall(
      "/v3/content_analysis/search/live",
      [{
        keyword,
        search_mode: "as_is",
        limit,
      }],
    );
    this.logCost("Content analysis", `"${keyword}"`, response);

    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    return items.map((item: any) => ({
      url: item.url || "",
      title: item.title || "",
      author: item.author || undefined,
      datePublished: item.date_published || undefined,
      contentLength: item.content_info?.size,
      language: item.language || undefined,
      sentiment: item.sentiment_connotations ? {
        score: item.sentiment_connotations.sentiment_score ?? 0,
        label: item.sentiment_connotations.sentiment ?? "neutral",
      } : undefined,
      socialMetrics: item.social_metrics ? {
        facebook: item.social_metrics.facebook_likes,
        pinterest: item.social_metrics.pinterest_pings,
        reddit: item.social_metrics.reddit_karma,
      } : undefined,
      rating: item.page_types?.includes("reviews") ? {
        value: item.rating?.value ?? 0,
        count: item.rating?.votes_count ?? 0,
      } : undefined,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  //  BUSINESS DATA (Google Maps / GBP)
  // ═══════════════════════════════════════════════════════════

  async searchBusinessListings(
    keyword: string,
    locationCode: number = DEFAULT_LOCATION_CODE,
    limit: number = 20,
  ): Promise<BusinessListing[]> {
    if (!this.authHeader) throw new Error("DataForSEO not configured");

    // Use Google Maps Live endpoint for instant results
    const response = await this.apiCall(
      "/v3/serp/google/maps/live/advanced",
      [{
        keyword,
        location_code: locationCode,
        language_code: "en",
        depth: limit,
      }],
    );
    this.logCost("Business search", `"${keyword}"`, response);

    const items = response?.tasks?.[0]?.result?.[0]?.items || [];
    return items.map((item: any) => ({
      title: item.title || "",
      address: item.address || undefined,
      phone: item.phone || undefined,
      url: item.url || item.domain || undefined,
      rating: item.rating?.value,
      reviewCount: item.rating?.votes_count,
      category: item.category || undefined,
      latitude: item.gps_coordinates?.latitude,
      longitude: item.gps_coordinates?.longitude,
      workHours: item.work_hours?.work_hours ? parseWorkHours(item.work_hours.work_hours) : undefined,
      placeId: item.place_id || undefined,
      cid: item.cid || undefined,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  //  PRIVATE
  // ═══════════════════════════════════════════════════════════

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

  private logCost(operation: string, detail: string, response: any): void {
    const cost = response?.cost ?? 0;
    console.log(`[dataforseo] ${operation} (${detail}): $${cost.toFixed(4)}`);
  }
}

function normalizeCompetitionLevel(level?: string): "LOW" | "MEDIUM" | "HIGH" {
  const upper = (level || "").toUpperCase();
  if (upper === "HIGH") return "HIGH";
  if (upper === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function parseWorkHours(hours: any): Record<string, string> | undefined {
  if (!hours || typeof hours !== "object") return undefined;
  const result: Record<string, string> = {};
  for (const [day, times] of Object.entries(hours)) {
    if (Array.isArray(times) && times.length) {
      result[day] = (times as any[]).map((t: any) =>
        `${t.open?.hour ?? ""}:${String(t.open?.minute ?? 0).padStart(2, "0")}-${t.close?.hour ?? ""}:${String(t.close?.minute ?? 0).padStart(2, "0")}`
      ).join(", ");
    }
  }
  return Object.keys(result).length ? result : undefined;
}
