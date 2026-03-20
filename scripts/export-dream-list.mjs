#!/usr/bin/env node
/**
 * Export enriched prospects to Google Sheets Dream List.
 * One tab per source list (Functional Medicine, Concierge Medicine), sorted by score.
 * Filter by tier/score within each tab.
 *
 * Usage: node scripts/export-dream-list.mjs [--min-score 50]
 */

import "dotenv/config";
import pg from "pg";
import { google } from "googleapis";
import fs from "fs";

const SHEET_ID = "1iiaciX2d5lQKKOi3sqz-LZcHfKSjBNiYNDpzybsEvec";
const SERVICE_ACCOUNT_PATH = "data/service-account.json";

const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const MIN_SCORE = parseInt(getArg("--min-score") || "0");

// Map source_tab values to clean sheet names
const TAB_NAMES = {
  "Functional Medicine Providers (9407)": "Functional Medicine",
  "Concierge Medicine Clinics (15879)": "Concierge Medicine",
};

// Revenue per provider estimates by specialty (sourced from industry data)
// Chiropractic: ~$507K avg collections (ChiroEco 2024 survey), conservative $300K for smaller practices
// Concierge: 100 patients × $500/mo avg membership = $600K
// Concierge-adjacent (DPC/blank in concierge tab): $300K conservative
// Functional/integrative/wellness/holistic/naturopathic/anti-aging: $250K (cash-pay, lower volume)
const REV_PER_PROVIDER = {
  chiropractic: 300000,
  concierge_medicine: 600000,
};
const REV_DEFAULT_FM = 250000;  // functional medicine source tab default
const REV_DEFAULT_CM = 300000;  // concierge medicine source tab default (DPC-adjacent)

