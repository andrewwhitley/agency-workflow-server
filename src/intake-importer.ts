/**
 * ═══════════════════════════════════════════════════════════════
 *  Intake Template Importer
 *  Parses the agency's "Company Info / Intake Template" Excel file
 *  and maps fields to the cm_* database tables.
 *
 *  Expected sheets: General Company Info, Content Guidelines,
 *  LoginsAccounts, Service Info, Ads Management, TestimonialsPersonas,
 *  AI Bot Training
 * ═══════════════════════════════════════════════════════════════
 */

import * as XLSX from "xlsx";
import { query } from "./database.js";

// ── Helpers ────────────────────────────────────

/**
 * Parses "Label: value | Label: value" format used in many cells.
 * Returns a map of label → value.
 */
function parseMultiField(text: string): Record<string, string> {
  if (!text || typeof text !== "string") return {};
  const result: Record<string, string> = {};
  // Split on " | " (the multi-field separator)
  const parts = text.split(/\s*\|\s*/);
  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim();
    const val = part.slice(colonIdx + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

/**
 * Walks rows in a sheet and returns a map of field label → value cell.
 * Skips section headers (rows where col B is empty or false).
 * Includes the multi-field cells too.
 */
function buildFieldMap(rows: unknown[][]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!row || row.length === 0) continue;
    const label = String(row[0] || "").trim();
    if (!label) continue;
    const value = row[1];
    if (value === null || value === undefined) continue;
    // Boolean false is meaningful (checkbox unchecked), keep it
    map.set(label, String(value));
  }
  return map;
}

function nz(s: unknown): string | null {
  if (s == null) return null;
  const str = String(s).trim();
  return str === "" || str === "false" || str === "FALSE" ? null : str;
}

/**
 * Detects if a cell value is just placeholder text from the blank template,
 * not actual filled-in client data. Placeholders end with ":" or contain only labels.
 * Example placeholder: "Email Granted Access:"
 * Example real value: "andrew@example.com" or "Yes - granted to ai@example.com"
 */
function isPlaceholder(s: unknown): boolean {
  if (s == null) return true;
  const str = String(s).trim();
  if (str === "") return true;
  // If every | -separated segment ends with ":" it's all placeholder labels
  const parts = str.split(/\s*\|\s*/);
  const allEndWithColon = parts.every((p) => p.trim().endsWith(":") || p.trim() === "");
  return allEndWithColon;
}

/**
 * Returns true only if the cell has REAL filled-in data (not blank, not just placeholder text).
 */
function hasRealValue(s: unknown): boolean {
  return !isPlaceholder(s);
}

