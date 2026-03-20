#!/usr/bin/env node
/**
 * Export enriched prospects to Google Sheets Dream List.
 *
 * Usage: node scripts/export-dream-list.mjs [--tier dream] [--min-score 50] [--all]
 *
 * Default: exports all completed prospects ordered by score.
 */

import "dotenv/config";
import pg from "pg";
import { google } from "googleapis";
import fs from "fs";

const SHEET_ID = "1iiaciX2d5lQKKOi3sqz-LZcHfKSjBNiYNDpzybsEvec";
const SERVICE_ACCOUNT_PATH = "data/service-account.json";

const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const TIER = getArg("--tier");
const MIN_SCORE = parseInt(getArg("--min-score") || "0");
const ALL = args.includes("--all");

async function main() {
  // Connect to DB
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  // Build query
  let where = "enrichment_status = 'completed'";
  const params = [];
  if (TIER) { params.push(TIER); where += ` AND qualification_tier = $${params.length}`; }
  if (MIN_SCORE > 0) { params.push(MIN_SCORE); where += ` AND total_score >= $${params.length}`; }

  const { rows } = await pool.query(
    `SELECT * FROM enrichment_prospects WHERE ${where} ORDER BY total_score DESC`,
    params
  );
  console.log(`Found ${rows.length} prospects to export${TIER ? ` (tier: ${TIER})` : ""}${MIN_SCORE ? ` (min score: ${MIN_SCORE})` : ""}`);

  if (rows.length === 0) { await pool.end(); return; }

  // Auth with service account
  const creds = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  // Build header + data rows
  const headers = [
    "Score", "Tier", "Company", "Contact Name", "Contact Email", "Contact Title",
    "Contact Phone", "Contact LinkedIn", "Website", "City", "State",
    "Revenue", "Employee Count", "Provider Count", "Total Staff",
    "Top Services", "Provider Details",
    "Website Platform", "Organic Traffic", "Organic Keywords", "Domain Rank",
    "FB Pixel", "Google Pixel", "Chatbot", "Chatbot Provider",
    "CRM", "Booking Widget", "Booking Provider", "Lead Capture",
    "GBP Rating", "GBP Reviews",
    "Sales Angles", "GMB Link", "Facebook URL", "Specialty",
  ];

  const dataRows = rows.map((r) => {
    const pillarScores = typeof r.pillar_scores === "string" ? JSON.parse(r.pillar_scores) : (r.pillar_scores || {});
    const salesAngles = typeof r.sales_angles === "string" ? JSON.parse(r.sales_angles) : (r.sales_angles || []);
    const topServices = typeof r.top_services === "string" ? JSON.parse(r.top_services) : (r.top_services || []);
    const providerDetails = typeof r.provider_details === "string" ? JSON.parse(r.provider_details) : (r.provider_details || []);

    return [
      r.total_score || 0,
      r.qualification_tier || "",
      r.company_name || "",
      r.contact_name || "",
      r.contact_email || "",
      r.contact_title || "",
      r.contact_phone || "",
      r.contact_linkedin || "",
      r.website || "",
      r.city || "",
      r.state || "",
      r.revenue_range || "",
      r.employee_count || "",
      r.provider_count ?? "",
      r.total_staff ?? "",
      Array.isArray(topServices) ? topServices.join(", ") : String(topServices || ""),
      Array.isArray(providerDetails) ? providerDetails.join(", ") : String(providerDetails || ""),
      r.website_platform || "",
      r.organic_traffic || "",
      r.organic_keywords || "",
      r.domain_rank || "",
      r.has_fb_pixel ? "Yes" : "No",
      r.has_google_pixel ? "Yes" : "No",
      r.has_chatbot ? "Yes" : "No",
      r.chatbot_provider || "",
      r.crm_platform || "",
      r.has_booking_widget ? "Yes" : "No",
      r.booking_provider || "",
      r.has_lead_capture ? "Yes" : "No",
      r.gbp_rating || "",
      r.gbp_review_count || "",
      salesAngles.join("; "),
      r.gmb_link || "",
      r.facebook_url || "",
      r.specialty || "",
    ];
  });

  const sheetName = TIER ? `${TIER.charAt(0).toUpperCase() + TIER.slice(1)} Prospects` : "All Enriched";

  // Check if sheet/tab exists, create if not
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingSheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);

  const totalRows = dataRows.length + 1; // +1 for header

  if (!existingSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName, gridProperties: { rowCount: Math.max(totalRows + 100, 1000), columnCount: headers.length } } } }],
      },
    });
    console.log(`Created new tab: "${sheetName}" (${totalRows} rows)`);
  } else {
    // Resize + clear existing data
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

  // Write data in chunks (Sheets API has limits)
  const allRows = [headers, ...dataRows];
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
    console.log(`  Wrote rows ${startRow}-${startRow + chunk.length - 1}`);
  }

  console.log(`\nExported ${rows.length} prospects to "${sheetName}" tab`);
  console.log(`Sheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
