/**
 * ═══════════════════════════════════════════════════════════════
 *  AI Folder Importer
 *  Reads all .docx and .xlsx files from a folder, sends the combined
 *  text to Claude for structured extraction, and writes the result
 *  to all dashboard tables for a client.
 * ═══════════════════════════════════════════════════════════════
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";
import { query } from "./database.js";

const anthropic = new Anthropic();

// ── Types ──────────────────────────────────────

export interface FolderImportResult {
  clientId: number;
  filesProcessed: string[];
  totalTextLength: number;
  extracted: ExtractedClientData;
  tablesUpdated: string[];
  warnings: string[];
}

interface ExtractedClientData {
  company: {
    legalName?: string;
    dbaName?: string;
    companyName?: string;
    industry?: string;
    location?: string;
    address?: string;
    phone?: string;
    fax?: string;
    email?: string;
    website?: string;
    dateFounded?: string;
    ein?: string;
    businessType?: string;
    numberOfEmployees?: string;
    numberOfCustomers?: string;
    desiredNewClients?: string;
    avgClientLifetimeValue?: string;
    estimatedAnnualRevenue?: string;
    targetRevenue?: string;
    currentMarketingSpend?: string;
    currentAdsSpend?: string;
    crmSystem?: string;
    domainRegistrar?: string;
    businessHours?: string;
    timeZone?: string;
    paymentTypes?: string;
    combinedYearsExperience?: string;
    missionStatement?: string;
    coreValues?: string;
    companyBackground?: string;
    whatMakesUsUnique?: string;
    slogansMottos?: string;
    notableMentions?: string;
    awardsRecognitions?: string;
    certificationsTrainings?: string;
    communityInvolvement?: string;
    affiliationsAssociations?: string;
    qualityAssuranceProcess?: string;
    isLocalServiceArea?: boolean;
    latitude?: number;
    longitude?: number;
  };
  contacts: Array<{
    name: string;
    role?: string;
    phone?: string;
    email?: string;
    bio?: string;
    credentials?: string;
    specialties?: string;
  }>;
  services: Array<{
    name: string;
    category?: string;
    tier?: string;
    description?: string;
  }>;
  serviceAreas: string[];
  competitors: Array<{
    name: string;
    url?: string;
    strengths?: string;
  }>;
  buyerPersonas: Array<{
    name: string;
    gender?: string;
    ageRange?: string;
    location?: string;
    incomeLevel?: string;
    painPoints?: string;
    desires?: string;
    description?: string;
  }>;
  contentGuidelines: {
    brandVoice?: string;
    tone?: string;
    writingStyle?: string;
    dosAndDonts?: string;
    restrictions?: string;
    brandColors?: string;
    fonts?: string;
    focusTopics?: string;
    uniqueSellingPoints?: string;
    guarantees?: string;
    contentPurpose?: string;
  };
  testimonials: Array<{
    text: string;
    author?: string;
  }>;
  socialLinks: Record<string, string>;
  gbp: {
    url?: string;
    reviewLink?: string;
    locationId?: string;
  };
  campaigns: Array<{
    name: string;
    type?: string;
    platform?: string;
    adCopy?: string;
    landingPageCopy?: string;
    nurtureSequence?: string;
    qualifyingQuestions?: string;
  }>;
}

// ── File Reading ──────────────────────────────────

async function readDocx(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (err) {
    console.error(`Failed to read docx ${filePath}:`, err);
    return "";
  }
}

function readXlsx(filePath: string): string {
  try {
    const buf = fs.readFileSync(filePath);
    const wb = XLSX.read(buf, { type: "buffer" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      parts.push(`\n=== Sheet: ${sheetName} ===`);
      for (const row of rows) {
        const cells = (row as string[]).filter((c) => c !== "" && c !== null && c !== undefined);
        if (cells.length > 0) parts.push(cells.join(" | "));
      }
    }
    return parts.join("\n");
  } catch (err) {
    console.error(`Failed to read xlsx ${filePath}:`, err);
    return "";
  }
}

async function readAllFiles(folderPath: string): Promise<{ files: string[]; texts: string[] }> {
  const files: string[] = [];
  const texts: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        // Skip non-document files and Zone.Identifier files
        if (entry.name.endsWith(".Zone.Identifier")) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".docx" || ext === ".xlsx" || ext === ".xls") {
          files.push(path.relative(folderPath, fullPath));
        }
      }
    }
  }

  walk(folderPath);

  for (const file of files) {
    const fullPath = path.join(folderPath, file);
    const ext = path.extname(file).toLowerCase();
    let text = "";
    if (ext === ".docx") {
      text = await readDocx(fullPath);
    } else if (ext === ".xlsx" || ext === ".xls") {
      text = readXlsx(fullPath);
    }
    if (text.trim()) {
      texts.push(`\n\n========== FILE: ${file} ==========\n${text}`);
    }
  }

  return { files, texts };
}

// ── AI Extraction ──────────────────────────────────

const EXTRACTION_PROMPT = `You are an expert at extracting structured business data from marketing documents. You will receive the combined text content of all documents from a client's folder. Extract as much structured data as possible.

Return a JSON object with this EXACT structure (omit fields where data is not available):

{
  "company": {
    "legalName": "...",
    "dbaName": "...",
    "companyName": "The name they go by publicly",
    "industry": "...",
    "location": "City, State",
    "address": "Full street address",
    "phone": "Main phone",
    "fax": "Fax number",
    "email": "Main email",
    "website": "URL",
    "dateFounded": "Month/Year or Year",
    "ein": "...",
    "businessType": "LLC, S-Corp, etc",
    "numberOfEmployees": "...",
    "numberOfCustomers": "...",
    "desiredNewClients": "...",
    "avgClientLifetimeValue": "...",
    "estimatedAnnualRevenue": "...",
    "targetRevenue": "...",
    "currentMarketingSpend": "...",
    "currentAdsSpend": "...",
    "crmSystem": "...",
    "domainRegistrar": "...",
    "businessHours": "Formatted hours string",
    "timeZone": "...",
    "paymentTypes": "...",
    "combinedYearsExperience": "...",
    "missionStatement": "Their mission/purpose",
    "coreValues": "...",
    "companyBackground": "Founding story — how and why was the company started",
    "whatMakesUsUnique": "Key differentiators",
    "slogansMottos": "...",
    "notableMentions": "Press, awards, recognitions",
    "certificationsTrainings": "...",
    "communityInvolvement": "...",
    "affiliationsAssociations": "...",
    "isLocalServiceArea": true
  },
  "contacts": [
    { "name": "Full Name", "role": "Title", "phone": "...", "email": "...", "bio": "Short bio", "credentials": "Degrees, certifications", "specialties": "Areas of expertise" }
  ],
  "services": [
    { "name": "Service Name", "category": "Service Category", "tier": "primary|secondary|complementary", "description": "What the service includes" }
  ],
  "serviceAreas": ["City 1", "City 2"],
  "competitors": [
    { "name": "Competitor Name", "url": "website", "strengths": "What they're known for / competitive notes" }
  ],
  "buyerPersonas": [
    { "name": "Persona Name or Description", "gender": "...", "ageRange": "e.g. 30-65", "location": "...", "incomeLevel": "...", "painPoints": "What frustrates them", "desires": "What they want", "description": "Overall profile" }
  ],
  "contentGuidelines": {
    "brandVoice": "How the brand sounds",
    "tone": "Emotional register",
    "writingStyle": "Casual, technical, etc",
    "dosAndDonts": "Content rules",
    "restrictions": "Claims they can't make",
    "brandColors": "Hex codes or color names",
    "fonts": "Header and body fonts",
    "focusTopics": "Content topics to prioritize",
    "uniqueSellingPoints": "Core USPs",
    "guarantees": "Promises or pledges"
  },
  "testimonials": [
    { "text": "Testimonial quote", "author": "Name" }
  ],
  "socialLinks": {
    "facebook": "URL", "instagram": "URL", "linkedin": "URL", "pinterest": "URL", "gbp": "URL"
  },
  "gbp": {
    "url": "GBP profile URL",
    "reviewLink": "Direct review link",
    "locationId": "GBP location ID number"
  },
  "campaigns": [
    { "name": "Campaign Name", "type": "Meta Ads|Google Ads|Email|Landing Page", "platform": "Meta|Google|Email", "adCopy": "The ad copy text", "landingPageCopy": "Landing page content summary", "nurtureSequence": "Email/SMS sequence summary", "qualifyingQuestions": "Intake/qualifying questions" }
  ]
}

IMPORTANT RULES:
- Extract REAL data only. Do not fabricate or infer data that isn't in the documents.
- For services, be thorough — extract every service mentioned, with categories and descriptions.
- For campaigns, extract the campaign name, platform, and summarize the ad copy, landing page, and nurture sequence.
- For the company background/founding story, use the actual narrative from the documents.
- Return ONLY the JSON object, no markdown formatting or explanation.`;

async function extractWithClaude(combinedText: string): Promise<ExtractedClientData> {
  // Truncate to fit context (leave room for system prompt + response)
  const maxChars = 180000;
  const truncated = combinedText.length > maxChars
    ? combinedText.substring(0, maxChars) + "\n\n[... truncated for length]"
    : combinedText;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: EXTRACTION_PROMPT,
    messages: [{ role: "user", content: `Here are all the documents from this client's folder:\n\n${truncated}` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");

  return JSON.parse(jsonMatch[0]) as ExtractedClientData;
}

// ── Database Writing ──────────────────────────────

function nz(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

async function writeToDatabase(
  clientId: number,
  data: ExtractedClientData,
  result: FolderImportResult
): Promise<void> {
  const c = data.company;

  // ── 1. cm_clients ──
  const clientFields: Record<string, unknown> = {};
  if (nz(c.legalName)) clientFields.legal_name = c.legalName;
  if (nz(c.dbaName)) clientFields.dba_name = c.dbaName;
  if (nz(c.companyName)) clientFields.company_name = c.companyName;
  if (nz(c.industry)) clientFields.industry = c.industry;
  if (nz(c.location)) clientFields.location = c.location;
  if (nz(c.phone)) clientFields.company_phone = c.phone;
  if (nz(c.fax)) clientFields.fax_phone = c.fax;
  if (nz(c.email)) clientFields.company_email = c.email;
  if (nz(c.website)) {
    clientFields.company_website = c.website;
    clientFields.domain = String(c.website).replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  }
  if (nz(c.dateFounded)) clientFields.date_founded = c.dateFounded;
  if (nz(c.ein)) clientFields.ein = c.ein;
  if (nz(c.businessType)) clientFields.business_type = c.businessType;
  if (nz(c.numberOfEmployees)) clientFields.number_of_employees = c.numberOfEmployees;
  if (nz(c.numberOfCustomers)) clientFields.number_of_customers = c.numberOfCustomers;
  if (nz(c.desiredNewClients)) clientFields.desired_new_clients = c.desiredNewClients;
  if (nz(c.avgClientLifetimeValue)) clientFields.avg_client_lifetime_value = parseFloat(String(c.avgClientLifetimeValue).replace(/[^0-9.]/g, "")) || null;
  if (nz(c.estimatedAnnualRevenue)) clientFields.estimated_annual_revenue = parseFloat(String(c.estimatedAnnualRevenue).replace(/[^0-9.]/g, "")) || null;
  if (nz(c.targetRevenue)) clientFields.target_revenue = parseFloat(String(c.targetRevenue).replace(/[^0-9.]/g, "")) || null;
  if (nz(c.currentMarketingSpend)) clientFields.current_marketing_spend = parseFloat(String(c.currentMarketingSpend).replace(/[^0-9.]/g, "")) || null;
  if (nz(c.crmSystem)) clientFields.crm_system = c.crmSystem;
  if (nz(c.domainRegistrar)) clientFields.domain_registrar = c.domainRegistrar;
  if (nz(c.businessHours)) clientFields.business_hours = c.businessHours;
  if (nz(c.timeZone)) clientFields.time_zone = c.timeZone;
  if (nz(c.paymentTypes)) clientFields.payment_types_accepted = c.paymentTypes;
  if (nz(c.combinedYearsExperience)) clientFields.combined_years_experience = c.combinedYearsExperience;
  if (nz(c.missionStatement)) clientFields.mission_statement = c.missionStatement;
  if (nz(c.coreValues)) clientFields.core_values = c.coreValues;
  if (nz(c.companyBackground)) clientFields.company_background = c.companyBackground;
  if (nz(c.whatMakesUsUnique)) clientFields.what_makes_us_unique = c.whatMakesUsUnique;
  if (nz(c.slogansMottos)) clientFields.slogans_mottos = c.slogansMottos;
  if (nz(c.notableMentions)) clientFields.notable_mentions = c.notableMentions;
  if (nz(c.certificationsTrainings)) clientFields.certifications_trainings = c.certificationsTrainings;
  if (nz(c.communityInvolvement)) clientFields.community_involvement = c.communityInvolvement;
  if (nz(c.affiliationsAssociations)) clientFields.affiliations_associations = c.affiliationsAssociations;
  if (nz(c.qualityAssuranceProcess)) clientFields.quality_assurance_process = c.qualityAssuranceProcess;
  if (c.isLocalServiceArea != null) clientFields.is_local_service_area = c.isLocalServiceArea;
  if (c.latitude) clientFields.latitude = c.latitude;
  if (c.longitude) clientFields.longitude = c.longitude;

  // Social links
  if (data.socialLinks && Object.keys(data.socialLinks).length > 0) {
    clientFields.social_links = JSON.stringify(data.socialLinks);
  }
  // GBP
  if (data.gbp?.url) clientFields.gbp_url = data.gbp.url;
  if (data.gbp?.reviewLink) clientFields.gbp_review_link = data.gbp.reviewLink;
  if (data.gbp?.locationId) clientFields.gbp_location_id = data.gbp.locationId;

  if (Object.keys(clientFields).length > 0) {
    const sets = Object.keys(clientFields).map((k, i) => `${k} = $${i + 2}`).join(", ");
    await query(`UPDATE cm_clients SET ${sets}, updated_at = NOW() WHERE id = $1`,
      [clientId, ...Object.values(clientFields)]);
    result.tablesUpdated.push(`cm_clients (${Object.keys(clientFields).length} fields)`);
  }

  // ── 2. cm_contacts ──
  if (data.contacts?.length > 0) {
    let added = 0;
    for (const contact of data.contacts) {
      if (!nz(contact.name)) continue;
      const { rows: ex } = await query("SELECT 1 FROM cm_contacts WHERE client_id = $1 AND name = $2 LIMIT 1", [clientId, contact.name]);
      if (ex.length > 0) continue;
      await query(
        "INSERT INTO cm_contacts (client_id, name, role, phone, email, source) VALUES ($1, $2, $3, $4, $5, 'folder_import')",
        [clientId, contact.name, nz(contact.role), nz(contact.phone), nz(contact.email)]
      );
      added++;
    }
    // Also add as team members with full details
    for (const contact of data.contacts) {
      if (!nz(contact.name)) continue;
      const { rows: ex } = await query("SELECT 1 FROM cm_team_members WHERE client_id = $1 AND full_name = $2 LIMIT 1", [clientId, contact.name]);
      if (ex.length > 0) continue;
      await query(
        "INSERT INTO cm_team_members (client_id, full_name, role, email, phone, bio, credentials, specialties, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'folder_import')",
        [clientId, contact.name, nz(contact.role), nz(contact.email), nz(contact.phone), nz(contact.bio), nz(contact.credentials), nz(contact.specialties)]
      );
    }
    if (added > 0) result.tablesUpdated.push(`cm_contacts (${added} added)`);
  }

  // ── 3. cm_services ──
  if (data.services?.length > 0) {
    let added = 0;
    for (let i = 0; i < data.services.length; i++) {
      const svc = data.services[i];
      if (!nz(svc.name)) continue;
      const { rows: ex } = await query("SELECT 1 FROM cm_services WHERE client_id = $1 AND service_name = $2 LIMIT 1", [clientId, svc.name]);
      if (ex.length > 0) continue;
      await query(
        "INSERT INTO cm_services (client_id, service_name, category, tier, description, sort_order, source) VALUES ($1, $2, $3, $4, $5, $6, 'folder_import')",
        [clientId, svc.name, nz(svc.category) || "Primary", nz(svc.tier) || "primary", nz(svc.description), i + 1]
      );
      added++;
    }
    if (added > 0) result.tablesUpdated.push(`cm_services (${added} added)`);
  }

  // ── 4. cm_service_areas ──
  if (data.serviceAreas?.length > 0) {
    const cities = data.serviceAreas.join(", ");
    const { rows: ex } = await query("SELECT id FROM cm_service_areas WHERE client_id = $1 LIMIT 1", [clientId]);
    if (ex.length === 0) {
      await query("INSERT INTO cm_service_areas (client_id, target_cities) VALUES ($1, $2)", [clientId, cities]);
    } else {
      await query("UPDATE cm_service_areas SET target_cities = $1 WHERE client_id = $2", [cities, clientId]);
    }
    result.tablesUpdated.push("cm_service_areas");
  }

  // ── 5. cm_competitors ──
  if (data.competitors?.length > 0) {
    let added = 0;
    for (let i = 0; i < data.competitors.length; i++) {
      const comp = data.competitors[i];
      if (!nz(comp.name)) continue;
      const { rows: ex } = await query("SELECT 1 FROM cm_competitors WHERE client_id = $1 AND company_name = $2 LIMIT 1", [clientId, comp.name]);
      if (ex.length > 0) continue;
      await query(
        "INSERT INTO cm_competitors (client_id, rank, company_name, url, usps, source) VALUES ($1, $2, $3, $4, $5, 'folder_import')",
        [clientId, i + 1, comp.name, nz(comp.url), nz(comp.strengths)]
      );
      added++;
    }
    if (added > 0) result.tablesUpdated.push(`cm_competitors (${added} added)`);
  }

  // ── 6. cm_buyer_personas ──
  if (data.buyerPersonas?.length > 0) {
    let added = 0;
    for (const persona of data.buyerPersonas) {
      if (!nz(persona.name)) continue;
      const { rows: ex } = await query("SELECT 1 FROM cm_buyer_personas WHERE client_id = $1 AND persona_name = $2 LIMIT 1", [clientId, persona.name]);
      if (ex.length > 0) continue;
      const desc = [
        nz(persona.description),
        nz(persona.ageRange) && `Age: ${persona.ageRange}`,
      ].filter(Boolean).join("\n");
      await query(
        "INSERT INTO cm_buyer_personas (client_id, persona_name, gender, location, income_level, pain_points, gains, needs_description, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'folder_import')",
        [clientId, persona.name, nz(persona.gender), nz(persona.location), nz(persona.incomeLevel), nz(persona.painPoints), nz(persona.desires), desc]
      );
      added++;
    }
    if (added > 0) result.tablesUpdated.push(`cm_buyer_personas (${added} added)`);
  }

  // ── 7. cm_content_guidelines ──
  const cg = data.contentGuidelines;
  if (cg) {
    const guideFields: Record<string, string> = {};
    if (nz(cg.brandVoice)) guideFields.brand_voice = cg.brandVoice!;
    if (nz(cg.tone)) guideFields.tone = cg.tone!;
    if (nz(cg.writingStyle)) guideFields.writing_style = cg.writingStyle!;
    if (nz(cg.dosAndDonts)) guideFields.dos_and_donts = cg.dosAndDonts!;
    if (nz(cg.restrictions)) guideFields.restrictions = cg.restrictions!;
    if (nz(cg.brandColors)) guideFields.brand_colors = cg.brandColors!;
    if (nz(cg.fonts)) guideFields.fonts = cg.fonts!;
    if (nz(cg.focusTopics)) guideFields.focus_topics = cg.focusTopics!;
    if (nz(cg.uniqueSellingPoints)) guideFields.unique_selling_points = cg.uniqueSellingPoints!;
    if (nz(cg.guarantees)) guideFields.guarantees = cg.guarantees!;
    if (nz(cg.contentPurpose)) guideFields.content_purpose = cg.contentPurpose!;

    if (Object.keys(guideFields).length > 0) {
      const { rows: ex } = await query("SELECT id FROM cm_content_guidelines WHERE client_id = $1", [clientId]);
      if (ex.length > 0) {
        const sets = Object.keys(guideFields).map((k, i) => `${k} = $${i + 2}`).join(", ");
        await query(`UPDATE cm_content_guidelines SET ${sets}, updated_at = NOW() WHERE client_id = $1`,
          [clientId, ...Object.values(guideFields)]);
      } else {
        const cols = ["client_id", ...Object.keys(guideFields)];
        const phs = cols.map((_, i) => `$${i + 1}`).join(", ");
        await query(`INSERT INTO cm_content_guidelines (${cols.join(", ")}) VALUES (${phs})`,
          [clientId, ...Object.values(guideFields)]);
      }
      result.tablesUpdated.push(`cm_content_guidelines (${Object.keys(guideFields).length} fields)`);
    }
  }

  // ── 8. cm_testimonials ──
  if (data.testimonials?.length > 0) {
    let added = 0;
    for (let i = 0; i < data.testimonials.length; i++) {
      const t = data.testimonials[i];
      if (!nz(t.text)) continue;
      const { rows: ex } = await query("SELECT 1 FROM cm_testimonials WHERE client_id = $1 AND testimonial_text = $2 LIMIT 1", [clientId, t.text]);
      if (ex.length > 0) continue;
      await query(
        "INSERT INTO cm_testimonials (client_id, testimonial_text, author, sort_order) VALUES ($1, $2, $3, $4)",
        [clientId, t.text, nz(t.author), i + 1]
      );
      added++;
    }
    if (added > 0) result.tablesUpdated.push(`cm_testimonials (${added} added)`);
  }

  // ── 9. cm_brand_story.intake_data — store the raw extraction for brand story generation ──
  const { rows: storyEx } = await query("SELECT id FROM cm_brand_story WHERE client_id = $1 LIMIT 1", [clientId]);
  const intakeObj = {
    ...data.company,
    services: data.services?.map((s) => s.name).join(", "),
    competitors: data.competitors?.map((c) => c.name).join(", "),
    topQuestionsCustomersAsk: "",
    source: "folder_import",
  };
  if (storyEx[0]) {
    await query("UPDATE cm_brand_story SET intake_data = $1, intake_submitted_at = NOW() WHERE id = $2",
      [JSON.stringify(intakeObj), storyEx[0].id]);
  } else {
    await query("INSERT INTO cm_brand_story (client_id, status, intake_data, intake_submitted_at) VALUES ($1, 'draft', $2, NOW())",
      [clientId, JSON.stringify(intakeObj)]);
  }
  result.tablesUpdated.push("cm_brand_story.intake_data");
}

// ── Google Drive Reading ──────────────────────────

/**
 * Download and read content from Google Drive file URLs/IDs.
 * Supports Google Docs (exported as text) and regular files (.docx, .xlsx).
 */