function nzNum(s: unknown): number | null {
  if (s == null) return null;
  const str = String(s).replace(/[$,]/g, "").trim();
  if (str === "") return null;
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function nzBool(s: unknown): boolean | null {
  if (s == null) return null;
  if (s === true || s === "TRUE" || s === "true") return true;
  if (s === false || s === "FALSE" || s === "false") return false;
  return null;
}

// ── Main importer ────────────────────────────────

export interface ImportResult {
  clientId: number;
  clientSlug: string;
  sheetsProcessed: string[];
  fieldsImported: Record<string, number>;
  warnings: string[];
}

/**
 * Imports an intake template Excel file for a specific client.
 * The client must already exist (created via UI or onboarding form).
 */
export async function importIntakeTemplate(
  clientId: number,
  buffer: Buffer
): Promise<ImportResult> {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const result: ImportResult = {
    clientId,
    clientSlug: "",
    sheetsProcessed: [],
    fieldsImported: {},
    warnings: [],
  };

  // Verify client exists
  const { rows: clientRows } = await query("SELECT id, slug FROM cm_clients WHERE id = $1", [clientId]);
  if (clientRows.length === 0) {
    throw new Error(`Client with id ${clientId} not found`);
  }
  result.clientSlug = clientRows[0].slug;

  // ── Sheet 1: General Company Info ────────────────────
  if (wb.SheetNames.includes("General Company Info")) {
    const count = await importGeneralCompanyInfo(clientId, wb.Sheets["General Company Info"], result);
    result.fieldsImported["General Company Info"] = count;
    result.sheetsProcessed.push("General Company Info");
  }

  // ── Sheet 2: Content Guidelines ──────────────────────
  if (wb.SheetNames.includes("Content Guidelines")) {
    const count = await importContentGuidelines(clientId, wb.Sheets["Content Guidelines"], result);
    result.fieldsImported["Content Guidelines"] = count;
    result.sheetsProcessed.push("Content Guidelines");
  }

  // ── Sheet 3: LoginsAccounts (just store Drive link reference) ─
  if (wb.SheetNames.includes("LoginsAccounts")) {
    const count = await importLoginsSheet(clientId, wb.Sheets["LoginsAccounts"], result);
    result.fieldsImported["LoginsAccounts"] = count;
    result.sheetsProcessed.push("LoginsAccounts");
  }

  // ── Sheet 4: Service Info ────────────────────────────
  if (wb.SheetNames.includes("Service Info")) {
    const count = await importServiceInfo(clientId, wb.Sheets["Service Info"], result);
    result.fieldsImported["Service Info"] = count;
    result.sheetsProcessed.push("Service Info");
  }

  // ── Sheet 5: Ads Management ──────────────────────────
  if (wb.SheetNames.includes("Ads Management")) {
    const count = await importAdsManagement(clientId, wb.Sheets["Ads Management"], result);
    result.fieldsImported["Ads Management"] = count;
    result.sheetsProcessed.push("Ads Management");
  }

  // ── Sheet 6: Testimonials & Personas ─────────────────
  if (wb.SheetNames.includes("TestimonialsPersonas")) {
    const count = await importTestimonialsPersonas(clientId, wb.Sheets["TestimonialsPersonas"], result);
    result.fieldsImported["TestimonialsPersonas"] = count;
    result.sheetsProcessed.push("TestimonialsPersonas");
  }

  // ── Sheet 7: AI Bot Training ─────────────────────────
  if (wb.SheetNames.includes("AI Bot Training")) {
    const count = await importAIBotTraining(clientId, wb.Sheets["AI Bot Training"], result);
    result.fieldsImported["AI Bot Training"] = count;
    result.sheetsProcessed.push("AI Bot Training");
  }

  return result;
}

// ── Sheet importers ──────────────────────────────

async function importGeneralCompanyInfo(
  clientId: number,
  ws: XLSX.WorkSheet,
  _result: ImportResult
): Promise<number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const fields = buildFieldMap(rows);

  // Direct field mapping (label → cm_clients column)
  const directMap: Record<string, string> = {
    "Company Official (Legal) Name:": "legal_name",
    "DBA or Short Business Name:": "dba_name",
    "Email Address for Employment Inquiries:": "employment_email",
    "Company Website URL:": "company_website",
    "Date Founded (Mo/Yr):": "date_founded",
    "Company EIN:": "ein",
    "Type of Business (LLC, S-Corp, Sole P, etc):": "business_type",
    "Number of Clients (Current):": "number_of_customers",
    "Desired # of Clients to acquire the next 12 Months:": "desired_new_clients",
    "Average Client Lifetime Value ($):": "avg_client_lifetime_value",
    "Number of Employees:": "number_of_employees",
    "Estimated Current Annual Revenue:": "estimated_annual_revenue",
    "Target Annual Revenue 12 Months From Now:": "target_revenue",
    "Current (Before Hiring Us) Monthly Marketing Spend:": "current_marketing_spend",
    "Current (Before Hiring Us) Monthly Ads Budget:": "current_ads_spend",
    "CRM System(s) Used:": "crm_system",
    "Domain Registrar:": "domain_registrar",
    "Business Time Zone:": "time_zone",
    "Payment Types Accepted:": "payment_types_accepted",
    "Combined years of experience between your leadership team members:": "combined_years_experience",
    "Other Business Facts (Review/BBB Ratings, # of Specialists, # of clients/projects completed, etc):": "business_facts",
    "Notable Mentions:": "notable_mentions",
    // "Guarantees / Pledges:" lives in cm_content_guidelines, handled separately below
    "What Makes Your Company Unique From Your Competitors?:": "what_makes_us_unique",
    "Community Involvement:": "community_involvement",
    "Affiliations & Associations (Trade Associations, Chambers, Networking Organizations, Charities):": "affiliations_associations",
    "Quality Assurance Process / System:": "quality_assurance_process",
    "Trainings, Certifications:": "certifications_trainings",
    "Awards & Recognitions:": "awards_recognitions",
    "Company Background (How was the company started? What was the inspiration to open the business?:": "company_background",
    "Company Mission Statement:": "mission_statement",
    "Company Core Values:": "core_values",
    "Company Slogans or Mottos to include in marketing materials:": "slogans_mottos",
    "Gender Breakdown (Male%/Female%):": "demographics_gender",
    "Age Breakdown (What percent in each age group):": "demographics_age",
    "Location:": "demographics_location",
    "Income Range:": "demographics_income",
    "Main Pain Points:": "demographics_pain_points",
    "Education Level:": "demographics_education",
    "Languages Spoken:": "languages_spoken",
  };

  // Skip the "Notes:" suffix field rows that aren't real data
  const skipFields = new Set(["General Info", "Company Contacts / Leadership Team", "Unique Selling Propositions", "General Client Demographics", "Top Competitors", "Appointment Calendar Setup"]);

  const updates: Record<string, unknown> = {};
  let count = 0;
  for (const [label, value] of fields) {
    if (skipFields.has(label)) continue;
    const col = directMap[label];
    if (col && nz(value) !== null) {
      // Numeric fields
      if (["number_of_customers", "desired_new_clients", "avg_client_lifetime_value", "number_of_employees", "estimated_annual_revenue", "target_revenue", "current_marketing_spend", "current_ads_spend", "combined_years_experience"].includes(col)) {
        const n = nzNum(value);
        if (n !== null) { updates[col] = n; count++; }
      } else {
        updates[col] = nz(value);
        count++;
      }
    }

    // Special: handle multi-field rows
    // Note: labels are trimmed by buildFieldMap, so use trimmed forms here
    if (label === "Company Phone Numbers:") {
      const phones = parseMultiField(value);
      if (phones["Main Line"]) { updates.main_phone = phones["Main Line"]; updates.company_phone = phones["Main Line"]; count++; }
      if (phones["SMS Number"]) { updates.sms_phone = phones["SMS Number"]; count++; }
      if (phones["Toll Free"]) { updates.toll_free_phone = phones["Toll Free"]; count++; }
      if (phones["Fax"]) { updates.fax_phone = phones["Fax"]; count++; }
    }
    if (label === "Main Company Email Addresses:") {
      const emails = parseMultiField(value);
      const primary = emails["Primary Email to Diplay on Website (Usually info@ or admin@)"]
        || emails["Primary Email to Display on Website (Usually info@ or admin@)"];
      if (primary) { updates.primary_email = primary; updates.company_email = primary; count++; }
      const inquiry = emails["Emails where inquiries whould go (if different from above)"]
        || emails["Emails where inquiries should go (if different from above)"];
      if (inquiry) { updates.inquiry_emails = inquiry; count++; }
    }
    if (label === "Business Hours:") {
      const hours = parseMultiField(value);
      const cleaned: Record<string, string> = {};
      for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]) {
        if (hours[day]) cleaned[day.toLowerCase()] = hours[day];
      }
      if (Object.keys(cleaned).length > 0) {
        updates.business_hours_structured = JSON.stringify(cleaned);
        count++;
      }
    }
    if (label === "Locations (Should match GBP listing):") {
      const loc = parseMultiField(value);
      const parts = [loc["Office Name"], loc["Address"]].filter(Boolean);
      if (parts.length > 0) { updates.location = parts.join(" — "); count++; }
    }
    if (label === "Is This a Local Service Area Business or a Physical Location?:" && nz(value)) {
      updates.is_local_service_area = String(value).toLowerCase().includes("service");
      count++;
    }
    if (label === "Display Physical Address on Site / Marketing Material?") {
      const b = nzBool(value);
      if (b !== null) { updates.display_address = b; count++; }
    }
  }

  // Build dynamic UPDATE for cm_clients
  if (Object.keys(updates).length > 0) {
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
    const params = [clientId, ...Object.values(updates)];
    await query(`UPDATE cm_clients SET ${sets}, updated_at = NOW() WHERE id = $1`, params);
  }

  // Some intake fields actually map to cm_content_guidelines (USPs, guarantees)
  const guidelineUpdates: Record<string, unknown> = {};
  const usps = nz(fields.get("Unique Selling Propositions:"));
  if (usps) { guidelineUpdates.unique_selling_points = usps; count++; }
  const guarantees = nz(fields.get("Guarantees / Pledges:"));
  if (guarantees) { guidelineUpdates.guarantees = guarantees; count++; }

  if (Object.keys(guidelineUpdates).length > 0) {
    const { rows: existingGuide } = await query("SELECT id FROM cm_content_guidelines WHERE client_id = $1", [clientId]);
    if (existingGuide.length > 0) {
      const sets = Object.keys(guidelineUpdates).map((k, i) => `${k} = $${i + 2}`).join(", ");
      await query(`UPDATE cm_content_guidelines SET ${sets}, updated_at = NOW() WHERE client_id = $1`,
        [clientId, ...Object.values(guidelineUpdates)]);
    } else {
      const cols = ["client_id", ...Object.keys(guidelineUpdates)];
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      await query(`INSERT INTO cm_content_guidelines (${cols.join(", ")}) VALUES (${placeholders})`,
        [clientId, ...Object.values(guidelineUpdates)]);
    }
  }

  // Import contacts (Contact 1 - Contact 4)
  for (let i = 1; i <= 4; i++) {
    const label = `Contact ${i}:`;
    const value = fields.get(label);
    if (!value || isPlaceholder(value)) continue;
    const c = parseMultiField(value);
    const name = c["Name"];
    if (!name || name.trim() === "") continue;

    // Check if a contact with this name already exists
    const { rows: existing } = await query(
      "SELECT id FROM cm_contacts WHERE client_id = $1 AND name = $2 LIMIT 1",
      [clientId, name]
    );
    if (existing.length > 0) continue;

    await query(
      `INSERT INTO cm_contacts (client_id, name, role, phone, email, source)
       VALUES ($1, $2, $3, $4, $5, 'intake_import')`,
      [clientId, name, c["Position"] || null, c["Phone"] || null, c["Email"] || null]
    );
    count++;
  }

  // Import top competitors (Company 1 - Company 3)
  for (let i = 1; i <= 3; i++) {
    const label = `Company ${i}:`;
    const value = fields.get(label);
    if (!value || isPlaceholder(value)) continue;
    const c = parseMultiField(value);
    const name = c["Company Name"];
    if (!name || name.trim() === "") continue;

    const { rows: existing } = await query(
      "SELECT id FROM cm_competitors WHERE client_id = $1 AND company_name = $2 LIMIT 1",
      [clientId, name]
    );
    if (existing.length > 0) continue;

    await query(
      `INSERT INTO cm_competitors (client_id, rank, company_name, url, source)
       VALUES ($1, $2, $3, $4, 'intake_import')`,
      [clientId, i, name, c["URL"] || null]
    );
    count++;
  }

  // Import appointment types
  for (let i = 1; i <= 3; i++) {
    const label = `Appointment Type ${i}:`;
    const value = fields.get(label);
    if (!value || isPlaceholder(value)) continue;
    const a = parseMultiField(value);
    if (!a["Purpose of Calendar"] && !a["User"]) continue;

    await query(
      `INSERT INTO cm_appointment_types (client_id, name, purpose, assigned_user, hours_available, meeting_length, min_schedule_notice, date_range, buffer_time, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING`,
      [clientId, `Appointment Type ${i}`, a["Purpose of Calendar"] || null, a["User"] || null,
       a["Hours Available"] || null, a["Meeting Length"] || null, a["Minimum Schedule Notice"] || null,
       a["Date Range"] || null, a["Buffer Time"] || null, i]
    );
    count++;
  }

  return count;
}

