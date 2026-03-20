/**
 * ═══════════════════════════════════════════════════════════════
 *  Prospect Enrichment Pipeline
 *  Import → Enrich → Score → Export for sales outreach.
 *  Evaluates prospects across 4 pillars (Website, SEO, Ads, AI/Automation)
 *  plus size qualifiers and additional signals.
 * ═══════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import { getPool } from "./database.js";
import { DataForSEOService } from "./dataforseo.js";
import { GoogleDriveService } from "./google-drive.js";
import { GoogleAuthService } from "./google-auth.js";
import { EventEmitter } from "events";

// ── Types ─────────────────────────────────────────────────────

export interface Prospect {
  id: string;
  source_sheet_id: string;
  source_tab: string;
  source_row: number;
  // Coldlytics original fields
  company_name: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  industry: string;
  sub_industry: string;
  employee_count: string;
  revenue_range: string;
  contact_name: string;
  contact_title: string;
  contact_email: string;
  contact_phone: string;
  contact_linkedin: string;
  gmb_link: string;
  facebook_url: string;
  notes: string;
  // Derived
  domain: string | null;
  specialty: string | null;
  enrichment_status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  enrichment_error: string | null;
  // Size qualifiers
  provider_count: number | null;
  location_count: number | null;
  estimated_revenue: string | null;
  total_staff: number | null;
  // Pillar 1: Website
  website_platform: string | null;
  website_quality_score: number | null;
  website_load_time: number | null;
  website_mobile_friendly: boolean | null;
  website_status: string | null;
  onpage_score: number | null;
  // Pillar 2: SEO
  top_services: any | null;
  organic_traffic: number | null;
  organic_keywords: number | null;
  domain_rank: number | null;
  page1_rankings: any | null;
  ranked_keywords_sample: any | null;
  // Pillar 3: Ads
  has_fb_pixel: boolean | null;
  has_google_pixel: boolean | null;
  has_other_ad_networks: any | null;
  // Pillar 4: AI/Automation
  has_chatbot: boolean | null;
  chatbot_provider: string | null;
  crm_platform: string | null;
  has_booking_widget: boolean | null;
  booking_provider: string | null;
  has_lead_capture: boolean | null;
  lead_capture_types: any | null;
  provider_details: any | null;
  // Additional signals
  gbp_rating: number | null;
  gbp_review_count: number | null;
  social_active: any | null;
  competitor_count: number | null;
  contact_quality: string | null;
  // Scoring
  pillar_scores: any | null;
  total_score: number | null;
  qualification_tier: string | null;
  sales_angles: any | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentRun {
  id: string;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  total_prospects: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  estimated_cost: number;
  actual_cost: number;
  batch_size: number;
  concurrency: number;
  cost_cap: number;
  dry_run: boolean;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface EnrichmentStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  skipped: number;
  tierDistribution: Record<string, number>;
  avgScore: number;
  topStates: { state: string; count: number }[];
}

export interface EnrichmentProgress {
  runId: string;
  status: string;
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  cost: number;
  currentProspect?: string;
}

// ── Column mappings from Coldlytics sheet ─────────────────────

// Maps Coldlytics sheet headers → DB columns.
// Order matters: first match wins for each header.
const COLDLYTICS_COLUMNS: Record<string, string> = {
  "Company Name": "company_name",
  "Website": "website",
  "Phone Number": "phone",
  "Phone": "phone",
  "Email Address": "contact_email",
  "Email": "contact_email",
  "Address": "address",
  "City": "city",
  "State": "state",
  "Zip": "zip",
  "Country": "country",
  "Industry": "industry",
  "Sub-Industry": "sub_industry",
  "Revenue": "revenue_range",
  "Revenue Range": "revenue_range",
  "Headcount": "employee_count",
  "Employee Count": "employee_count",
  "Job Title": "contact_title",
  "Contact Title": "contact_title",
  "Direct Dial": "contact_phone",
  "Contact Phone": "contact_phone",
  "LinkedIn Profile": "contact_linkedin",
  "Contact LinkedIn": "contact_linkedin",
  "Company Facebook Profile": "facebook_url",
  "Facebook URL": "facebook_url",
  "GMB Profile": "gmb_link",
  "GMB Link": "gmb_link",
  "Contact Name": "contact_name",
  "Contact Email": "contact_email",
  "Notes": "notes",
};

// These columns are stored in raw_data but need special handling during import
const SPECIAL_COLUMNS = ["First Name", "Last Name", "Facebook Ad Pixel", "Google Ad Pixel", "LinkedIn Ad Pixel"];

// ── HTML Detection Patterns ───────────────────────────────────

const PLATFORM_PATTERNS: [RegExp, string][] = [
  [/wp-content|wp-includes|wordpress/i, "WordPress"],
  [/wix\.com|X-Wix-/i, "Wix"],
  [/squarespace/i, "Squarespace"],
  [/webflow/i, "Webflow"],
  [/shopify/i, "Shopify"],
  [/sites\.google\.com/i, "Google Sites"],
  [/weebly/i, "Weebly"],
  [/godaddy/i, "GoDaddy"],
  [/duda/i, "Duda"],
];

const FB_PIXEL_PATTERN = /fbq\(|facebook\.com\/tr|fb-pixel|connect\.facebook\.net\/.*fbevents/i;
const GOOGLE_ADS_PATTERN = /gtag\(.*AW-|googleads|google_conversion|adservices\.google/i;
const TIKTOK_PIXEL = /analytics\.tiktok\.com|ttq\.track/i;
const BING_UET = /bat\.bing\.com|UET/i;
const LINKEDIN_INSIGHT = /snap\.licdn\.com|linkedin.*insight/i;

const CHATBOT_PATTERNS: [RegExp, string][] = [
  [/intercom/i, "Intercom"],
  [/drift/i, "Drift"],
  [/hs-script-loader.*hubspot|hubspot.*chatflow/i, "HubSpot Chat"],
  [/tidio/i, "Tidio"],
  [/livechat/i, "LiveChat"],
  [/zendesk/i, "Zendesk"],
  [/msgsndr\.com.*chat|leadconnector.*chat/i, "GHL Chat"],
  [/tawk\.to/i, "Tawk.to"],
  [/crisp\.chat/i, "Crisp"],
];

const CRM_PATTERNS: [RegExp, string][] = [
  [/msgsndr\.com|leadconnector/i, "GoHighLevel"],
  [/hs-script-loader|hubspot/i, "HubSpot"],
  [/salesforce|pardot/i, "Salesforce"],
  [/zoho/i, "Zoho"],
  [/keap|infusionsoft/i, "Keap"],
  [/activecampaign/i, "ActiveCampaign"],
];

const BOOKING_PATTERNS: [RegExp, string][] = [
  [/calendly/i, "Calendly"],
  [/acuityscheduling/i, "Acuity"],
  [/janeapp/i, "Jane App"],
  [/intakeq/i, "IntakeQ"],
  [/simplepractice/i, "SimplePractice"],
  [/zocdoc/i, "Zocdoc"],
  [/healthgrades/i, "Healthgrades"],
  [/mindbody|booker/i, "Mindbody"],
];

const LEAD_CAPTURE_PATTERNS: [RegExp, string][] = [
  [/optinmonster/i, "OptinMonster"],
  [/sumo\.com/i, "Sumo"],
  [/mailchimp/i, "Mailchimp"],
  [/convertkit/i, "ConvertKit"],
  [/<form[\s>]/i, "Form"],
  [/popup|modal.*email|email.*modal/i, "Popup"],
];

// ── Helper: extract domain from URL ───────────────────────────

function extractDomain(url: string): string | null {
  if (!url) return null;
  try {
    let normalized = url.trim();
    if (!normalized.startsWith("http")) normalized = "https://" + normalized;
    const parsed = new URL(normalized);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ── Helper: detect specialty ──────────────────────────────────

function detectSpecialty(prospect: Partial<Prospect>): string | null {
  const text = [
    prospect.company_name,
    prospect.industry,
    prospect.sub_industry,
    prospect.notes,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/functional\s*medicine/i.test(text)) return "functional_medicine";
  if (/concierge\s*medicine/i.test(text)) return "concierge_medicine";
  if (/integrative\s*(medicine|health)/i.test(text)) return "integrative_medicine";
  if (/naturopath/i.test(text)) return "naturopathic";
  if (/chiropract/i.test(text)) return "chiropractic";
  if (/wellness/i.test(text)) return "wellness";
  if (/holistic/i.test(text)) return "holistic";
  if (/anti.?aging|longevity/i.test(text)) return "anti_aging";
  return null;
}

// ── Score Calculation ─────────────────────────────────────────

function calculateScores(p: Partial<Prospect>): {
  pillar_scores: Record<string, number>;
  total_score: number;
  qualification_tier: string;
  sales_angles: string[];
} {
  const scores: Record<string, number> = {};
  const angles: string[] = [];

  // ── Size score (max 40) — "Can they afford $5k/mo marketing?" ──
  // 3 tiers: Startup/solo (low), Small clinic 2-4 providers (mid), Established $1M+/5+ providers (full)
  // Either revenue OR provider count can qualify — whichever is higher.
  let sizeScore = 0;

  // Parse revenue to a number
  const revRaw = (p.estimated_revenue || p.revenue_range || "").replace(/[^0-9.]/g, "");
  const revNum = revRaw ? parseFloat(revRaw) : 0;
  // Handle formatted values like "$3,000,000" → 3000000, "3M" already stripped to "3"
  const revNormalized = revNum < 1000 ? revNum * 1000000 : revNum; // if someone wrote "3" meaning $3M

  // Revenue score
  let revScore = 0;
  if (revNormalized >= 1000000) revScore = 40;        // $1M+ → full points, established clinic
  else if (revNormalized >= 500000) revScore = 30;     // $500k-$1M → strong small clinic
  else if (revNormalized >= 250000) revScore = 20;     // $250k-$500k → small clinic
  else if (revNormalized > 0) revScore = 10;           // Under $250k → startup

  // Provider count score
  let provScore = 0;
  const providerCount = p.provider_count || 0;
  if (providerCount >= 5) provScore = 40;              // 5+ providers → full points
  else if (providerCount >= 3) provScore = 30;         // 3-4 → strong small clinic
  else if (providerCount >= 2) provScore = 20;         // 2 → small clinic
  else if (providerCount >= 1) provScore = 10;         // Solo

  // Employee count as fallback proxy when revenue and providers unknown
  let empScore = 0;
  const empRaw = (p.employee_count || "").replace(/[^0-9]/g, "");
  const empNum = empRaw ? parseInt(empRaw) : 0;
  if (empNum >= 20) empScore = 35;       // 20+ employees → likely $1M+ practice
  else if (empNum >= 10) empScore = 25;  // 10-19 → mid-size
  else if (empNum >= 5) empScore = 15;   // 5-9 → small clinic
  else if (empNum >= 2) empScore = 8;    // 2-4 → very small

  // Take the best signal
  sizeScore = Math.max(revScore, provScore, empScore);

  // Multi-location bonus (additive, but don't exceed max)
  const locationCount = p.location_count || 1;
  if (locationCount >= 2) {
    angles.push(`Multi-location practice (${locationCount} locations)`);
  }

  scores.size = Math.min(40, sizeScore);

  // ── Website opportunity (max 15) — "Can we help their web presence?" ────
  let websiteScore = 0;
  const platform = (p.website_platform || "").toLowerCase();
  if (!platform || platform === "wix" || platform === "squarespace" || platform === "google sites" || platform === "godaddy" || platform === "weebly") {
    websiteScore += 7;
    angles.push("Website redesign opportunity — weak or outdated platform");
  } else if (platform === "wordpress") {
    websiteScore += 2;
  }

  const qualityScore = p.website_quality_score ?? p.onpage_score ?? null;
  if (qualityScore !== null) {
    if (qualityScore < 40) { websiteScore += 5; angles.push("Low website quality score"); }
    else if (qualityScore < 60) websiteScore += 3;
    else if (qualityScore < 80) websiteScore += 1;
  }

  const loadTime = p.website_load_time ?? null;
  if (loadTime !== null && loadTime > 4) { websiteScore += 3; }
  scores.website = Math.min(15, websiteScore);

  // ── SEO opportunity (max 20) — "Can we grow their search traffic?" ────
  let seoScore = 0;
  const traffic = p.organic_traffic ?? null;
  if (traffic !== null) {
    if (traffic < 100) { seoScore += 8; angles.push("Virtually invisible in search — massive SEO upside"); }
    else if (traffic < 500) { seoScore += 5; angles.push("Low organic traffic — room to grow significantly"); }
    else if (traffic < 2000) seoScore += 3;
  } else {
    seoScore += 4; // Unknown traffic — assume moderate opportunity
  }

  const rankings = p.page1_rankings;
  const rankingCount = Array.isArray(rankings) ? rankings.length : (typeof rankings === "string" ? JSON.parse(rankings || "[]").length : 0);
  if (rankingCount === 0) { seoScore += 8; }
  else if (rankingCount < 5) seoScore += 5;
  else if (rankingCount < 15) seoScore += 2;

  const domainRank = p.domain_rank || 0;
  if (domainRank < 10) seoScore += 4;
  else if (domainRank < 30) seoScore += 2;
  scores.seo = Math.min(20, seoScore);

  // ── Active ad investment (max 10) — "Are they already spending on growth?" ────
  let adsScore = 0;
  if (p.has_fb_pixel && p.has_google_pixel) {
    adsScore += 10;
    angles.push("Running both FB + Google ads — active growth investment");
  } else if (p.has_fb_pixel || p.has_google_pixel) {
    adsScore += 6;
    angles.push("Running paid ads on one channel");
  }
  // No pixels = 0 — neutral, not negative. It's an opportunity but doesn't increase score.
  scores.ads = Math.min(10, adsScore);

  // ── Established & reputable (max 10) — reviews + rating combined ────
  let establishedScore = 0;
  const reviewCount = p.gbp_review_count || 0;
  const rating = p.gbp_rating || 0;
  if (reviewCount >= 100 && rating >= 4.5) { establishedScore = 10; }
  else if (reviewCount >= 50 && rating >= 4.0) { establishedScore = 7; }
  else if (reviewCount >= 20) { establishedScore = 5; }
  else if (reviewCount >= 5) { establishedScore = 2; }
  scores.established = establishedScore;

  // ── Contact quality (max 5) — "Can we actually reach them?" ────
  let contactScore = 0;
  if (p.contact_email) contactScore += 2;
  if (p.contact_phone) contactScore += 2;
  if (p.contact_linkedin) contactScore += 1;
  scores.contact = Math.min(5, contactScore);

  const total = scores.size + scores.website + scores.seo + scores.ads + scores.established + scores.contact;

  let tier: string;
  if (total >= 70) tier = "dream";
  else if (total >= 50) tier = "good";
  else if (total >= 30) tier = "maybe";
  else tier = "unqualified";

  // Keep only top 3-4 sales angles
  const topAngles = angles.slice(0, 4);

  return {
    pillar_scores: scores,
    total_score: total,
    qualification_tier: tier,
    sales_angles: topAngles,
  };
}

// ── Enrichment Service Class ──────────────────────────────────

export class EnrichmentService {
  private seoService: DataForSEOService;
  private authService: GoogleAuthService;
  private emitter = new EventEmitter();
  private activeRun: { id: string; status: string; cancel: boolean; pause: boolean } | null = null;
  private domainCache = new Map<string, { data: any; timestamp: number }>();

  constructor(seoService: DataForSEOService, authService: GoogleAuthService) {
    this.seoService = seoService;
    this.authService = authService;
  }

  // ── Import from Coldlytics Sheet ──────────────────────────

  async importFromSheet(sheetId: string, tab?: string): Promise<{ imported: number; skipped: number; total: number }> {
    if (!this.authService.isAuthenticated()) {
      throw new Error("Google Drive not connected");
    }

    const { extractGoogleId } = await import("./google-drive.js");
    const id = extractGoogleId(sheetId);

    // Use Drive API to export as CSV (avoids Sheets API scope issues)
    const { google } = await import("googleapis");
    const drive = google.drive({ version: "v3", auth: this.authService.getClient() });

    // If a tab is specified, we need to find its gid from spreadsheet metadata
    // Drive export URL supports gid parameter: exportFormat=csv&gid=XXXX
    let csvText: string;
    if (tab) {
      // Use the export link with gid — first get sheet list via Drive API
      // The Drive files.export only exports the first sheet, so we use a direct URL
      const client = this.authService.getClient();
      await client.authorize();
      const token = client.credentials.access_token;

      // Get spreadsheet metadata to find the gid for the requested tab
      // Use the Drive API files.get which works with Drive scope
      const fileMeta = await drive.files.get({
        fileId: id,
        fields: "id,name",
      });

      // Try to export with tab name encoded in URL
      // Google Sheets export URL format: /spreadsheets/d/{id}/export?format=csv&gid={gid}
      // Since we can't easily get gid without Sheets API, export via URL with sheet name
      const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
      const resp = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Failed to export sheet tab "${tab}": ${resp.status} ${resp.statusText}`);
      csvText = await resp.text();
    } else {
      // Default: export first sheet via Drive API
      const res = await drive.files.export(
        { fileId: id, mimeType: "text/csv" },
        { responseType: "text" }
      );
      csvText = String(res.data);
    }

    // Parse CSV into rows
    const rows = this.parseCsv(csvText);
    if (!rows || rows.length < 2) throw new Error("Sheet is empty or has no data rows");

    const headers = rows[0];
    const columnMap: Record<number, string> = {};   // colIdx → db column
    const specialMap: Record<number, string> = {};  // colIdx → special header name
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].trim();
      if (SPECIAL_COLUMNS.includes(header)) {
        specialMap[i] = header;
        continue;
      }
      // Try exact match first, then fuzzy
      const dbCol = COLDLYTICS_COLUMNS[header];
      if (dbCol) {
        columnMap[i] = dbCol;
      } else {
        const normalized = header.toLowerCase().replace(/[\s_-]+/g, "");
        for (const [key, val] of Object.entries(COLDLYTICS_COLUMNS)) {
          if (key.toLowerCase().replace(/[\s_-]+/g, "") === normalized) {
            columnMap[i] = val;
            break;
          }
        }
      }
    }

    const pool = getPool();
    let imported = 0;
    let skipped = 0;
    const tabName = tab || "Sheet1";

    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const record: Record<string, string> = {};
      const specials: Record<string, string> = {};
      for (const [colIdx, colName] of Object.entries(columnMap)) {
        record[colName] = row[parseInt(colIdx)] || "";
      }
      for (const [colIdx, headerName] of Object.entries(specialMap)) {
        specials[headerName] = row[parseInt(colIdx)] || "";
      }

      // Merge First Name + Last Name → contact_name
      const firstName = specials["First Name"] || "";
      const lastName = specials["Last Name"] || "";
      if (firstName || lastName) {
        record.contact_name = [firstName, lastName].filter(Boolean).join(" ");
      }

      // Store pixel info in notes if present
      const pixelNotes: string[] = [];
      if (specials["Facebook Ad Pixel"]) pixelNotes.push(`FB Pixel: ${specials["Facebook Ad Pixel"]}`);
      if (specials["Google Ad Pixel"]) pixelNotes.push(`Google Pixel: ${specials["Google Ad Pixel"]}`);
      if (specials["LinkedIn Ad Pixel"]) pixelNotes.push(`LinkedIn Pixel: ${specials["LinkedIn Ad Pixel"]}`);
      if (pixelNotes.length > 0) {
        record.notes = [record.notes, ...pixelNotes].filter(Boolean).join("; ");
      }

      // Skip empty rows
      if (!record.company_name && !record.website) {
        skipped++;
        continue;
      }

      const domain = extractDomain(record.website);
      const specialty = detectSpecialty(record as any);

      try {
        await pool.query(`
          INSERT INTO enrichment_prospects (
            source_sheet_id, source_tab, source_row,
            company_name, website, phone, email, address, city, state, zip, country,
            industry, sub_industry, employee_count, revenue_range,
            contact_name, contact_title, contact_email, contact_phone, contact_linkedin,
            gmb_link, facebook_url, notes,
            domain, specialty, enrichment_status
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,'pending')
          ON CONFLICT (source_sheet_id, source_tab, source_row)
          DO UPDATE SET
            company_name = EXCLUDED.company_name,
            website = EXCLUDED.website,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip = EXCLUDED.zip,
            country = EXCLUDED.country,
            industry = EXCLUDED.industry,
            sub_industry = EXCLUDED.sub_industry,
            employee_count = EXCLUDED.employee_count,
            revenue_range = EXCLUDED.revenue_range,
            contact_name = EXCLUDED.contact_name,
            contact_title = EXCLUDED.contact_title,
            contact_email = EXCLUDED.contact_email,
            contact_phone = EXCLUDED.contact_phone,
            contact_linkedin = EXCLUDED.contact_linkedin,
            gmb_link = EXCLUDED.gmb_link,
            facebook_url = EXCLUDED.facebook_url,
            notes = EXCLUDED.notes,
            domain = EXCLUDED.domain,
            specialty = EXCLUDED.specialty,
            updated_at = NOW()
        `, [
          sheetId, tabName, rowIdx,
          record.company_name || "", record.website || "", record.phone || "",
          record.email || "", record.address || "", record.city || "",
          record.state || "", record.zip || "", record.country || "",
          record.industry || "", record.sub_industry || "",
          record.employee_count || "", record.revenue_range || "",
          record.contact_name || "", record.contact_title || "",
          record.contact_email || "", record.contact_phone || "",
          record.contact_linkedin || "", record.gmb_link || "",
          record.facebook_url || "", record.notes || "",
          domain, specialty,
        ]);
        imported++;
      } catch (err) {
        console.error(`Failed to import row ${rowIdx}:`, err);
        skipped++;
      }
    }

    return { imported, skipped, total: rows.length - 1 };
  }

  // ── List Prospects ────────────────────────────────────────

  async listProspects(filters: {
    tier?: string;
    status?: string;
    state?: string;
    specialty?: string;
    search?: string;
    sort?: string;
    order?: "asc" | "desc";
    limit?: number;
    offset?: number;
  } = {}): Promise<{ prospects: Prospect[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (filters.tier) {
      conditions.push(`qualification_tier = $${paramIdx++}`);
      params.push(filters.tier);
    }
    if (filters.status) {
      conditions.push(`enrichment_status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters.state) {
      conditions.push(`state = $${paramIdx++}`);
      params.push(filters.state);
    }
    if (filters.specialty) {
      conditions.push(`specialty = $${paramIdx++}`);
      params.push(filters.specialty);
    }
    if (filters.search) {
      conditions.push(`(company_name ILIKE $${paramIdx} OR domain ILIKE $${paramIdx} OR city ILIKE $${paramIdx})`);
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const allowedSorts = ["total_score", "company_name", "state", "qualification_tier", "enrichment_status", "created_at"];
    const sort = allowedSorts.includes(filters.sort || "") ? filters.sort : "total_score";
    const order = filters.order === "asc" ? "ASC" : "DESC";
    const limit = Math.min(filters.limit || 50, 200);
    const offset = filters.offset || 0;

    const [dataResult, countResult] = await Promise.all([
      pool.query(`SELECT * FROM enrichment_prospects ${where} ORDER BY ${sort} ${order} NULLS LAST LIMIT $${paramIdx++} OFFSET $${paramIdx++}`, [...params, limit, offset]),
      pool.query(`SELECT COUNT(*)::int as total FROM enrichment_prospects ${where}`, params),
    ]);

    return {
      prospects: dataResult.rows,
      total: countResult.rows[0].total,
    };
  }

  // ── Get Single Prospect ───────────────────────────────────

  async getProspect(id: string): Promise<Prospect | null> {
    const { rows } = await getPool().query("SELECT * FROM enrichment_prospects WHERE id = $1", [id]);
    return rows[0] || null;
  }

  // ── Stats ─────────────────────────────────────────────────

  async getStats(): Promise<EnrichmentStats> {
    const pool = getPool();
    const [counts, tiers, avgScore, topStates] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE enrichment_status = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE enrichment_status = 'completed')::int as completed,
          COUNT(*) FILTER (WHERE enrichment_status = 'failed')::int as failed,
          COUNT(*) FILTER (WHERE enrichment_status = 'skipped')::int as skipped
        FROM enrichment_prospects
      `),
      pool.query(`
        SELECT qualification_tier, COUNT(*)::int as count
        FROM enrichment_prospects WHERE qualification_tier IS NOT NULL
        GROUP BY qualification_tier
      `),
      pool.query(`SELECT COALESCE(AVG(total_score), 0)::float as avg FROM enrichment_prospects WHERE total_score IS NOT NULL`),
      pool.query(`
        SELECT state, COUNT(*)::int as count
        FROM enrichment_prospects WHERE state IS NOT NULL AND state != ''
        GROUP BY state ORDER BY count DESC LIMIT 10
      `),
    ]);

    const tierDist: Record<string, number> = {};
    for (const row of tiers.rows) {
      tierDist[row.qualification_tier] = row.count;
    }

    return {
      ...counts.rows[0],
      tierDistribution: tierDist,
      avgScore: Math.round(avgScore.rows[0].avg * 10) / 10,
      topStates: topStates.rows,
    };
  }

  // ── Enrichment Run Management ─────────────────────────────

  async startEnrichment(options: {
    batchSize?: number;
    concurrency?: number;
    max?: number;
    dryRun?: boolean;
    costCap?: number;
  } = {}): Promise<{ runId: string }> {
    if (this.activeRun && this.activeRun.status === "running") {
      throw new Error("An enrichment run is already in progress");
    }

    const pool = getPool();
    const batchSize = options.batchSize || 10;
    const concurrency = options.concurrency || 2;
    const costCap = options.costCap || 50;
    const dryRun = options.dryRun || false;
    const max = options.max || (dryRun ? 5 : 0); // 0 = no limit

    // Count pending prospects
    const { rows: [{ count: totalPending }] } = await pool.query(
      "SELECT COUNT(*)::int as count FROM enrichment_prospects WHERE enrichment_status = 'pending'"
    );
    const totalToProcess = max > 0 ? Math.min(max, totalPending) : totalPending;
    const estimatedCost = totalToProcess * 0.04;

    // Create run record
    const { rows: [run] } = await pool.query(`
      INSERT INTO enrichment_runs (status, total_prospects, batch_size, concurrency, cost_cap, dry_run, estimated_cost)
      VALUES ('running', $1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [totalToProcess, batchSize, concurrency, costCap, dryRun, estimatedCost]);

    this.activeRun = { id: run.id, status: "running", cancel: false, pause: false };

    // Start enrichment in background
    this.runEnrichmentLoop(run.id, { batchSize, concurrency, max: totalToProcess, costCap, dryRun }).catch((err) => {
      console.error("Enrichment loop error:", err);
      this.updateRunStatus(run.id, "failed", err.message).catch(console.error);
    });

    return { runId: run.id };
  }

  // ── Backfill: run Claude analysis on already-enriched prospects ──

  async startBackfill(options: {
    batchSize?: number;
    concurrency?: number;
    max?: number;
    costCap?: number;
  } = {}): Promise<{ runId: string }> {
    if (this.activeRun && this.activeRun.status === "running") {
      throw new Error("An enrichment run is already in progress");
    }

    const pool = getPool();
    const batchSize = options.batchSize || 10;
    const concurrency = options.concurrency || 2;
    const costCap = options.costCap || 20;
    const max = options.max || 0;

    // Count completed prospects missing provider data
    const { rows: [{ count: totalBackfill }] } = await pool.query(
      "SELECT COUNT(*)::int as count FROM enrichment_prospects WHERE enrichment_status = 'completed' AND provider_count IS NULL AND website_status = 'live'"
    );
    const totalToProcess = max > 0 ? Math.min(max, totalBackfill) : totalBackfill;
    const estimatedCost = totalToProcess * 0.01;

    const { rows: [run] } = await pool.query(`
      INSERT INTO enrichment_runs (status, total_prospects, batch_size, concurrency, cost_cap, dry_run, estimated_cost)
      VALUES ('running', $1, $2, $3, $4, false, $5)
      RETURNING id
    `, [totalToProcess, batchSize, concurrency, costCap, estimatedCost]);

    this.activeRun = { id: run.id, status: "running", cancel: false, pause: false };

    this.runBackfillLoop(run.id, { batchSize, concurrency, max: totalToProcess, costCap }).catch((err) => {
      console.error("Backfill loop error:", err);
      this.updateRunStatus(run.id, "failed", err.message).catch(console.error);
    });

    return { runId: run.id };
  }

  private async runBackfillLoop(
    runId: string,
    options: { batchSize: number; concurrency: number; max: number; costCap: number }
  ): Promise<void> {
    const pool = getPool();
    let processed = 0, succeeded = 0, failed = 0, skipped = 0, actualCost = 0;

    while (processed < options.max) {
      if (this.activeRun?.cancel) {
        await this.updateRunStatus(runId, "cancelled");
        this.activeRun = null;
        return;
      }

      if (this.activeRun?.pause) {
        await this.updateRunStatus(runId, "paused");
        this.activeRun.status = "paused";
        await new Promise<void>((resolve) => {
          const check = () => {
            if (!this.activeRun?.pause || this.activeRun?.cancel) resolve();
            else setTimeout(check, 500);
          };
          setTimeout(check, 500);
        });
        if (this.activeRun?.cancel) {
          await this.updateRunStatus(runId, "cancelled");
          this.activeRun = null;
          return;
        }
      }

      if (actualCost >= options.costCap) {
        await this.updateRunStatus(runId, "paused", `Cost cap reached ($${actualCost.toFixed(2)}/$${options.costCap})`);
        this.activeRun = null;
        return;
      }

      const remaining = options.max - processed;
      const batchLimit = Math.min(options.batchSize, remaining);
      const { rows: batch } = await pool.query(`
        SELECT * FROM enrichment_prospects
        WHERE enrichment_status = 'completed' AND provider_count IS NULL AND website_status = 'live'
        ORDER BY total_score DESC
        LIMIT $1
      `, [batchLimit]);

      if (batch.length === 0) break;

      for (let i = 0; i < batch.length; i += options.concurrency) {
        const chunk = batch.slice(i, i + options.concurrency);
        const results = await Promise.allSettled(
          chunk.map((p) => this.backfillProspect(p))
        );

        for (let j = 0; j < results.length; j++) {
          processed++;
          if (results[j].status === "fulfilled") {
            const val = (results[j] as PromiseFulfilledResult<{ skipped: boolean; cost: number }>).value;
            if (val.skipped) skipped++;
            else { succeeded++; actualCost += val.cost; }
          } else {
            failed++;
          }

          await pool.query(`
            UPDATE enrichment_runs SET processed = $2, succeeded = $3, failed = $4, skipped = $5, actual_cost = $6 WHERE id = $1
          `, [runId, processed, succeeded, failed, skipped, actualCost]);

          this.emitter.emit("progress", {
            runId, status: "running", processed, total: options.max,
            succeeded, failed, skipped, cost: actualCost,
            currentProspect: chunk[j]?.company_name,
          } as EnrichmentProgress);
        }
      }
    }

    await pool.query(`
      UPDATE enrichment_runs SET status = 'completed', completed_at = NOW(), processed = $2, succeeded = $3, failed = $4, skipped = $5, actual_cost = $6 WHERE id = $1
    `, [runId, processed, succeeded, failed, skipped, actualCost]);

    this.emitter.emit("progress", {
      runId, status: "completed", processed, total: options.max,
      succeeded, failed, skipped, cost: actualCost,
    });
    this.activeRun = null;
  }

  private async backfillProspect(prospect: Prospect): Promise<{ skipped: boolean; cost: number }> {
    const pool = getPool();
    const websiteUrl = prospect.website?.startsWith("http") ? prospect.website : `https://${prospect.website}`;

    // Fetch website HTML
    let html = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(websiteUrl, {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyBot/1.0)" },
      });
      clearTimeout(timeout);
      if (resp.ok) html = await resp.text();
    } catch {
      // Site unreachable — skip
    }

    if (!html) return { skipped: true, cost: 0 };

    // Run Claude analysis
    const trimmedHtml = html.length > 12000 ? html.slice(0, 12000) : html;
    const claude = new Anthropic();
    const msg = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: `Analyze this medical practice website HTML. Return ONLY valid JSON with these fields:
- provider_count: number of doctors/providers/practitioners (NPs, PAs, DOs, MDs, DCs count). 0 if unknown.
- provider_names: array of provider names found (empty array if none)
- total_staff: estimated total staff if determinable, 0 if unknown
- top_services: array of up to 8 main services offered (e.g. "Hormone Therapy", "IV Therapy", "Functional Medicine")

Practice: ${prospect.company_name}, ${prospect.city}, ${prospect.state}
HTML:\n${trimmedHtml}`,
      }],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { skipped: true, cost: 0.01 };

    const parsed = JSON.parse(jsonMatch[0]);
    const updates: Record<string, any> = {};

    if (parsed.provider_count && parsed.provider_count > 0) {
      updates.provider_count = parsed.provider_count;
    }
    if (parsed.total_staff && parsed.total_staff > 0) {
      updates.total_staff = parsed.total_staff;
    }
    if (Array.isArray(parsed.top_services) && parsed.top_services.length > 0) {
      updates.top_services = JSON.stringify(parsed.top_services);
    }
    if (Array.isArray(parsed.provider_names) && parsed.provider_names.length > 0) {
      updates.provider_details = JSON.stringify(parsed.provider_names);
    }

    if (Object.keys(updates).length === 0) return { skipped: true, cost: 0.01 };

    // Re-score with new data
    const merged = { ...prospect, ...updates };
    const scoring = calculateScores(merged);
    updates.pillar_scores = JSON.stringify(scoring.pillar_scores);
    updates.total_score = scoring.total_score;
    updates.qualification_tier = scoring.qualification_tier;
    updates.sales_angles = JSON.stringify(scoring.sales_angles);

    const setClauses: string[] = [];
    const values: any[] = [prospect.id];
    let idx = 2;
    for (const [key, val] of Object.entries(updates)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
    setClauses.push("updated_at = NOW()");

    await pool.query(
      `UPDATE enrichment_prospects SET ${setClauses.join(", ")} WHERE id = $1`,
      values
    );

    await this.delay(100);
    return { skipped: false, cost: 0.01 };
  }

  async pauseEnrichment(): Promise<void> {
    if (!this.activeRun) throw new Error("No active enrichment run");
    this.activeRun.pause = true;
  }

  async resumeEnrichment(): Promise<void> {
    if (!this.activeRun) throw new Error("No active enrichment run");
    this.activeRun.pause = false;
    this.activeRun.status = "running";
    await this.updateRunStatus(this.activeRun.id, "running");
    this.emitter.emit("progress");
  }

  async cancelEnrichment(): Promise<void> {
    if (!this.activeRun) throw new Error("No active enrichment run");
    this.activeRun.cancel = true;
  }

  getProgressEmitter(): EventEmitter {
    return this.emitter;
  }

  async getEnrichmentRuns(): Promise<EnrichmentRun[]> {
    const { rows } = await getPool().query(
      "SELECT * FROM enrichment_runs ORDER BY started_at DESC LIMIT 20"
    );
    return rows;
  }

  // ── Core Enrichment Loop ──────────────────────────────────

  private async runEnrichmentLoop(
    runId: string,
    options: { batchSize: number; concurrency: number; max: number; costCap: number; dryRun: boolean }
  ): Promise<void> {
    const pool = getPool();
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    let actualCost = 0;

    while (processed < options.max) {
      // Check for cancellation
      if (this.activeRun?.cancel) {
        await this.updateRunStatus(runId, "cancelled");
        this.activeRun = null;
        return;
      }

      // Check for pause
      if (this.activeRun?.pause) {
        await this.updateRunStatus(runId, "paused");
        this.activeRun.status = "paused";
        // Wait for resume
        await new Promise<void>((resolve) => {
          const check = () => {
            if (!this.activeRun?.pause || this.activeRun?.cancel) {
              resolve();
            } else {
              setTimeout(check, 500);
            }
          };
          setTimeout(check, 500);
        });
        if (this.activeRun?.cancel) {
          await this.updateRunStatus(runId, "cancelled");
          this.activeRun = null;
          return;
        }
      }

      // Check cost cap
      if (actualCost >= options.costCap) {
        await this.updateRunStatus(runId, "paused", `Cost cap reached ($${actualCost.toFixed(2)}/$${options.costCap})`);
        this.activeRun = null;
        return;
      }

      // Fetch next batch
      const remaining = options.max - processed;
      const batchLimit = Math.min(options.batchSize, remaining);
      const { rows: batch } = await pool.query(`
        SELECT * FROM enrichment_prospects
        WHERE enrichment_status = 'pending'
        ORDER BY
          CASE WHEN revenue_range != '' AND revenue_range != '0' THEN CAST(REGEXP_REPLACE(revenue_range, '[^0-9]', '', 'g') AS BIGINT) ELSE 0 END DESC,
          CASE WHEN employee_count != '' AND employee_count != '0' THEN CAST(REGEXP_REPLACE(employee_count, '[^0-9]', '', 'g') AS INTEGER) ELSE 0 END DESC,
          id
        LIMIT $1
      `, [batchLimit]);

      if (batch.length === 0) break;

      // Process batch with concurrency
      for (let i = 0; i < batch.length; i += options.concurrency) {
        const chunk = batch.slice(i, i + options.concurrency);
        const results = await Promise.allSettled(
          chunk.map((p) => this.enrichProspect(p, options.dryRun))
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          processed++;
          if (result.status === "fulfilled") {
            if (result.value.skipped) skipped++;
            else {
              succeeded++;
              actualCost += result.value.cost;
            }
          } else {
            failed++;
          }

          // Update run counters
          await pool.query(`
            UPDATE enrichment_runs
            SET processed = $2, succeeded = $3, failed = $4, skipped = $5, actual_cost = $6
            WHERE id = $1
          `, [runId, processed, succeeded, failed, skipped, actualCost]);

          // Emit progress
          this.emitter.emit("progress", {
            runId,
            status: "running",
            processed,
            total: options.max,
            succeeded,
            failed,
            skipped,
            cost: actualCost,
            currentProspect: chunk[j]?.company_name,
          } as EnrichmentProgress);
        }
      }
    }

    // Complete
    await pool.query(`
      UPDATE enrichment_runs
      SET status = 'completed', completed_at = NOW(), processed = $2, succeeded = $3, failed = $4, skipped = $5, actual_cost = $6
      WHERE id = $1
    `, [runId, processed, succeeded, failed, skipped, actualCost]);

    this.emitter.emit("progress", {
      runId, status: "completed", processed, total: options.max,
      succeeded, failed, skipped, cost: actualCost,
    });
    this.activeRun = null;
  }

  // ── Enrich Single Prospect (6 stages) ─────────────────────

  private async enrichProspect(prospect: Prospect, dryRun: boolean): Promise<{ skipped: boolean; cost: number }> {
    const pool = getPool();
    let cost = 0;

    // Mark as in_progress
    await pool.query(
      "UPDATE enrichment_prospects SET enrichment_status = 'in_progress', updated_at = NOW() WHERE id = $1",
      [prospect.id]
    );

    try {
      const domain = prospect.domain || extractDomain(prospect.website);
      if (!domain && !prospect.website) {
        // No website — skip most stages, just score based on what we have
        const scoring = calculateScores(prospect);
        await pool.query(`
          UPDATE enrichment_prospects
          SET enrichment_status = 'skipped', website_status = 'none',
              pillar_scores = $2, total_score = $3, qualification_tier = $4, sales_angles = $5,
              updated_at = NOW()
          WHERE id = $1
        `, [prospect.id, JSON.stringify(scoring.pillar_scores), scoring.total_score, scoring.qualification_tier, JSON.stringify(scoring.sales_angles)]);
        return { skipped: true, cost: 0 };
      }

      const websiteUrl = prospect.website?.startsWith("http") ? prospect.website : `https://${prospect.website}`;
      const updates: Record<string, any> = { domain };

      // ── Stage 1: Website Fetch ──────────────────────────
      let html = "";
      let websiteStatus = "live";
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const resp = await fetch(websiteUrl, {
          signal: controller.signal,
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyBot/1.0)" },
        });
        clearTimeout(timeout);
        websiteStatus = resp.ok ? "live" : `error_${resp.status}`;
        if (resp.ok) {
          html = await resp.text();
        }
      } catch (err: any) {
        // Retry once
        try {
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 10000);
          const resp2 = await fetch(websiteUrl.replace("https://", "http://"), {
            signal: controller2.signal,
            redirect: "follow",
            headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyBot/1.0)" },
          });
          clearTimeout(timeout2);
          websiteStatus = resp2.ok ? "live" : `error_${resp2.status}`;
          if (resp2.ok) html = await resp2.text();
        } catch {
          websiteStatus = "dead";
        }
      }
      updates.website_status = websiteStatus;

      // ── Stage 2: Programmatic HTML Detection ────────────
      if (html) {
        // Platform
        for (const [pattern, name] of PLATFORM_PATTERNS) {
          if (pattern.test(html)) { updates.website_platform = name; break; }
        }

        // Ad pixels
        updates.has_fb_pixel = FB_PIXEL_PATTERN.test(html);
        updates.has_google_pixel = GOOGLE_ADS_PATTERN.test(html);
        const otherAds: string[] = [];
        if (TIKTOK_PIXEL.test(html)) otherAds.push("TikTok");
        if (BING_UET.test(html)) otherAds.push("Bing");
        if (LINKEDIN_INSIGHT.test(html)) otherAds.push("LinkedIn");
        updates.has_other_ad_networks = JSON.stringify(otherAds);

        // Chatbot
        for (const [pattern, name] of CHATBOT_PATTERNS) {
          if (pattern.test(html)) {
            updates.has_chatbot = true;
            updates.chatbot_provider = name;
            break;
          }
        }
        if (!updates.has_chatbot) updates.has_chatbot = false;

        // CRM
        for (const [pattern, name] of CRM_PATTERNS) {
          if (pattern.test(html)) { updates.crm_platform = name; break; }
        }

        // Booking
        for (const [pattern, name] of BOOKING_PATTERNS) {
          if (pattern.test(html)) {
            updates.has_booking_widget = true;
            updates.booking_provider = name;
            break;
          }
        }
        if (!updates.has_booking_widget) updates.has_booking_widget = false;

        // Lead capture
        const captureTypes: string[] = [];
        for (const [pattern, name] of LEAD_CAPTURE_PATTERNS) {
          if (pattern.test(html)) captureTypes.push(name);
        }
        updates.has_lead_capture = captureTypes.length > 0;
        updates.lead_capture_types = JSON.stringify(captureTypes);
      }

      // ── Stage 3: DataForSEO — quick domain overview only ──
      if (domain && websiteStatus !== "dead" && this.seoService.isAuthenticated() && !dryRun) {
        // Check domain cache (30-day TTL)
        const cached = this.domainCache.get(domain);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        if (cached && (Date.now() - cached.timestamp) < thirtyDays) {
          Object.assign(updates, cached.data);
        } else {
          const seoData: Record<string, any> = {};
          try {
            // Single call: domain overview (traffic, keywords, rank)
            const overview = await this.seoService.getDomainOverview(domain);
            seoData.organic_traffic = Math.round(overview.organicTraffic || 0);
            seoData.organic_keywords = Math.round(overview.organicKeywords || 0);
            seoData.domain_rank = Math.round(overview.rank || 0);
            cost += 0.01;

            Object.assign(updates, seoData);
            this.domainCache.set(domain, { data: seoData, timestamp: Date.now() });

            await this.delay(200);
          } catch (err) {
            console.error(`DataForSEO error for ${domain}:`, err);
          }
        }
      }

      // ── Stage 4: Claude Analysis — provider count, services, staff ──
      if (html && !dryRun) {
        try {
          // Find and fetch team/about page for provider info
          let teamHtml = "";
          const teamUrl = this.findTeamPageUrl(html, websiteUrl);
          if (teamUrl) {
            try {
              const ctrl = new AbortController();
              const t = setTimeout(() => ctrl.abort(), 10000);
              const r = await fetch(teamUrl, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyBot/1.0)" } });
              clearTimeout(t);
              if (r.ok) teamHtml = await r.text();
            } catch { /* team page fetch failed */ }
          }

          // Strip HTML to plain text for better content density
          const homeText = this.stripHtml(html);
          const teamText = teamHtml ? this.stripHtml(teamHtml) : "";
          let content = "";
          if (teamText) {
            const trimmedTeam = teamText.length > 8000 ? teamText.slice(0, 8000) : teamText;
            const trimmedHome = homeText.length > 4000 ? homeText.slice(0, 4000) : homeText;
            content = `HOMEPAGE TEXT:\n${trimmedHome}\n\nTEAM/ABOUT PAGE TEXT:\n${trimmedTeam}`;
          } else {
            content = homeText.length > 10000 ? homeText.slice(0, 10000) : homeText;
          }

          const claude = new Anthropic();
          const msg = await claude.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            messages: [{
              role: "user",
              content: `Analyze this medical practice website. Return ONLY valid JSON with these fields:
- provider_count: number of doctors/providers/practitioners (NPs, PAs, DOs, MDs, DCs count). 0 if unknown.
- provider_names: array of provider names found (empty array if none)
- total_staff: estimated total staff if determinable, 0 if unknown
- top_services: array of up to 8 main services offered (e.g. "Hormone Therapy", "IV Therapy", "Functional Medicine")

Practice: ${prospect.company_name}, ${prospect.city}, ${prospect.state}
${content}`,
            }],
          });

          const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.provider_count && parsed.provider_count > 0) {
              updates.provider_count = parsed.provider_count;
            }
            if (parsed.total_staff && parsed.total_staff > 0) {
              updates.total_staff = parsed.total_staff;
            }
            if (Array.isArray(parsed.top_services) && parsed.top_services.length > 0) {
              updates.top_services = JSON.stringify(parsed.top_services);
            }
            if (Array.isArray(parsed.provider_names) && parsed.provider_names.length > 0) {
              updates.provider_details = JSON.stringify(parsed.provider_names);
            }
          }
          cost += 0.01;
          await this.delay(100);
        } catch (err) {
          console.error(`Claude analysis error for ${prospect.company_name}:`, err);
        }
      }

      // ── Stage 5: GBP Enrichment ────────────────────────
      if (prospect.gmb_link && this.seoService.isAuthenticated() && !dryRun) {
        try {
          const searchQuery = `${prospect.company_name} ${prospect.city} ${prospect.state}`;
          const listings = await this.seoService.searchBusinessListings(searchQuery, undefined, 3);
          if (listings.length > 0) {
            const best = listings[0];
            updates.gbp_rating = best.rating || null;
            updates.gbp_review_count = best.reviewCount || null;
          }
          cost += 0.01;
        } catch {
          // GBP lookup may fail
        }
      }

      // ── Stage 6: Score Calculation ─────────────────────
      // Merge updates with existing prospect data for scoring
      const merged = { ...prospect, ...updates };
      const scoring = calculateScores(merged);
      updates.pillar_scores = JSON.stringify(scoring.pillar_scores);
      updates.total_score = scoring.total_score;
      updates.qualification_tier = scoring.qualification_tier;
      updates.sales_angles = JSON.stringify(scoring.sales_angles);

      // ── Persist all updates ────────────────────────────
      const setClauses: string[] = [];
      const values: any[] = [prospect.id];
      let idx = 2;
      for (const [key, val] of Object.entries(updates)) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(val);
      }
      setClauses.push("enrichment_status = 'completed'");
      setClauses.push("updated_at = NOW()");

      await pool.query(
        `UPDATE enrichment_prospects SET ${setClauses.join(", ")} WHERE id = $1`,
        values
      );

      return { skipped: false, cost };
    } catch (err: any) {
      await pool.query(
        "UPDATE enrichment_prospects SET enrichment_status = 'failed', enrichment_error = $2, updated_at = NOW() WHERE id = $1",
        [prospect.id, err.message?.slice(0, 500)]
      );
      throw err;
    }
  }

  // ── Export to Google Sheet ─────────────────────────────────

  async exportToSheet(sheetId: string, filters?: { tier?: string }): Promise<{ exported: number; file?: string }> {
    if (!this.authService.isAuthenticated()) {
      throw new Error("Google Drive not connected");
    }

    const pool = getPool();
    let query = "SELECT * FROM enrichment_prospects WHERE enrichment_status = 'completed'";
    const params: any[] = [];
    if (filters?.tier) {
      query += " AND qualification_tier = $1";
      params.push(filters.tier);
    }
    query += " ORDER BY total_score DESC";

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) return { exported: 0 };

    const headers = [
      "Company Name", "Domain", "City", "State", "Specialty",
      "Total Score", "Tier", "Size Score", "Website Score", "SEO Score", "Ads Score", "AI Score",
      "Website Platform", "Organic Traffic", "Organic Keywords", "Domain Rank",
      "Has FB Pixel", "Has Google Pixel", "Has Chatbot", "Chatbot Provider",
      "CRM Platform", "Has Booking", "Booking Provider", "Has Lead Capture",
      "GBP Rating", "GBP Reviews", "Provider Count", "Employee Count",
      "Top Services", "Provider Details",
      "Sales Angles", "Contact Name", "Contact Email", "Contact Phone", "Contact LinkedIn",
      "Website", "GMB Link",
    ];

    const dataRows = rows.map((r) => {
      const pillarScores = typeof r.pillar_scores === "string" ? JSON.parse(r.pillar_scores) : (r.pillar_scores || {});
      const salesAngles = typeof r.sales_angles === "string" ? JSON.parse(r.sales_angles) : (r.sales_angles || []);
      return [
        r.company_name, r.domain, r.city, r.state, r.specialty,
        r.total_score, r.qualification_tier,
        pillarScores.size || 0, pillarScores.website || 0, pillarScores.seo || 0, pillarScores.ads || 0, pillarScores.ai_automation || 0,
        r.website_platform, r.organic_traffic, r.organic_keywords, r.domain_rank,
        r.has_fb_pixel ? "Yes" : "No", r.has_google_pixel ? "Yes" : "No",
        r.has_chatbot ? "Yes" : "No", r.chatbot_provider,
        r.crm_platform, r.has_booking_widget ? "Yes" : "No", r.booking_provider,
        r.has_lead_capture ? "Yes" : "No",
        r.gbp_rating, r.gbp_review_count, r.provider_count, r.employee_count,
        Array.isArray(r.top_services) ? r.top_services.join("; ") : (r.top_services || ""),
        Array.isArray(r.provider_details) ? r.provider_details.join("; ") : (r.provider_details || ""),
        salesAngles.join("; "),
        r.contact_name, r.contact_email, r.contact_phone, r.contact_linkedin,
        r.website, r.gmb_link,
      ];
    });

    // Build CSV content
    const csvRows = [headers, ...dataRows];
    const csvContent = csvRows.map((row) =>
      row.map((cell) => {
        const str = String(cell ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    ).join("\n");

    // Write to local file for upload
    const fs = await import("fs");
    const path = await import("path");
    const exportPath = path.join(process.cwd(), "data", `enrichment-export-${Date.now()}.csv`);
    fs.writeFileSync(exportPath, csvContent, "utf-8");

    return { exported: rows.length, file: exportPath };
  }

  // ── Helpers ───────────────────────────────────────────────

  private async updateRunStatus(runId: string, status: string, error?: string): Promise<void> {
    const completedAt = (status === "completed" || status === "failed" || status === "cancelled") ? "NOW()" : "NULL";
    await getPool().query(
      `UPDATE enrichment_runs SET status = $2, error = $3, completed_at = ${completedAt} WHERE id = $1`,
      [runId, status, error || null]
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  private findTeamPageUrl(html: string, baseUrl: string): string | null {
    const linkRegex = /href=["']([^"']+)["']/gi;
    const seen = new Set<string>();
    const scored: { url: string; score: number }[] = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      try {
        const full = new URL(href, baseUrl).href;
        if (seen.has(full)) continue;
        seen.add(full);
        if (new URL(full).hostname !== new URL(baseUrl).hostname) continue;
        const path = new URL(full).pathname.toLowerCase();
        if (path.match(/\.(jpg|png|gif|svg|css|js|pdf|zip)$/i)) continue;
        let score = 0;
        if (path.match(/meet[_-]?(the[_-]?)?team/i)) score = 10;
        else if (path.match(/our[_-]?(team|doctors|providers|practitioners|staff|chiropractors)/i)) score = 9;
        else if (path.match(/\/(team|providers|practitioners|doctors|staff|clinicians)\b/i)) score = 8;
        else if (path.match(/about[_-]?us.*team|team.*about/i)) score = 7;
        else if (path.match(/about[_-]?us|about\b|who[_-]?we[_-]?are/i)) score = 5;
        if (score > 0) scored.push({ url: full, score });
      } catch { /* invalid URL */ }
    }
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.url || null;
  }

  /** Parse CSV text into a 2D array of strings, handling quoted fields */
  private parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i++; // skip escaped quote
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          current.push(field);
          field = "";
        } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
          current.push(field);
          field = "";
          if (current.some((c) => c.trim())) rows.push(current);
          current = [];
          if (ch === "\r") i++; // skip \n after \r
        } else {
          field += ch;
        }
      }
    }
    // Last field/row
    if (field || current.length > 0) {
      current.push(field);
      if (current.some((c) => c.trim())) rows.push(current);
    }

    return rows;
  }
}