export async function readFromDriveFiles(
  fileUrls: string[],
  driveService: { exportDocAsText(fileId: string): Promise<string>; downloadFile(fileId: string): Promise<Buffer>; getFileMetadata(fileId: string): Promise<{ name: string; mimeType: string }> }
): Promise<{ files: string[]; texts: string[] }> {
  const files: string[] = [];
  const texts: string[] = [];

  for (const rawUrl of fileUrls) {
    const url = rawUrl.trim();
    if (!url) continue;

    // Extract file ID from various URL formats
    let fileId = url;
    const docMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) fileId = docMatch[1];
    const spreadsheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (spreadsheetMatch) fileId = spreadsheetMatch[1];
    // Plain ID (no URL)
    if (!url.includes("/")) fileId = url;

    try {
      const meta = await driveService.getFileMetadata(fileId);
      const fileName = meta.name || fileId;
      files.push(fileName);

      if (meta.mimeType === "application/vnd.google-apps.document") {
        // Google Doc — export as plain text
        const text = await driveService.exportDocAsText(fileId);
        if (text.trim()) texts.push(`\n\n========== FILE: ${fileName} ==========\n${text}`);
      } else if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
        // Google Sheet — export as xlsx and parse
        // For now, export as CSV text
        const text = await driveService.exportDocAsText(fileId);
        if (text.trim()) texts.push(`\n\n========== FILE: ${fileName} ==========\n${text}`);
      } else if (fileName.endsWith(".docx")) {
        const buf = await driveService.downloadFile(fileId);
        const result = await mammoth.extractRawText({ buffer: buf });
        if (result.value.trim()) texts.push(`\n\n========== FILE: ${fileName} ==========\n${result.value}`);
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buf = await driveService.downloadFile(fileId);
        const text = readXlsxFromBuffer(buf);
        if (text.trim()) texts.push(`\n\n========== FILE: ${fileName} ==========\n${text}`);
      } else {
        // Try downloading as binary and reading as docx
        try {
          const buf = await driveService.downloadFile(fileId);
          const result = await mammoth.extractRawText({ buffer: buf });
          if (result.value.trim()) texts.push(`\n\n========== FILE: ${fileName} ==========\n${result.value}`);
        } catch {
          console.warn(`[folder-import] Skipping unsupported file: ${fileName} (${meta.mimeType})`);
        }
      }
    } catch (err) {
      console.error(`[folder-import] Failed to read Drive file ${fileId}:`, err);
    }
  }

  return { files, texts };
}