async function importContentGuidelines(
  clientId: number,
  ws: XLSX.WorkSheet,
  _result: ImportResult
): Promise<number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const fields = buildFieldMap(rows);

  const directMap: Record<string, string> = {
    "What topics should we focus on when creating content for your services?:": "focus_topics",
    "Are there restrictions in your industry such as claims or guarantees that we're not allowed to write about? (such as superlatives ‘best,’ ‘leading,’ ‘top’ and so forth)": "restrictions",
    "What writing style does your audience resonate most with? (Casual, Technical, Sophisticated, etc.):": "writing_style",
    "Purpose of the content? (Informational, Commercial, Transactional) (KW Dependent):": "content_purpose",
    "How do we help convince your users to action? (Phone, Chat, Contact Form, Free Consultation, etc.):": "user_action_strategy",
    "Do you have any specials or promotions that we can use to reactivate your old clients or to use in digital marketing materials (website, ads, social media, etc.)?:": "promotions",
  };

  const updates: Record<string, unknown> = {};
  let count = 0;
  for (const [label, value] of fields) {
    const col = directMap[label];
    if (col && nz(value)) {
      updates[col] = nz(value);
      count++;
    }
    if (label === "Company Color Scheme (ideally a minimum of 2-3 complementary colors. This can be derived from a high quality logo):") {
      const colors = parseMultiField(value);
      const colorList = [colors["Color 1"], colors["Color 2"], colors["Color 3"]].filter(Boolean).join(", ");
      if (colorList) { updates.brand_colors = colorList; count++; }
    }
    if (label === "Fonts") {
      const fonts = parseMultiField(value);
      const fontList: string[] = [];
      if (fonts["Header Font"]) fontList.push(`Header: ${fonts["Header Font"]}`);
      if (fonts["Body Font"]) fontList.push(`Body: ${fonts["Body Font"]}`);
      if (fonts["Other Fonts"]) fontList.push(`Other: ${fonts["Other Fonts"]}`);
      if (fontList.length > 0) { updates.fonts = fontList.join("\n"); count++; }
    }
  }

  // Collect checked holidays into observed_holidays text
  const holidays: string[] = [];
  const holidayLabels = [
    "New Year's Day*", "MLK Jr. Day", "Valentine's Day*", "President's Day", "Memorial Day*",
    "Independence Day*", "Labor Day*", "Veteran's Day", "Halloween*", "Thanksgiving*",
    "Good Friday", "Ramadan", "Easter*", "Hanukkah", "Christmas*",
    "Lunar New Year", "Groundhog Day", "Women's Day*", "St. Patrick's Day*", "April Fool's Day",
    "Cinco de Mayo", "Mother's Day*", "Father's Day*", "Juneteenth", "Columbus Day",
  ];
  for (const h of holidayLabels) {
    const v = fields.get(h);
    if (nzBool(v) === true) holidays.push(h.replace(/\*$/, ""));
  }
  if (holidays.length > 0) {
    updates.observed_holidays = holidays.join(", ");
    count++;
  }

  // Upsert into cm_content_guidelines
  if (Object.keys(updates).length > 0) {
    const cols = ["client_id", ...Object.keys(updates)];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updateSets = Object.keys(updates).map((k) => `${k} = EXCLUDED.${k}`).join(", ");
    const params = [clientId, ...Object.values(updates)];
    // Need a unique constraint on client_id for ON CONFLICT — check if exists, fall back to manual upsert
    const { rows: existing } = await query("SELECT id FROM cm_content_guidelines WHERE client_id = $1", [clientId]);
    if (existing.length > 0) {
      const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
      await query(`UPDATE cm_content_guidelines SET ${sets}, updated_at = NOW() WHERE client_id = $1`, params);
    } else {
      await query(`INSERT INTO cm_content_guidelines (${cols.join(", ")}) VALUES (${placeholders})`, params);
    }
  }

  return count;
}