function estimateRevenue(prospect) {
  const providerCount = prospect.provider_count;
  if (!providerCount || providerCount <= 0) return null;

  const specialty = prospect.specialty || "";
  const isConciergeTab = (prospect.source_tab || "").includes("Concierge");

  let perProvider;
  if (REV_PER_PROVIDER[specialty]) {
    perProvider = REV_PER_PROVIDER[specialty];
  } else if (isConciergeTab) {
    perProvider = REV_DEFAULT_CM;
  } else {
    perProvider = REV_DEFAULT_FM;
  }

  return providerCount * perProvider;
}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  // Build query
  let where = "enrichment_status = 'completed'";
  const params = [];
  if (MIN_SCORE > 0) { params.push(MIN_SCORE); where += ` AND total_score >= $${params.length}`; }

  const { rows } = await pool.query(
    `SELECT * FROM enrichment_prospects WHERE ${where} ORDER BY total_score DESC`,
    params
  );
  console.log(`Found ${rows.length} prospects to export${MIN_SCORE ? ` (min score: ${MIN_SCORE})` : ""}`);

  if (rows.length === 0) { await pool.end(); return; }

  // Auth with service account
  const creds = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const headers = [
    // Identity & Score
    "Score", "Tier", "Company", "Specialty", "Website", "City", "State",
    // Size & Revenue
    "Est. Revenue", "Coldlytics Revenue", "Employees", "Providers", "Provider Names",
    // Contact
    "Contact Name", "Contact Title", "Contact Email", "Contact Phone", "Contact LinkedIn",
    // Services
    "Services",
    // Pillar Scores
    "Size Score", "SEO Score", "Website Score", "Ads Score", "Reputation Score", "Contact Score",
    // SEO Details
    "Organic Traffic", "Organic Keywords", "Domain Rank",
    // Website Details
    "Website Platform",
    // Ads Details
    "FB Pixel", "Google Pixel", "Other Ad Networks",
    // Tech Stack
    "Chatbot", "CRM", "Booking", "Lead Capture",
    // Reputation
    "GBP Rating", "GBP Reviews",
    // Sales
    "Sales Angles",
    // Links
    "GMB Link", "Facebook",
  ];

  function parseJson(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
    return [];
  }

  function formatRevenue(raw) {
    if (!raw) return "";
    const num = parseInt(String(raw).replace(/[$,]/g, ""));
    if (isNaN(num) || num === 0) return "";
    if (num >= 1000000) return "$" + (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return "$" + (num / 1000).toFixed(0) + "K";
    return "$" + num;
  }

  function toRow(r) {
    const salesAngles = parseJson(r.sales_angles);
    const topServices = parseJson(r.top_services);
    const providerDetails = parseJson(r.provider_details);
    const otherAds = parseJson(r.has_other_ad_networks);
    const leadTypes = parseJson(r.lead_capture_types);
    const pillars = typeof r.pillar_scores === "string" ? JSON.parse(r.pillar_scores) : (r.pillar_scores || {});
    // Merge employee_count and total_staff into one value
    const employees = r.employee_count || (r.total_staff ? String(r.total_staff) : "");

    return [
      // Identity & Score
      r.total_score || 0,
      r.qualification_tier || "",
      r.company_name || "",
      r.specialty || "",
      r.website || "",
      r.city || "",
      r.state || "",
      // Size & Revenue
      formatRevenue(estimateRevenue(r)),
      formatRevenue(r.revenue_range),
      employees,
      r.provider_count ?? "",
      providerDetails.join(", "),
      // Contact
      r.contact_name || "",
      r.contact_title || "",
      r.contact_email || "",
      r.contact_phone || "",
      r.contact_linkedin || "",
      // Services
      topServices.join(", "),
      // Pillar Scores
      pillars.size ?? "",
      pillars.seo ?? "",
      pillars.website ?? "",
      pillars.ads ?? "",
      pillars.established ?? "",
      pillars.contact ?? "",
      // SEO Details
      r.organic_traffic || "",
      r.organic_keywords || "",
      r.domain_rank || "",
      // Website Details
      r.website_platform || "",
      // Ads Details
      r.has_fb_pixel ? "Yes" : "",
      r.has_google_pixel ? "Yes" : "",
      otherAds.length > 0 ? otherAds.join(", ") : "",
      // Tech Stack
      r.has_chatbot ? (r.chatbot_provider || "Yes") : "",
      r.crm_platform || "",
      r.has_booking_widget ? (r.booking_provider || "Yes") : "",
      r.has_lead_capture ? leadTypes.join(", ") || "Yes" : "",
      // Reputation
      r.gbp_rating || "",
      r.gbp_review_count || "",
      // Sales
      salesAngles.join("; "),
      // Links
      r.gmb_link || "",
      r.facebook_url || "",
    ];
  }

  // Group by source tab
  const grouped = {};
  for (const row of rows) {
    const tab = row.source_tab || "Other";
    if (!grouped[tab]) grouped[tab] = [];
    grouped[tab].push(row);
  }

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });

  for (const [sourceTab, prospects] of Object.entries(grouped)) {
    const sheetName = TAB_NAMES[sourceTab] || sourceTab;
    const dataRows = prospects.map(toRow);
    const allRows = [headers, ...dataRows];
    const totalRows = allRows.length;

    const existingSheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);

    if (!existingSheet) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName, gridProperties: { rowCount: Math.max(totalRows + 100, 1000), columnCount: headers.length } } } }],
        },
      });
      console.log(`Created new tab: "${sheetName}" (${totalRows} rows)`);
    } else {
      const sheetIdNum = existingSheet.properties.sheetId;
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: [{
            updateSheetProperties: {
              properties: { sheetId: sheetIdNum, gridProperties: { rowCount: Math.max(totalRows + 100, 1000), columnCount: headers.length } },
              fields: "gridProperties.rowCount,gridProperties.columnCount",
            },
          }],
        },
      });
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SHEET_ID,
        range: `'${sheetName}'!A:ZZ`,
      });
      console.log(`Cleared and resized tab: "${sheetName}" (${totalRows} rows)`);
    }

    // Write in chunks
    const CHUNK_SIZE = 1000;
    for (let i = 0; i < allRows.length; i += CHUNK_SIZE) {
      const chunk = allRows.slice(i, i + CHUNK_SIZE);
      const startRow = i + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'${sheetName}'!A${startRow}`,
        valueInputOption: "RAW",
        requestBody: { values: chunk },
      });
      console.log(`  ${sheetName}: wrote rows ${startRow}-${startRow + chunk.length - 1}`);
    }

    console.log(`Exported ${prospects.length} prospects to "${sheetName}"`);
  }

  console.log(`\nDone! Sheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
