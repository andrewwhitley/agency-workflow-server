/**
 * ═══════════════════════════════════════════════════════════════
 *  AI-Powered Client Data Importer
 *  Reads Google Docs/Sheets, extracts structured data via Claude,
 *  merges into the client portfolio DB, enriches from web, and
 *  optionally generates brand story.
 * ═══════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import { query } from "./database.js";
import { GoogleDriveService, extractGoogleId } from "./google-drive.js";
import { generateBrandStory } from "./brand-story-generator.js";

const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-5-20250929";

// ── Types ────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  clientId: number;
  summary: {
    documentsRead: number;
    fieldsExtracted: number;
    fieldsEnriched: number;
    entitiesCreated: Record<string, number>;
    brandStoryGenerated: boolean;
  };
  errors: string[];
}

interface ExtractedData {
  client: Record<string, unknown>;
  contacts: Record<string, unknown>[];
  services: Record<string, unknown>[];
  serviceAreas: Record<string, unknown>[];
  competitors: Record<string, unknown>[];
  buyerPersonas: Record<string, unknown>[];
  differentiators: Record<string, unknown>[];
  teamMembers: Record<string, unknown>[];
  importantLinks: Record<string, unknown>[];
  logins: Record<string, unknown>[];
  contentGuidelines: Record<string, unknown>;
  addresses: Record<string, unknown>[];
  marketingPlan: Record<string, unknown>[];
}

// ── Schema Reference (for Claude extraction prompt) ──────

const SCHEMA_REFERENCE = `
## Database Schema Reference

### cm_clients (main client record)
Fields: company_name, legal_name, dba_name, industry, location, domain,
is_local_service_area (bool), display_address (bool),
company_phone, main_phone, sms_phone, toll_free_phone, fax_phone,
company_email, primary_email, inquiry_emails, employment_email,
company_website, date_founded, year_founded (int), ein, business_type,
number_of_customers (int), desired_new_clients (int), avg_client_lifetime_value (numeric),
number_of_employees (int), estimated_annual_revenue (numeric), target_revenue (numeric),
current_marketing_spend (numeric), current_ads_spend (numeric),
crm_system, business_hours, holiday_hours, domain_registrar,
google_drive_link, color_scheme, design_inspiration_urls,
ads_marketing_budget, ads_recruiting_budget,
target_google_ads_conv_rate, target_google_ads_cpa,
target_bing_ads_conv_rate, target_bing_ads_cpa, target_facebook_ads_cpa,
time_zone, payment_types_accepted, combined_years_experience (int),
business_facts, affiliations_associations, certifications_trainings,
community_involvement, languages_spoken, service_seasonality,
telemedicine_offered (bool)

### cm_contacts (client contacts)
Fields: name, role, email, phone, phone_type, notes, is_primary (bool),
should_attribute (bool), linktree_url, wordpress_email,
marketing_role, preferred_contact_method, response_time, approval_authority (bool)

### cm_addresses
Fields: label, street_address, city, state, postal_code,
location_type (Main|Satellite|Home|Other), notes, is_primary (bool)

### cm_services
Fields: category, service_name, offered (bool, default true), price (numeric),
duration, description, notes

### cm_service_areas
Fields: target_cities, target_counties, notes

### cm_team_members (client's staff)
Fields: full_name, role, email, phone, photo_url, linkedin_url, facebook_url,
instagram_url, other_profiles, bio, use_for_attribution (bool),
preferred_contact_method, contact_notes, specialties, credentials,
services_offered, tiktok_url, twitter_url, youtube_url, website_url,
education, years_experience (int), professional_memberships,
languages_spoken, accepting_new_patients (bool)

### cm_competitors
Fields: rank (int), company_name, url, usps, description

### cm_differentiators
Fields: category (e.g. Service, Technology, Experience, Location, Approach), title, description

### cm_buyer_personas
Fields: persona_name, age (int), gender, location, family_status, education_level,
occupation, income_level, communication_channels, needs_description,
pain_points, gains, buying_factors

### cm_important_links (GBP, social profiles, review sites)
Fields: link_type (e.g. GBP, Facebook, Instagram, Yelp, Website, Other), url, label, notes

### cm_logins (platform credentials)
Fields: platform, username, login_url, notes, access_level

### cm_content_guidelines (brand voice, messaging — one per client)
Fields: brand_voice, tone, writing_style, dos_and_donts, approved_terminology,
restrictions, unique_selling_points, guarantees, competitive_advantages,
brand_colors, fonts, logo_guidelines, design_inspiration,
target_audience_summary, demographics, psychographics,
focus_topics, seo_keywords, content_themes, messaging_priorities,
featured_testimonials, success_stories, social_proof_notes,
ad_copy_guidelines, preferred_ctas, targeting_preferences,
promotions, observed_holidays, holiday_content_notes,
brand_story, content_purpose, user_action_strategy,
existing_collateral, use_stock_photography (bool), image_source_notes,
marketing_guide, writing_style_guide

### cm_marketing_plan (deliverables — each row is one specific deliverable, NOT a category)
Fields: category (grouping header, e.g. "SEO", "Web Content", "Ad Management", "Social Media", "Reputation Management"),
item (the specific deliverable name, e.g. "Google PPC", "Standard Blog Posts", "Facebook Ads"),
description, deliverables (frequency/quantity, e.g. "8 per year", "2 per week"), notes
IMPORTANT: Do NOT create rows where item equals the category name. Categories are just group labels.

### cm_addresses
Fields: label, street_address, city, state, postal_code, location_type, notes, is_primary
`;

// ── Extraction Prompt ────────────────────────────────────

function buildExtractionPrompt(documents: { name: string; content: string }[]): string {
  return `You are a data extraction specialist. Given the following documents about a business client, extract ALL relevant information and map it to our exact database schema.

Return a single JSON object with these top-level keys:
- "client": { ...fields matching cm_clients columns, using snake_case keys }
- "contacts": [ { name, role, email, phone, ... } ]
- "services": [ { category, service_name, description, price, duration, ... } ]
- "serviceAreas": [ { target_cities, target_counties, notes } ]
- "competitors": [ { company_name, url, usps, description, rank } ]
- "buyerPersonas": [ { persona_name, age, gender, location, pain_points, needs_description, ... } ]
- "differentiators": [ { category, title, description } ]
- "teamMembers": [ { full_name, role, email, phone, bio, specialties, credentials, ... } ]
- "importantLinks": [ { link_type, url, label } ]
- "logins": [ { platform, username, login_url, notes, access_level } ]
- "contentGuidelines": { brand_voice, tone, writing_style, dos_and_donts, unique_selling_points, ... }
- "addresses": [ { label, street_address, city, state, postal_code, location_type } ]
- "marketingPlan": [] (leave empty — deliverables are managed manually via the checklist, do NOT extract marketing plan items from documents)

CRITICAL RULES:
- Extract EVERY piece of information you can find. Be thorough and exhaustive.
- Use snake_case for all field names (matching the DB schema exactly).
- For numeric fields (price, revenue, employee count), extract just the number.
- For boolean fields, use true/false.
- If a piece of information doesn't map cleanly to a field, use the closest match or put it in a "notes" field.
- If you find social media links, put them in important_links with appropriate link_type.
- If you find team member bios, credentials, or specialties, include all details.
- For services, try to categorize them (e.g., "Chiropractic", "Wellness", "Therapy").
- Return ONLY valid JSON. No markdown, no explanation, no code fences.

${SCHEMA_REFERENCE}

DOCUMENTS TO EXTRACT FROM:

${documents.map((d, i) => `=== DOCUMENT ${i + 1}: ${d.name} ===\n${d.content}`).join("\n\n")}

Remember: Return ONLY the JSON object. Be thorough — every data point matters.`;
}

// ── Enrichment Prompt ────────────────────────────────────

function buildEnrichmentPrompt(
  clientData: Record<string, unknown>,
  websiteContent: string
): string {
  return `You are a business research analyst. Given existing client data and their website content, fill in any gaps in the client profile.

EXISTING DATA (do NOT override these — only fill gaps):
${JSON.stringify(clientData, null, 2)}

WEBSITE CONTENT:
${websiteContent}

Return a JSON object with the SAME structure as the input, but ONLY include fields that are NEW (not already in the existing data). For example, if "industry" is already set, don't include it. Only include fields where you found new information from the website.

Use the same top-level keys: client, contacts, services, serviceAreas, competitors, buyerPersonas, differentiators, teamMembers, importantLinks, contentGuidelines, addresses, marketingPlan.

For arrays (contacts, services, etc.), only include NEW entries not already present.
For objects (client, contentGuidelines), only include fields that were null/empty before.

Return ONLY valid JSON. No markdown, no explanation, no code fences.`;
}

// ── Core Functions ───────────────────────────────────────

async function fetchDocuments(
  driveService: GoogleDriveService,
  documentIds: string[]
): Promise<{ name: string; content: string }[]> {
  const docs: { name: string; content: string }[] = [];

  for (const rawId of documentIds) {
    const fileId = extractGoogleId(rawId);
    try {
      // Try as Google Doc first (most common)
      const content = await driveService.readFile(fileId, "application/vnd.google-apps.document");
      docs.push({ name: `Document ${fileId.substring(0, 8)}`, content });
    } catch {
      try {
        // Try as Google Sheet
        const content = await driveService.readFile(fileId, "application/vnd.google-apps.spreadsheet");
        docs.push({ name: `Sheet ${fileId.substring(0, 8)}`, content });
      } catch (err2) {
        console.warn(`[client-import] Could not read document ${fileId}:`, err2);
      }
    }
  }

  return docs;
}

async function extractWithClaude(
  documents: { name: string; content: string }[]
): Promise<ExtractedData> {
  const prompt = buildExtractionPrompt(documents);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16384,
    system: "You are a precise data extraction specialist. Return only valid JSON.",
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const text = textBlock?.text ?? "{}";

  // Clean potential markdown code fences
  const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

  try {
    return JSON.parse(cleaned) as ExtractedData;
  } catch (err) {
    console.error("[client-import] Failed to parse Claude extraction response:", err);
    console.error("[client-import] Raw response:", text.substring(0, 500));
    throw new Error("AI extraction returned invalid JSON");
  }
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AIMarketingBot/1.0)" },
    });
    clearTimeout(timeout);

    if (!res.ok) return "";
    const html = await res.text();

    // Strip HTML tags, scripts, styles — get plain text
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 15000); // Limit to avoid token overflow
  } catch {
    return "";
  }
}

async function enrichFromWeb(
  clientId: number,
  extractedData: ExtractedData
): Promise<{ enriched: ExtractedData; fieldsEnriched: number }> {
  const website = (extractedData.client?.company_website as string) || "";
  if (!website) return { enriched: extractedData, fieldsEnriched: 0 };

  // Fetch website homepage + about page
  const urls = [website];
  if (!website.endsWith("/")) urls[0] += "/";
  const aboutVariants = ["about", "about-us", "our-team", "team", "our-story"];
  for (const variant of aboutVariants) {
    urls.push(`${urls[0]}${variant}`);
  }

  let allContent = "";
  for (const url of urls) {
    const content = await fetchWebsiteContent(url);
    if (content) {
      allContent += `\n--- ${url} ---\n${content}`;
      if (allContent.length > 20000) break;
    }
  }

  if (!allContent || allContent.length < 200) {
    return { enriched: extractedData, fieldsEnriched: 0 };
  }

  try {
    const prompt = buildEnrichmentPrompt(extractedData as unknown as Record<string, unknown>, allContent);

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: "You are a business research analyst. Return only valid JSON with NEW information not already in the existing data.",
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock?.text ?? "{}";
    const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();

    const newData = JSON.parse(cleaned) as Partial<ExtractedData>;
    let fieldsEnriched = 0;

    // Merge new client fields
    if (newData.client) {
      for (const [key, val] of Object.entries(newData.client)) {
        if (val !== null && val !== undefined && val !== "" && !extractedData.client[key]) {
          extractedData.client[key] = val;
          fieldsEnriched++;
        }
      }
    }

    // Merge new content guidelines fields
    if (newData.contentGuidelines) {
      for (const [key, val] of Object.entries(newData.contentGuidelines)) {
        if (val !== null && val !== undefined && val !== "" && !extractedData.contentGuidelines[key]) {
          extractedData.contentGuidelines[key] = val;
          fieldsEnriched++;
        }
      }
    }

    // Append new array entries
    const arrayKeys = [
      "contacts", "services", "serviceAreas", "competitors", "buyerPersonas",
      "differentiators", "teamMembers", "importantLinks", "logins", "addresses", "marketingPlan",
    ] as const;
    for (const key of arrayKeys) {
      const newItems = newData[key];
      if (Array.isArray(newItems) && newItems.length > 0) {
        extractedData[key] = [...extractedData[key], ...newItems];
        fieldsEnriched += newItems.length;
      }
    }

    // Track which fields came from AI enrichment
    if (!extractedData.client._enrichedFields) {
      extractedData.client._enrichedFields = [];
    }
    if (newData.client) {
      (extractedData.client._enrichedFields as string[]).push(...Object.keys(newData.client));
    }

    return { enriched: extractedData, fieldsEnriched };
  } catch (err) {
    console.warn("[client-import] Enrichment failed, continuing with extracted data:", err);
    return { enriched: extractedData, fieldsEnriched: 0 };
  }
}

// ── Database Merge ──────────────────────────────────────

async function mergeToDatabase(
  clientId: number,
  data: ExtractedData,
  sources: { enrichedFields: string[] }
): Promise<{ fieldsExtracted: number; entitiesCreated: Record<string, number> }> {
  let fieldsExtracted = 0;
  const entitiesCreated: Record<string, number> = {};

  // 1. Update cm_clients
  const clientFields = data.client || {};
  const enrichedSet = new Set(sources.enrichedFields);
  const fieldSources: Record<string, string> = {};

  const allowedClientFields = [
    "company_name", "legal_name", "dba_name", "industry", "location", "domain",
    "is_local_service_area", "display_address",
    "company_phone", "main_phone", "sms_phone", "toll_free_phone", "fax_phone",
    "company_email", "primary_email", "inquiry_emails", "employment_email",
    "company_website", "date_founded", "year_founded", "ein", "business_type",
    "number_of_customers", "desired_new_clients", "avg_client_lifetime_value",
    "number_of_employees", "estimated_annual_revenue", "target_revenue",
    "current_marketing_spend", "current_ads_spend",
    "crm_system", "business_hours", "holiday_hours", "domain_registrar",
    "google_drive_link", "color_scheme", "design_inspiration_urls",
    "ads_marketing_budget", "ads_recruiting_budget",
    "time_zone", "payment_types_accepted", "combined_years_experience",
    "business_facts", "affiliations_associations", "certifications_trainings",
    "community_involvement", "languages_spoken", "service_seasonality",
    "telemedicine_offered",
  ];

  const updateFields: string[] = [];
  const updateValues: unknown[] = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(clientFields)) {
    if (key.startsWith("_")) continue; // skip internal fields
    if (!allowedClientFields.includes(key)) continue;
    if (val === null || val === undefined || val === "") continue;
    updateFields.push(`${key} = $${paramIdx++}`);
    updateValues.push(val);
    fieldSources[key] = enrichedSet.has(key) ? "ai" : "client";
    fieldsExtracted++;
  }

  if (updateFields.length > 0) {
    // Also update field_sources
    updateFields.push(`field_sources = $${paramIdx++}`);
    updateValues.push(JSON.stringify(fieldSources));
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(clientId);
    await query(
      `UPDATE cm_clients SET ${updateFields.join(", ")} WHERE id = $${paramIdx}`,
      updateValues
    );
  }

  // 2. Upsert sub-entities
  const allowedColumns: Record<string, string[]> = {
    cm_contacts: ["name", "role", "email", "phone", "phone_type", "notes", "is_primary", "should_attribute", "linktree_url", "wordpress_email", "marketing_role", "preferred_contact_method", "response_time", "approval_authority", "gravatar_email"],
    cm_team_members: ["full_name", "role", "email", "phone", "photo_url", "linkedin_url", "facebook_url", "instagram_url", "other_profiles", "bio", "use_for_attribution", "preferred_contact_method", "contact_notes", "specialties", "credentials", "services_offered", "tiktok_url", "twitter_url", "youtube_url", "website_url", "education", "years_experience", "professional_memberships", "languages_spoken", "accepting_new_patients"],
    cm_services: ["category", "service_name", "offered", "price", "duration", "description", "notes"],
    cm_service_areas: ["target_cities", "target_counties", "notes"],
    cm_competitors: ["rank", "company_name", "url", "usps", "description"],
    cm_differentiators: ["category", "title", "description"],
    cm_buyer_personas: ["persona_name", "age", "gender", "location", "family_status", "education_level", "occupation", "income_level", "communication_channels", "needs_description", "pain_points", "gains", "buying_factors"],
    cm_important_links: ["link_type", "url", "label", "notes"],
    cm_logins: ["platform", "username", "login_url", "notes", "access_level"],
    cm_addresses: ["label", "street_address", "city", "state", "postal_code", "location_type", "notes", "is_primary"],
    cm_marketing_plan: ["category", "item", "is_included", "quantity", "deliverables", "notes"],
  };

  async function upsertArray(
    table: string,
    items: Record<string, unknown>[],
    entityName: string,
    source: string
  ): Promise<number> {
    const allowed = allowedColumns[table] || [];
    let count = 0;
    for (const item of items) {
      const cols: string[] = ["client_id"];
      const vals: unknown[] = [clientId];
      const placeholders: string[] = ["$1"];
      let i = 2;

      // Add source column if available
      if (source && allowed.length === 0 || (allowedColumns[table] && !allowedColumns[table].includes("source"))) {
        // Only add source if the table has the column (added by migration 035)
        if (["cm_contacts", "cm_buyer_personas", "cm_competitors", "cm_differentiators", "cm_team_members", "cm_services", "cm_important_links"].includes(table)) {
          cols.push("source");
          vals.push(source);
          placeholders.push(`$${i++}`);
        }
      }

      for (const [rawKey, rawVal] of Object.entries(item)) {
        if (rawKey.startsWith("_") || rawVal === null || rawVal === undefined || rawVal === "") continue;
        // Convert camelCase to snake_case
        const key = rawKey.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        if (allowed.length > 0 && !allowed.includes(key)) continue;
        // Stringify arrays/objects for TEXT columns
        const val = (typeof rawVal === "object" && !Array.isArray(rawVal)) ? JSON.stringify(rawVal) : (Array.isArray(rawVal) ? rawVal.join(", ") : rawVal);
        cols.push(key);
        vals.push(val);
        placeholders.push(`$${i++}`);
      }

      if (cols.length <= 2) continue;

      try {
        await query(
          `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
          vals
        );
        count++;
      } catch (err) {
        console.warn(`[client-import] Failed to insert into ${table}:`, err);
      }
    }
    if (count > 0) entitiesCreated[entityName] = count;
    return count;
  }

  // Determine source for each array based on whether items came from enrichment
  const arrayCount = data.contacts?.length || 0;
  const origContactCount = arrayCount; // We'll use "client" for doc-extracted, "ai" for enriched

  if (data.contacts?.length) await upsertArray("cm_contacts", data.contacts, "contacts", "client");
  if (data.services?.length) await upsertArray("cm_services", data.services, "services", "client");
  if (data.serviceAreas?.length) await upsertArray("cm_service_areas", data.serviceAreas, "serviceAreas", "");
  if (data.competitors?.length) await upsertArray("cm_competitors", data.competitors, "competitors", "client");
  if (data.buyerPersonas?.length) await upsertArray("cm_buyer_personas", data.buyerPersonas, "buyerPersonas", "client");
  if (data.differentiators?.length) await upsertArray("cm_differentiators", data.differentiators, "differentiators", "client");
  if (data.teamMembers?.length) await upsertArray("cm_team_members", data.teamMembers, "teamMembers", "client");
  if (data.importantLinks?.length) await upsertArray("cm_important_links", data.importantLinks, "importantLinks", "client");
  if (data.logins?.length) await upsertArray("cm_logins", data.logins, "logins", "");
  if (data.addresses?.length) await upsertArray("cm_addresses", data.addresses, "addresses", "");
  if (data.marketingPlan?.length) {
    // Clean up marketing plan: fix key names, filter out category-as-item rows
    const cleanedPlan = data.marketingPlan
      .map((item) => {
        const cleaned = { ...item };
        // Fix common AI key mismatches
        if (cleaned.item_name && !cleaned.item) { cleaned.item = cleaned.item_name; delete cleaned.item_name; }
        return cleaned;
      })
      .filter((item) => {
        // Skip rows where item is missing or equals the category
        const itemVal = String(item.item || "").trim();
        const catVal = String(item.category || "").trim();
        return itemVal && itemVal !== catVal;
      });
    if (cleanedPlan.length) await upsertArray("cm_marketing_plan", cleanedPlan, "marketingPlan", "");
  }

  // 3. Upsert content guidelines
  const allowedGuidelineFields = [
    "brand_voice", "tone", "writing_style", "dos_and_donts", "approved_terminology",
    "restrictions", "unique_selling_points", "guarantees", "competitive_advantages",
    "brand_colors", "fonts", "logo_guidelines", "design_inspiration",
    "target_audience_summary", "demographics", "psychographics",
    "focus_topics", "seo_keywords", "content_themes", "messaging_priorities",
    "featured_testimonials", "success_stories", "social_proof_notes",
    "ad_copy_guidelines", "preferred_ctas", "targeting_preferences",
    "promotions", "observed_holidays", "holiday_content_notes",
    "brand_story", "content_purpose", "user_action_strategy",
    "existing_collateral", "use_stock_photography", "image_source_notes",
    "marketing_guide", "writing_style_guide",
  ];
  if (data.contentGuidelines && Object.keys(data.contentGuidelines).length > 0) {
    const guideSources: Record<string, string> = {};
    const cols: string[] = ["client_id"];
    const vals: unknown[] = [clientId];
    const placeholders: string[] = ["$1"];
    const updates: string[] = [];
    let i = 2;

    for (const [rawKey, rawVal] of Object.entries(data.contentGuidelines)) {
      if (rawKey.startsWith("_") || rawVal === null || rawVal === undefined || rawVal === "") continue;
      // Convert camelCase to snake_case
      const key = rawKey.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      if (!allowedGuidelineFields.includes(key)) continue;
      // Stringify arrays/objects for TEXT columns
      const val = (typeof rawVal === "object") ? JSON.stringify(rawVal) : rawVal;
      cols.push(key);
      vals.push(val);
      placeholders.push(`$${i}`);
      updates.push(`${key} = $${i}`);
      guideSources[key] = enrichedSet.has(key) ? "ai" : "client";
      i++;
      fieldsExtracted++;
    }

    // Add field_sources
    cols.push("field_sources");
    vals.push(JSON.stringify(guideSources));
    placeholders.push(`$${i}`);
    updates.push(`field_sources = $${i}`);
    i++;

    updates.push("updated_at = NOW()");

    if (cols.length > 2) {
      await query(
        `INSERT INTO cm_content_guidelines (${cols.join(", ")}) VALUES (${placeholders.join(", ")})
         ON CONFLICT (client_id) DO UPDATE SET ${updates.join(", ")}`,
        vals
      );
      entitiesCreated["contentGuidelines"] = 1;
    }
  }

  // 4. Deduplicate — remove duplicate rows created by import
  const dedupConfigs = [
    { table: "cm_contacts", key: "LOWER(TRIM(name))" },
    { table: "cm_team_members", key: "LOWER(TRIM(full_name))" },
    { table: "cm_services", key: "LOWER(TRIM(service_name)), LOWER(TRIM(category))" },
    { table: "cm_competitors", key: "LOWER(TRIM(company_name))" },
    { table: "cm_differentiators", key: "LOWER(TRIM(COALESCE(title,''))), LOWER(TRIM(category))" },
    { table: "cm_buyer_personas", key: "LOWER(TRIM(persona_name))" },
    { table: "cm_important_links", key: "LOWER(TRIM(url))" },
    { table: "cm_addresses", key: "LOWER(TRIM(COALESCE(street_address,''))), LOWER(TRIM(COALESCE(city,'')))" },
    { table: "cm_logins", key: "LOWER(TRIM(platform))" },
  ];
  for (const { table, key } of dedupConfigs) {
    await query(
      `DELETE FROM ${table} WHERE client_id = $1 AND id NOT IN (
        SELECT MIN(id) FROM ${table} WHERE client_id = $1 GROUP BY ${key}
      )`, [clientId]
    );
  }

  return { fieldsExtracted, entitiesCreated };
}

// ── Main Export ──────────────────────────────────────────

export async function importClientData(
  clientId: number,
  documentIds: string[],
  driveService: GoogleDriveService,
  options: { generateStory?: boolean; enrichFromWeb?: boolean } = {}
): Promise<ImportResult> {
  const { generateStory = true, enrichFromWeb: doEnrich = true } = options;
  const errors: string[] = [];

  console.log(`[client-import] Starting import for client ${clientId} with ${documentIds.length} documents`);

  // 1. Verify client exists
  const clientRes = await query("SELECT id, company_website FROM cm_clients WHERE id = $1", [clientId]);
  if (!clientRes.rows[0]) {
    throw new Error(`Client ${clientId} not found`);
  }

  // 2. Fetch all documents
  console.log(`[client-import] Fetching ${documentIds.length} documents...`);
  const documents = await fetchDocuments(driveService, documentIds);
  if (documents.length === 0) {
    throw new Error("No documents could be read. Check document IDs and permissions.");
  }
  console.log(`[client-import] Successfully read ${documents.length} documents (${documents.reduce((s, d) => s + d.content.length, 0)} chars total)`);

  // 3. Extract structured data via Claude
  console.log(`[client-import] Extracting data with AI...`);
  let extractedData: ExtractedData;
  try {
    extractedData = await extractWithClaude(documents);
  } catch (err) {
    throw new Error(`AI extraction failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Use website from extraction if client doesn't have one
  const website = clientRes.rows[0].company_website || (extractedData.client?.company_website as string) || "";

  // 4. Enrich from web (optional)
  let fieldsEnriched = 0;
  if (doEnrich && website) {
    console.log(`[client-import] Enriching from website: ${website}...`);
    if (!extractedData.client.company_website) {
      extractedData.client.company_website = website;
    }
    const result = await enrichFromWeb(clientId, extractedData);
    extractedData = result.enriched;
    fieldsEnriched = result.fieldsEnriched;
    if (fieldsEnriched > 0) {
      console.log(`[client-import] Enriched ${fieldsEnriched} additional fields from web`);
    }
  }

  // 5. Merge to database
  console.log(`[client-import] Merging data to database...`);
  const enrichedFields = (extractedData.client._enrichedFields as string[]) || [];
  const { fieldsExtracted, entitiesCreated } = await mergeToDatabase(clientId, extractedData, {
    enrichedFields,
  });
  console.log(`[client-import] Merged: ${fieldsExtracted} fields, ${Object.values(entitiesCreated).reduce((s, n) => s + n, 0)} entities`);

  // 6. Generate brand story (optional)
  let brandStoryGenerated = false;
  if (generateStory) {
    console.log(`[client-import] Generating brand story...`);
    try {
      await generateBrandStory(clientId);
      brandStoryGenerated = true;
      console.log(`[client-import] Brand story generated successfully`);
    } catch (err) {
      const msg = `Brand story generation failed: ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[client-import] ${msg}`);
      errors.push(msg);
    }
  }

  const result: ImportResult = {
    success: true,
    clientId,
    summary: {
      documentsRead: documents.length,
      fieldsExtracted,
      fieldsEnriched,
      entitiesCreated,
      brandStoryGenerated,
    },
    errors,
  };

  console.log(`[client-import] Import complete:`, JSON.stringify(result.summary));
  return result;
}

// ── Lookup client by slug ───────────────────────────────

export async function getClientIdBySlug(slug: string): Promise<number | null> {
  const res = await query("SELECT id FROM cm_clients WHERE slug = $1", [slug]);
  return res.rows[0]?.id ?? null;
}