async function importLoginsSheet(
  _clientId: number,
  ws: XLSX.WorkSheet,
  result: ImportResult
): Promise<number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const fields = buildFieldMap(rows);

  // Map social URLs into JSONB
  const socialMap: Record<string, string> = {
    "Google Business Profile URL:": "gbp",
    "Facebook Page URL:": "facebook",
    "Instagram URL:": "instagram",
    "Company LinkedIn URL:": "linkedin",
    "X (Twitter) URL:": "twitter",
    "YouTube Channel URL: (Client to set up and assign us proper access.)": "youtube",
  };

  const socialLinks: Record<string, string> = {};
  let count = 0;
  for (const [label, value] of fields) {
    const key = socialMap[label];
    if (key && nz(value)) {
      socialLinks[key] = nz(value)!;
      count++;
    }
  }

  // Build access checklist (which platforms have we been granted access to?)
  // The intake template has rows like "Google Ads Access:" — we just check if there's a value
  const accessLabels: Record<string, string> = {
    "Domain Login Info, or Access:": "domain",
    "Website Backend Access:": "website_backend",
    "Google Business Profile Access:": "gbp",
    "Google Ads Access:": "google_ads",
    "Google LSA Access:": "google_lsa",
    "Google Analytics Access:": "google_analytics",
    "Google Search Console Access:": "google_search_console",
    "YouTube Channel Access:": "youtube",
    "Meta Account Access through Business Manager:": "meta_business",
    "Instagram Access:": "instagram",
    "X (Twitter) Login:": "twitter",
    "LinkedIn Company Profile Access:": "linkedin",
    "Cloudflare Access:": "cloudflare",
  };

  const accessChecklist: Record<string, boolean> = {};
  for (const [label, key] of Object.entries(accessLabels)) {
    const v = fields.get(label);
    // Only mark as granted if the value contains real data (not just placeholder labels)
    accessChecklist[key] = hasRealValue(v);
    if (hasRealValue(v)) count++;
  }

  // Get GBP-specific fields
  const gbpReviewLink = nz(fields.get("GBP Review Link:"));
  const gbpLocationId = nz(fields.get("GBP Location ID:"));
  const socialMediaGuidelines = nz(fields.get("Social Media Guidelines for our marketing team to follow:"));

  const updates: Record<string, unknown> = {
    social_links: JSON.stringify(socialLinks),
    access_checklist: JSON.stringify(accessChecklist),
  };
  if (gbpReviewLink) updates.gbp_review_link = gbpReviewLink;
  if (gbpLocationId) updates.gbp_location_id = gbpLocationId;
  if (socialLinks.gbp) updates.gbp_url = socialLinks.gbp;
  if (socialMediaGuidelines) updates.social_media_guidelines = socialMediaGuidelines;

  const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
  await query(`UPDATE cm_clients SET ${sets}, updated_at = NOW() WHERE id = $1`,
    [_clientId, ...Object.values(updates)]);

  result.warnings.push("Logins sheet: actual credentials NOT imported (per security policy). Use Google Drive logins file. Stored: social URLs, GBP info, access checklist.");

  return count;
}