function readXlsxFromBuffer(buf: Buffer): string {
  try {
    const wb = XLSX.read(buf, { type: "buffer" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      parts.push(`\n=== Sheet: ${sheetName} ===`);
      for (const row of rows) {
        const cells = (row as string[]).filter((c) => c !== "" && c !== null && c !== undefined);
        if (cells.length > 0) parts.push(cells.join(" | "));
      }
    }
    return parts.join("\n");
  } catch {
    return "";
  }
}

// ── Draft-based import (extract only, don't write to DB) ──

export async function extractDraftFromDrive(
  fileUrls: string[],
  driveService: Parameters<typeof readFromDriveFiles>[1]
): Promise<{ files: string[]; totalTextLength: number; extracted: ExtractedClientData }> {
  console.log(`[folder-import] Reading ${fileUrls.length} Drive files...`);
  const { files, texts } = await readFromDriveFiles(fileUrls, driveService);

  if (texts.length === 0) {
    throw new Error("No readable content found in the provided files");
  }

  const combinedText = texts.join("\n\n");
  console.log(`[folder-import] Read ${files.length} files, ${combinedText.length} chars total`);
  console.log(`[folder-import] Sending to Claude for extraction...`);

  const extracted = await extractWithClaude(combinedText);
  return { files, totalTextLength: combinedText.length, extracted };
}

export async function extractDraftFromFolder(
  folderPath: string
): Promise<{ files: string[]; totalTextLength: number; extracted: ExtractedClientData }> {
  console.log(`[folder-import] Reading files from ${folderPath}...`);
  const { files, texts } = await readAllFiles(folderPath);

  if (texts.length === 0) {
    throw new Error("No readable documents found in the folder (.docx, .xlsx)");
  }

  const combinedText = texts.join("\n\n");
  console.log(`[folder-import] Read ${files.length} files, ${combinedText.length} chars total`);
  console.log(`[folder-import] Sending to Claude for extraction...`);

  const extracted = await extractWithClaude(combinedText);
  return { files, totalTextLength: combinedText.length, extracted };
}

/**
 * Apply an approved draft to the database.
 * The extractedData may have been edited by the user during review.
 */
export async function applyApprovedDraft(
  clientId: number,
  extractedData: ExtractedClientData
): Promise<FolderImportResult> {
  const result: FolderImportResult = {
    clientId,
    filesProcessed: [],
    totalTextLength: 0,
    extracted: extractedData,
    tablesUpdated: [],
    warnings: [],
  };

  await writeToDatabase(clientId, extractedData, result);
  return result;
}

// ── Main Export (legacy — direct import without draft) ──

export async function importFromFolder(
  clientId: number,
  folderPath: string
): Promise<FolderImportResult> {
  const result: FolderImportResult = {
    clientId,
    filesProcessed: [],
    totalTextLength: 0,
    extracted: {} as ExtractedClientData,
    tablesUpdated: [],
    warnings: [],
  };

  // 1. Read all files
  console.log(`[folder-import] Reading files from ${folderPath}...`);
  const { files, texts } = await readAllFiles(folderPath);
  result.filesProcessed = files;

  if (texts.length === 0) {
    throw new Error("No readable documents found in the folder (.docx, .xlsx)");
  }

  const combinedText = texts.join("\n\n");
  result.totalTextLength = combinedText.length;
  console.log(`[folder-import] Read ${files.length} files, ${combinedText.length} chars total`);

  // 2. Extract with Claude
  console.log(`[folder-import] Sending to Claude for extraction...`);
  const extracted = await extractWithClaude(combinedText);
  result.extracted = extracted;

  // 3. Write to database
  console.log(`[folder-import] Writing to database for client ${clientId}...`);
  await writeToDatabase(clientId, extracted, result);

  console.log(`[folder-import] Complete: ${result.tablesUpdated.length} tables updated`);
  return result;
}