async function importServiceInfo(
  clientId: number,
  ws: XLSX.WorkSheet,
  _result: ImportResult
): Promise<number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const fields = buildFieldMap(rows);

  let count = 0;

  // Main services 1-4
  for (let i = 1; i <= 4; i++) {
    const value = fields.get(`Main Service ${i}:`);
    if (!value || !nz(value)) continue;
    // Value format: "Service Name: Description"
    const colonIdx = String(value).indexOf(":");
    const name = colonIdx > -1 ? String(value).slice(0, colonIdx).trim() : String(value).trim();
    const desc = colonIdx > -1 ? String(value).slice(colonIdx + 1).trim() : null;

    const { rows: existing } = await query(
      "SELECT id FROM cm_services WHERE client_id = $1 AND service_name = $2 LIMIT 1",
      [clientId, name]
    );
    if (existing.length > 0) continue;

    await query(
      `INSERT INTO cm_services (client_id, category, service_name, description, tier, sort_order, source)
       VALUES ($1, 'Primary', $2, $3, 'primary', $4, 'intake_import')`,
      [clientId, name, desc, i]
    );
    count++;
  }

  // Secondary services 1-4
  for (let i = 1; i <= 4; i++) {
    const value = fields.get(`Secondary Service ${i}:`);
    if (!value || !nz(value)) continue;
    const colonIdx = String(value).indexOf(":");
    const name = colonIdx > -1 ? String(value).slice(0, colonIdx).trim() : String(value).trim();
    const desc = colonIdx > -1 ? String(value).slice(colonIdx + 1).trim() : null;

    const { rows: existing } = await query(
      "SELECT id FROM cm_services WHERE client_id = $1 AND service_name = $2 LIMIT 1",
      [clientId, name]
    );
    if (existing.length > 0) continue;

    await query(
      `INSERT INTO cm_services (client_id, category, service_name, description, tier, sort_order, source)
       VALUES ($1, 'Secondary', $2, $3, 'secondary', $4, 'intake_import')`,
      [clientId, name, desc, i + 4]
    );
    count++;
  }

  // Service areas
  const primaryAreas = nz(fields.get("Primary Service Areas / Target Towns:"));
  const secondaryAreas = nz(fields.get("Secondary Service Areas / Target Towns:"));
  if (primaryAreas || secondaryAreas) {
    const { rows: existing } = await query("SELECT id FROM cm_service_areas WHERE client_id = $1 LIMIT 1", [clientId]);
    if (existing.length === 0) {
      await query(
        "INSERT INTO cm_service_areas (client_id, target_cities, notes) VALUES ($1, $2, $3)",
        [clientId, [primaryAreas, secondaryAreas].filter(Boolean).join("\n"), null]
      );
    } else {
      await query(
        "UPDATE cm_service_areas SET target_cities = $2, updated_at = NOW() WHERE client_id = $1",
        [clientId, [primaryAreas, secondaryAreas].filter(Boolean).join("\n")]
      );
    }
    count++;
  }

  // Service seasonality
  const seasonality = nz(fields.get("Any Service Seasonality?:"));
  if (seasonality) {
    await query("UPDATE cm_clients SET service_seasonality = $1 WHERE id = $2", [seasonality, clientId]);
    count++;
  }

  return count;
}

async function importAdsManagement(
  clientId: number,
  ws: XLSX.WorkSheet,
  _result: ImportResult
): Promise<number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  const fields = buildFieldMap(rows);

  const platforms = nz(fields.get("Which Ad platform(s) will we be utilizing?:"));
  const servicesFocus = nz(fields.get("What Service(s) will be focus on?:"));
  const uniqueCapabilities = nz(fields.get("What is unique about your ability to provide these services?"));
  const monthlyBudget = nz(fields.get("What is your monthly Ads Budget (per network)"));
  const optimizationGoal = nz(fields.get("What outcome are we optimizing for? (Calls, Appointments, Sales, Traffic, Form Fills, Offers Claimed):"));
  const closeRate = nzNum(fields.get("What percentage of qualified leads do you believe you will close?:"));
  const appointmentHandler = nz(fields.get("Who gets these appointments?"));
  const valuePerClient = nzNum(fields.get("approximate value per client ?"));

  let count = 0;
  if (platforms || servicesFocus || optimizationGoal) {
    const platformsArr = platforms ? platforms.split(/[,/]/).map(s => s.trim()).filter(Boolean) : [];

    const { rows: existing } = await query("SELECT id FROM cm_ads_config WHERE client_id = $1", [clientId]);
    if (existing.length === 0) {
      await query(
        `INSERT INTO cm_ads_config (client_id, platforms, services_focus, unique_capabilities, budget_per_network, optimization_goal, expected_close_rate, appointment_handler, value_per_client)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [clientId, JSON.stringify(platformsArr), servicesFocus, uniqueCapabilities,
         JSON.stringify({ total: monthlyBudget }), optimizationGoal, closeRate, appointmentHandler, valuePerClient]
      );
    } else {
      await query(
        `UPDATE cm_ads_config SET platforms = $2, services_focus = $3, unique_capabilities = $4,
          budget_per_network = $5, optimization_goal = $6, expected_close_rate = $7,
          appointment_handler = $8, value_per_client = $9, updated_at = NOW()
         WHERE client_id = $1`,
        [clientId, JSON.stringify(platformsArr), servicesFocus, uniqueCapabilities,
         JSON.stringify({ total: monthlyBudget }), optimizationGoal, closeRate, appointmentHandler, valuePerClient]
      );
    }
    count++;
  }

  // Database reactivation offers
  for (let i = 1; i <= 5; i++) {
    const value = fields.get(`Offer ${i}:`);
    if (!value || isPlaceholder(value)) continue;
    const o = parseMultiField(value);
    const offerName = o["What is the offer?"];
    if (!offerName || offerName.trim() === "") continue;

    await query(
      `INSERT INTO cm_reactivation_offers (client_id, offer_name, offer_description, dates_active, target_segment, delivery_method, message_copy, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [clientId, offerName.slice(0, 250), offerName,
       o["What dates/circumstances is this offered?"] || null,
       o["What contact list/segment is this offered to?"] || null,
       o["Delivered via SMS/Email?"] || null,
       o["What message copy should we use to invite them to the offer?"] || null,
       i]
    );
    count++;
  }

  return count;
}

async function importTestimonialsPersonas(
  clientId: number,
  ws: XLSX.WorkSheet,
  _result: ImportResult
): Promise<number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  // For this sheet, we need to read columns B and C separately because the format is different
  // Row format: ["Client Avatar 1:", "Demographic info text", "Buyer needs text"]

  let count = 0;

  // Buyer personas (Client Avatar 1-4)
  for (let i = 1; i <= 4; i++) {
    let row: unknown[] | undefined;
    for (const r of rows) {
      if (r && String(r[0] || "").trim() === `Client Avatar ${i}:`) { row = r; break; }
    }
    if (!row) continue;

    const demoText = String(row[1] || "");
    const needsText = String(row[2] || "");
    if (isPlaceholder(demoText) && isPlaceholder(needsText)) continue;

    const demo = parseMultiField(demoText);
    const needs = parseMultiField(needsText);

    const personaName = demo["Name"];
    // Skip if no real name was provided
    if (!personaName || personaName.trim() === "") continue;

    // Check existing
    const { rows: existing } = await query(
      "SELECT id FROM cm_buyer_personas WHERE client_id = $1 AND persona_name = $2 LIMIT 1",
      [clientId, personaName]
    );
    if (existing.length > 0) continue;

    await query(
      `INSERT INTO cm_buyer_personas (client_id, persona_name, age, gender, location, family_status, education_level, occupation, income_level, communication_channels, needs_description, pain_points, gains, buying_factors, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'intake_import')`,
      [clientId, personaName,
       demo["Age"] || null, demo["Gender"] || null, demo["Location"] || null,
       demo["Family Status"] || null, demo["Education Level"] || null, demo["Job"] || null,
       demo["Income Level"] || null, demo["Communication Channels Used"] || null,
       needs["Bio"] || null, needs["Pain Points"] || null,
       needs["Gains/Expectations from my services"] || needs["Gains"] || null,
       needs["Factors Influencing buying decision"] || needs["Factors Influencing"] || null]
    );
    count++;
  }

  // Testimonials 1-6
  for (let i = 1; i <= 6; i++) {
    let row: unknown[] | undefined;
    for (const r of rows) {
      if (r && String(r[0] || "").trim() === `Testimonial ${i}:`) { row = r; break; }
    }
    if (!row) continue;

    const testText = String(row[1] || "");
    const linkText = String(row[2] || "");
    if (isPlaceholder(testText)) continue;

    const t = parseMultiField(testText);
    const author = t["Author"] || null;
    const testimonial = t["Testimonial"];
    if (!testimonial || testimonial.trim() === "") continue;
    const link = nz(linkText) || null;

    const { rows: existing } = await query(
      "SELECT id FROM cm_testimonials WHERE client_id = $1 AND testimonial_text = $2 LIMIT 1",
      [clientId, testimonial]
    );
    if (existing.length > 0) continue;

    await query(
      `INSERT INTO cm_testimonials (client_id, author, testimonial_text, link, sort_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [clientId, author, testimonial, link, i]
    );
    count++;
  }

  return count;
}

async function importAIBotTraining(
  clientId: number,
  ws: XLSX.WorkSheet,
  _result: ImportResult
): Promise<number> {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  // The AI Bot Training sheet has format: [Guide/Description, Question, Example/Answer]
  // We want column C (the "answer" column) for each labeled row
  const labelToCol: Record<string, string> = {
    "What do you want the chatbot to do?:": "purpose",
    "What should the bot call itself?:": "bot_name",
    "What do you want the chatbot to achieve?:": "purpose",
    "What specific tasks should the chatbot help with?:": "primary_tasks",
    "How should the chatbot handle difficult questions or sensitive topics?:": "difficult_topics_handling",
    "What should the bot reply when asked about pricing?:": "pricing_response",
    "Can you describe the steps in a typical conversation?": "conversation_flow",
    "How should the chatbot move from one part of the conversation to the next?\"": "conversation_flow",
    "What info does the chatbot need to collect from the client before booking an appointment? (Name, Phone, Email, Issues, etc.)": "appointment_info_needed",
    "Can you describe the environment in which the chatbot will function?": "common_problems",
    "What common problems might customers ask about?": "common_problems",
    "What kind of users will the chatbot be interacting with?": "user_demographics",
    "What languages should the chatbot use?": "languages",
    "What should the bot reply when someone is inquiring about employment?:": "employment_inquiries",
    "How should the chatbot handle questions from salespeople or solicitors?": "solicitor_handling",
  };

  const updates: Record<string, string> = {};
  let count = 0;
  for (const row of rows) {
    if (!row) continue;
    // Try column B (question) first
    const labelB = String(row[1] || "").trim();
    const labelA = String(row[0] || "").trim();
    const valueC = String(row[2] || "").trim();
    if (!valueC) continue;
    // Skip the template's example answers (they all start with "Example:")
    if (valueC.startsWith("Example:") || valueC.startsWith('"Example:')) continue;

    const col = labelToCol[labelB] || labelToCol[labelA];
    if (col && !updates[col]) {
      updates[col] = valueC;
      count++;
    }
  }

  // Meta AI toggle
  for (const row of rows) {
    if (!row) continue;
    if (String(row[0] || "").includes("Turn of Meta AI")) {
      const v = nzBool(row[1]);
      if (v !== null) {
        // We're storing whether it's DISABLED, so flip
        // intake says "Turn off" so true = disabled
        // Actually let's just store the value as-is
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    const { rows: existing } = await query("SELECT id FROM cm_ai_bot_config WHERE client_id = $1", [clientId]);
    const cols = ["client_id", ...Object.keys(updates)];
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const params = [clientId, ...Object.values(updates)];

    if (existing.length === 0) {
      await query(`INSERT INTO cm_ai_bot_config (${cols.join(", ")}) VALUES (${placeholders})`, params);
    } else {
      const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(", ");
      await query(`UPDATE cm_ai_bot_config SET ${sets}, updated_at = NOW() WHERE client_id = $1`, params);
    }
  }

  return count;
}
