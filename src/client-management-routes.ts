/**
 * Client Management API routes — ported from Manus tRPC routers to Express REST.
 * Covers: clients, contacts, addresses, services, team members, competitors,
 * differentiators, buyer personas, important links, logins, content guidelines,
 * brand story, campaigns, campaign deliverables, marketing plan,
 * traffic light system, agency team, activity log.
 */

import { Router } from "express";
import multer from "multer";
import { query } from "./database.js";
import { DataForSEOService } from "./dataforseo.js";
import { generateContentPillars, generateCustomerJourney, generateContentPlan, generateSprintPlan } from "./strategy-generator.js";
import { generateBrandStory, generateBrandScript, regenerateBrandStorySection, updateBrandStorySection, researchOutlineFromUrl, RESEARCH_OUTLINE_FIELDS } from "./brand-story-generator.js";
import { importClientData } from "./client-import.js";
import { importIntakeTemplate } from "./intake-importer.js";
import { GoogleDriveService } from "./google-drive.js";
import { GoogleAuthService } from "./google-auth.js";

// ── Brand story content parsing helpers ─────────────────────

/**
 * Extract markdown content from a brand story section JSONB field.
 * Section data is stored as { content: "markdown...", generated: bool, edited: bool }
 */
function extractContent(section: unknown): string {
  if (!section) return "";
  if (typeof section === "string") {
    try {
      const parsed = JSON.parse(section);
      return parsed?.content || "";
    } catch {
      return section;
    }
  }
  if (typeof section === "object" && section !== null) {
    const obj = section as Record<string, unknown>;
    if (typeof obj.content === "string") return obj.content;
  }
  return "";
}

/**
 * Parse Big 5 article titles from the bigFiveSection markdown.
 * The generator outputs sections like "### 1. Cost & Pricing" followed by bullet titles.
 * Returns array of { title, category, type }.
 */
function parseBigFiveArticles(markdown: string): Array<{ title: string; category: string; type: string }> {
  if (!markdown) return [];
  const articles: Array<{ title: string; category: string; type: string }> = [];

  // Map heading text to a category label
  const categoryMatchers: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /cost\s*&?\s*pricing|pricing/i, label: "Cost & Pricing" },
    { pattern: /problems?\s*&?\s*risks?|side effects/i, label: "Problems & Risks" },
    { pattern: /comparisons?|vs\.?\s*[a-z]/i, label: "Comparisons" },
    { pattern: /reviews?|best.?of/i, label: "Reviews & Best-of" },
    { pattern: /best\s+(in\s+)?class/i, label: "Best in Class" },
  ];

  let currentCategory = "Big 5";
  const lines = markdown.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect headings (### or ## or numbered sections like "### 1. Cost")
    if (line.startsWith("#")) {
      const headingText = line.replace(/^#+\s*\d*\.?\s*/, "").trim();
      const matched = categoryMatchers.find((m) => m.pattern.test(headingText));
      if (matched) currentCategory = matched.label;
      continue;
    }

    // Detect bullet titles — strip leading "- " or "* " or quoted strings
    let title = line.replace(/^[-*•]\s*/, "").trim();
    // Strip surrounding quotes
    title = title.replace(/^["'`]+|["'`]+$/g, "").trim();
    // Strip leading numbering like "1. " or "1) "
    title = title.replace(/^\d+[.)]\s*/, "").trim();

    // Skip if it doesn't look like a title (too short, ends with colon, looks like prose)
    if (title.length < 12 || title.length > 200) continue;
    if (title.endsWith(":") || title.endsWith(".") && title.split(" ").length > 20) continue;
    // Skip if it's wrapped in markdown formatting only
    if (title === title.toUpperCase() && title.length < 30) continue;

    articles.push({
      title,
      category: currentCategory,
      type: currentCategory.includes("Cost") || currentCategory.includes("Comparison") ? "Long-form with PR" : "Standard Article",
    });
  }

  return articles;
}

/**
 * Parse TAYA questions from the tayaQuestionsSection markdown.
 * The generator outputs questions organized by buyer journey stage.
 * Returns array of { question, stage }.
 */
function parseTayaQuestions(markdown: string): Array<{ question: string; stage: string }> {
  if (!markdown) return [];
  const questions: Array<{ question: string; stage: string }> = [];

  const stageMatchers: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /awareness/i, label: "Awareness" },
    { pattern: /consideration/i, label: "Consideration" },
    { pattern: /decision/i, label: "Decision" },
    { pattern: /post.?purchase|retention/i, label: "Post-Purchase" },
  ];

  let currentStage = "General";
  const lines = markdown.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      const headingText = line.replace(/^#+\s*/, "").trim();
      const matched = stageMatchers.find((m) => m.pattern.test(headingText));
      if (matched) currentStage = matched.label;
      continue;
    }

    let question = line.replace(/^[-*•]\s*/, "").trim();
    question = question.replace(/^["'`]+|["'`]+$/g, "").trim();
    question = question.replace(/^\d+[.)]\s*/, "").trim();

    // Only keep things that look like questions (contain ? or start with question words)
    if (question.length < 8 || question.length > 250) continue;
    const looksLikeQuestion = /[?]/.test(question) || /^(how|what|why|when|where|who|which|do|does|is|are|can|should)\b/i.test(question);
    if (!looksLikeQuestion) continue;

    questions.push({ question, stage: currentStage });
  }

  return questions;
}

export function clientManagementRouter(): Router {
  const router = Router();

  // ── Helper: snake_case row keys to camelCase ─────────
  function toCamel(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    return out;
  }
  function rowsToCamel(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return rows.map(toCamel);
  }

  // ════════════════════════════════════════════════════════
  //  CLIENTS
  // ════════════════════════════════════════════════════════

  router.get("/clients", async (_req, res) => {
    try {
      const { rows } = await query("SELECT * FROM cm_clients ORDER BY company_name");
      res.json(rowsToCamel(rows));
    } catch (err) { console.error("List clients error:", err); res.status(500).json({ error: "Failed to list clients" }); }
  });

  router.get("/clients/:slug", async (req, res) => {
    try {
      const { rows } = await query("SELECT * FROM cm_clients WHERE slug = $1", [req.params.slug]);
      if (!rows[0]) { res.status(404).json({ error: "Client not found" }); return; }
      res.json(toCamel(rows[0]));
    } catch (err) { console.error("Get client error:", err); res.status(500).json({ error: "Failed to get client" }); }
  });

  // Derive clean domain from a website URL
  const deriveDomain = (url: string | undefined | null): string | null => {
    if (!url) return null;
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") || null;
  };

  router.post("/clients", async (req, res) => {
    const b = req.body;
    if (!b.companyName) { res.status(400).json({ error: "companyName is required" }); return; }
    const slug = b.slug || b.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    // Auto-derive domain from website if not explicitly provided
    const domain = b.domain || deriveDomain(b.companyWebsite);
    try {
      const { rows } = await query(
        `INSERT INTO cm_clients (slug, company_name, legal_name, dba_name, industry, location, domain, company_phone, company_email, company_website, business_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [slug, b.companyName, b.legalName, b.dbaName, b.industry, b.location, domain, b.companyPhone, b.companyEmail, b.companyWebsite, b.businessType, b.status || "active"]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { console.error("Create client error:", err); res.status(500).json({ error: "Failed to create client" }); }
  });

  router.put("/clients/:id", async (req, res) => {
    const b = req.body;
    try {
      // Dynamic update: only set fields that are provided
      const fields: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      const allowed = [
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
        "target_google_ads_conv_rate", "target_google_ads_cpa",
        "target_bing_ads_conv_rate", "target_bing_ads_cpa", "target_facebook_ads_cpa",
        "time_zone", "payment_types_accepted", "combined_years_experience",
        "business_facts", "affiliations_associations", "certifications_trainings",
        "community_involvement", "languages_spoken", "service_seasonality",
        "telemedicine_offered", "status",
        "founded_month", "business_hours_structured", "payment_types",
        "number_of_customers_period", "desired_new_clients_period",
        "estimated_annual_revenue_period", "target_revenue_period",
        "current_marketing_spend_period", "current_ads_spend_period",
        "service_category_order",
        // ─── New fields from migration 053 (intake completeness) ───
        "mission_statement", "core_values", "slogans_mottos",
        "company_background", "founding_inspiration",
        "gbp_url", "gbp_review_link", "gbp_location_id",
        "logins_drive_link", "access_checklist", "social_links",
        "social_media_guidelines", "additional_locations",
        "notable_mentions", "awards_recognitions", "quality_assurance_process",
        "what_makes_us_unique",
        "demographics_gender", "demographics_age", "demographics_location",
        "demographics_income", "demographics_education", "demographics_pain_points",
      ];
      for (const [key, val] of Object.entries(b)) {
        const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        if (allowed.includes(snakeKey) && val !== undefined) {
          fields.push(`${snakeKey} = $${i++}`);
          values.push(val);
        }
      }
      // Auto-derive domain when companyWebsite is updated
      if (b.companyWebsite !== undefined && !b.domain) {
        const derived = deriveDomain(b.companyWebsite);
        if (derived) {
          fields.push(`domain = $${i++}`);
          values.push(derived);
        }
      }
      if (fields.length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
      fields.push(`updated_at = NOW()`);
      values.push(req.params.id);
      const { rows } = await query(
        `UPDATE cm_clients SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values
      );
      if (!rows[0]) { res.status(404).json({ error: "Client not found" }); return; }
      res.json(toCamel(rows[0]));
    } catch (err) { console.error("Update client error:", err); res.status(500).json({ error: "Failed to update client" }); }
  });

  router.delete("/clients/:id", async (req, res) => {
    try {
      await query("DELETE FROM cm_clients WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { console.error("Delete client error:", err); res.status(500).json({ error: "Failed to delete client" }); }
  });

  // ════════════════════════════════════════════════════════
  //  GENERIC CRUD HELPER — most sub-tables follow the same pattern
  // ════════════════════════════════════════════════════════

  function crudRoutes(table: string, entityName: string, requiredFields: string[] = []) {
    // List by client
    router.get(`/clients/:clientId/${entityName}`, async (req, res) => {
      try {
        const { rows } = await query(`SELECT * FROM ${table} WHERE client_id = $1 ORDER BY created_at`, [req.params.clientId]);
        res.json(rowsToCamel(rows));
      } catch (err) { console.error(`List ${entityName} error:`, err); res.status(500).json({ error: `Failed to list ${entityName}` }); }
    });

    // Create
    router.post(`/clients/:clientId/${entityName}`, async (req, res) => {
      const b = { ...req.body, clientId: parseInt(req.params.clientId) };
      // Build insert dynamically
      const cols: string[] = ["client_id"];
      const vals: unknown[] = [b.clientId];
      const placeholders: string[] = ["$1"];
      let i = 2;
      for (const [key, val] of Object.entries(b)) {
        if (key === "clientId" || val === undefined) continue;
        const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        cols.push(snakeKey);
        vals.push(val);
        placeholders.push(`$${i++}`);
      }
      try {
        const { rows } = await query(
          `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`, vals
        );
        res.json(toCamel(rows[0]));
      } catch (err) { console.error(`Create ${entityName} error:`, err); res.status(500).json({ error: `Failed to create ${entityName}` }); }
    });

    // Update
    router.put(`/${entityName}/:id`, async (req, res) => {
      const b = req.body;
      const fields: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      for (const [key, val] of Object.entries(b)) {
        if (key === "id" || key === "clientId" || key === "createdAt" || key === "updatedAt" || val === undefined) continue;
        const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        fields.push(`${snakeKey} = $${i++}`);
        values.push(val);
      }
      if (fields.length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
      fields.push("updated_at = NOW()");
      values.push(req.params.id);
      try {
        const { rows } = await query(`UPDATE ${table} SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values);
        if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
        res.json(toCamel(rows[0]));
      } catch (err) { console.error(`Update ${entityName} error:`, err); res.status(500).json({ error: `Failed to update` }); }
    });

    // Delete
    router.delete(`/${entityName}/:id`, async (req, res) => {
      try {
        await query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
        res.json({ success: true });
      } catch (err) { console.error(`Delete ${entityName} error:`, err); res.status(500).json({ error: `Failed to delete` }); }
    });
  }

  // Register CRUD for all sub-entities
  crudRoutes("cm_phone_numbers", "phone-numbers");
  crudRoutes("cm_email_addresses", "email-addresses");
  crudRoutes("cm_contacts", "contacts");
  crudRoutes("cm_addresses", "addresses");
  crudRoutes("cm_services", "services");
  crudRoutes("cm_service_areas", "service-areas");
  crudRoutes("cm_team_members", "team-members");
  crudRoutes("cm_competitors", "competitors");
  crudRoutes("cm_differentiators", "differentiators");
  crudRoutes("cm_buyer_personas", "buyer-personas");
  crudRoutes("cm_important_links", "important-links");
  crudRoutes("cm_logins", "logins");
  crudRoutes("cm_marketing_plan", "marketing-plan");
  crudRoutes("cm_campaign_deliverables", "campaign-deliverables");
  // ─── New tables from migration 053 ───
  crudRoutes("cm_testimonials", "testimonials");
  crudRoutes("cm_appointment_types", "appointment-types");
  crudRoutes("cm_reactivation_offers", "reactivation-offers");

  // Singleton routes for 1-per-client tables (cm_ads_config, cm_ai_bot_config)
  function singletonRoutes(table: string, entityName: string) {
    router.get(`/clients/:clientId/${entityName}`, async (req, res) => {
      try {
        const { rows } = await query(`SELECT * FROM ${table} WHERE client_id = $1 LIMIT 1`, [req.params.clientId]);
        res.json(rows[0] ? toCamel(rows[0]) : null);
      } catch (err) { console.error(`Get ${entityName} error:`, err); res.status(500).json({ error: "Failed" }); }
    });

    router.put(`/clients/:clientId/${entityName}`, async (req, res) => {
      const clientId = parseInt(String(req.params.clientId));
      const b = req.body;
      try {
        const cols: string[] = [];
        const placeholders: string[] = [];
        const updates: string[] = [];
        const vals: unknown[] = [clientId];
        let i = 2;
        for (const [key, val] of Object.entries(b)) {
          if (key === "id" || key === "clientId" || val === undefined) continue;
          const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
          // Auto-stringify objects (JSONB columns)
          const v = (val !== null && typeof val === "object") ? JSON.stringify(val) : val;
          cols.push(snakeKey);
          placeholders.push(`$${i}`);
          updates.push(`${snakeKey} = $${i}`);
          vals.push(v);
          i++;
        }
        if (cols.length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
        const { rows } = await query(
          `INSERT INTO ${table} (client_id, ${cols.join(", ")}) VALUES ($1, ${placeholders.join(", ")})
           ON CONFLICT (client_id) DO UPDATE SET ${updates.join(", ")}, updated_at = NOW()
           RETURNING *`,
          vals
        );
        res.json(toCamel(rows[0]));
      } catch (err) { console.error(`Upsert ${entityName} error:`, err); res.status(500).json({ error: "Failed" }); }
    });
  }

  singletonRoutes("cm_ads_config", "ads-config");
  singletonRoutes("cm_ai_bot_config", "ai-bot-config");

  // ════════════════════════════════════════════════════════
  //  CONTENT GUIDELINES (upsert — one per client)
  // ════════════════════════════════════════════════════════

  router.get("/clients/:clientId/content-guidelines", async (req, res) => {
    try {
      const { rows } = await query("SELECT * FROM cm_content_guidelines WHERE client_id = $1", [req.params.clientId]);
      res.json(rows[0] ? toCamel(rows[0]) : null);
    } catch (err) { console.error("Get content guidelines error:", err); res.status(500).json({ error: "Failed" }); }
  });

  router.put("/clients/:clientId/content-guidelines", async (req, res) => {
    const b = req.body;
    const clientId = parseInt(req.params.clientId);
    const cols: string[] = ["client_id"];
    const vals: unknown[] = [clientId];
    const placeholders: string[] = ["$1"];
    const updates: string[] = [];
    let i = 2;
    for (const [key, val] of Object.entries(b)) {
      if (key === "id" || key === "clientId" || val === undefined) continue;
      const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      cols.push(snakeKey);
      vals.push(val);
      placeholders.push(`$${i}`);
      updates.push(`${snakeKey} = $${i}`);
      i++;
    }
    updates.push("updated_at = NOW()");
    try {
      const { rows } = await query(
        `INSERT INTO cm_content_guidelines (${cols.join(", ")}) VALUES (${placeholders.join(", ")})
         ON CONFLICT (client_id) DO UPDATE SET ${updates.join(", ")} RETURNING *`, vals
      );
      res.json(toCamel(rows[0]));
    } catch (err) { console.error("Upsert content guidelines error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // ════════════════════════════════════════════════════════
  //  BRAND STORY
  // ════════════════════════════════════════════════════════

  router.get("/clients/:clientId/brand-story", async (req, res) => {
    try {
      const clientId = req.params.clientId;
      const [storyResult, personasResult, guidelinesResult, clientResult] = await Promise.all([
        query("SELECT * FROM cm_brand_story WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1", [clientId]),
        query("SELECT * FROM cm_buyer_personas WHERE client_id = $1", [clientId]),
        query("SELECT * FROM cm_content_guidelines WHERE client_id = $1 LIMIT 1", [clientId]),
        query("SELECT company_name, industry, company_website, location, company_phone, company_email, year_founded FROM cm_clients WHERE id = $1", [clientId]),
      ]);
      res.json({
        story: storyResult.rows[0] ? toCamel(storyResult.rows[0]) : null,
        buyerPersonas: rowsToCamel(personasResult.rows),
        brandColors: guidelinesResult.rows[0]?.brand_colors || null,
        client: clientResult.rows[0] ? toCamel(clientResult.rows[0]) : null,
      });
    } catch (err) { console.error("Get brand story error:", err); res.status(500).json({ error: "Failed" }); }
  });

  router.post("/clients/:clientId/brand-story", async (req, res) => {
    const b = req.body;
    const clientId = parseInt(req.params.clientId);
    try {
      const { rows } = await query(
        `INSERT INTO cm_brand_story (client_id, status, hero_section, problem_section, guide_section, plan_section,
          cta_section, success_section, failure_section, full_brand_story, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
        [clientId, b.status || "generated", JSON.stringify(b.heroSection), JSON.stringify(b.problemSection),
         JSON.stringify(b.guideSection), JSON.stringify(b.planSection), JSON.stringify(b.ctaSection),
         JSON.stringify(b.successSection), JSON.stringify(b.failureSection), b.fullBrandStory]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { console.error("Create brand story error:", err); res.status(500).json({ error: "Failed" }); }
  });

  router.put("/brand-story/:id", async (req, res) => {
    const b = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const jsonFields = ["heroSection", "problemSection", "guideSection", "planSection", "ctaSection", "successSection", "failureSection", "brandVoiceSection", "visualIdentitySection", "contentStrategySection", "messagingSection", "implementationSection", "bigFiveSection", "tayaQuestionsSection", "endlessCustomersSection"];
    for (const [key, val] of Object.entries(b)) {
      if (key === "id" || key === "clientId" || val === undefined) continue;
      const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      fields.push(`${snakeKey} = $${i++}`);
      values.push(jsonFields.includes(key) ? JSON.stringify(val) : val);
    }
    if (fields.length === 0) { res.status(400).json({ error: "No fields" }); return; }
    fields.push("updated_at = NOW()");
    values.push(req.params.id);
    try {
      const { rows } = await query(`UPDATE cm_brand_story SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values);
      res.json(rows[0] ? toCamel(rows[0]) : null);
    } catch (err) { console.error("Update brand story error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // Brand story share link
  router.post("/brand-story/:id/share", async (req, res) => {
    try {
      const { randomBytes } = await import("crypto");
      const token = randomBytes(32).toString("hex");
      const { rows } = await query("UPDATE cm_brand_story SET share_token = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [token, req.params.id]);
      res.json(rows[0] ? toCamel(rows[0]) : null);
    } catch (err) { console.error("Generate share link error:", err); res.status(500).json({ error: "Failed" }); }
  });
  router.delete("/brand-story/:id/share", async (req, res) => {
    try {
      const { rows } = await query("UPDATE cm_brand_story SET share_token = NULL, updated_at = NOW() WHERE id = $1 RETURNING *", [req.params.id]);
      res.json(rows[0] ? toCamel(rows[0]) : null);
    } catch (err) { console.error("Revoke share link error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // Research outline from URL — fetches website, AI extracts key fields
  router.post("/clients/:clientId/brand-story/research", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const { url } = req.body;
    if (!url) { res.status(400).json({ error: "url is required" }); return; }
    req.socket.setTimeout(120_000); // 2 min for fetch + AI
    try {
      const outline = await researchOutlineFromUrl(clientId, url);
      res.json({ success: true, outline, fields: RESEARCH_OUTLINE_FIELDS });
    } catch (err) {
      console.error("Research outline error:", err);
      const message = err instanceof Error ? err.message : "Research failed";
      res.status(500).json({ error: message });
    }
  });

  // Save edited intake data (after user reviews the research outline)
  router.put("/clients/:clientId/brand-story/intake", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const { intake } = req.body;
    if (!intake || typeof intake !== "object") { res.status(400).json({ error: "intake object is required" }); return; }
    try {
      await query(
        `INSERT INTO cm_brand_story (client_id, intake_data, intake_submitted_at, status)
         VALUES ($1, $2, NOW(), 'draft')
         ON CONFLICT (client_id) DO UPDATE SET
           intake_data = $2,
           intake_submitted_at = NOW()`,
        [clientId, JSON.stringify(intake)]
      );
      res.json({ success: true });
    } catch (err) { console.error("Save intake error:", err); res.status(500).json({ error: "Failed to save" }); }
  });

  // ── Async brand story generation (avoids Cloudflare 100s proxy timeout) ──
  // In-memory job tracker — jobs don't survive restarts, but that's fine
  const generationJobs = new Map<number, { status: "running" | "done" | "error"; error?: string; startedAt: number }>();

  // Start generation — returns immediately, runs in background
  router.post("/clients/:clientId/brand-story/generate", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    // If already running for this client, don't start another
    const existing = generationJobs.get(clientId);
    if (existing?.status === "running") {
      res.json({ status: "running", message: "Generation already in progress" });
      return;
    }
    // Mark as running and respond immediately
    generationJobs.set(clientId, { status: "running", startedAt: Date.now() });
    res.json({ status: "running", message: "Brand story generation started" });

    // Run in background
    generateBrandStory(clientId)
      .then(() => {
        generationJobs.set(clientId, { status: "done", startedAt: Date.now() });
        console.log(`[brand-story] Generation complete for client ${clientId}`);
      })
      .catch((err) => {
        console.error("Generate brand story error:", err);
        const message = err instanceof Error ? err.message : "Brand story generation failed";
        generationJobs.set(clientId, { status: "error", error: message, startedAt: Date.now() });
      });
  });

  // Poll generation status
  router.get("/clients/:clientId/brand-story/generate/status", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const job = generationJobs.get(clientId);
    if (!job) {
      res.json({ status: "idle" });
      return;
    }
    res.json(job);
    // Clean up completed/errored jobs after they've been read
    if (job.status === "done" || job.status === "error") {
      generationJobs.delete(clientId);
    }
  });

  // Generate short BrandScript (2-page version)
  router.post("/clients/:clientId/brand-story/generate-brandscript", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    try {
      const result = await generateBrandScript(clientId);
      res.json(result);
    } catch (err) { console.error("Generate BrandScript error:", err); res.status(500).json({ error: "BrandScript generation failed" }); }
  });

  // Regenerate a single section
  router.post("/clients/:clientId/brand-story/regenerate-section", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const { sectionKey, additionalContext } = req.body;
    if (!sectionKey) { res.status(400).json({ error: "sectionKey required" }); return; }
    try {
      const result = await regenerateBrandStorySection(clientId, sectionKey, additionalContext);
      res.json(result);
    } catch (err) { console.error("Regenerate section error:", err); res.status(500).json({ error: "Section regeneration failed" }); }
  });

  // Update a single section (manual edit)
  router.put("/brand-story/:id/section", async (req, res) => {
    const { sectionKey, content } = req.body;
    if (!sectionKey || content === undefined) { res.status(400).json({ error: "sectionKey and content required" }); return; }
    try {
      // Get the story to find clientId
      const { rows: storyRows } = await query("SELECT client_id FROM cm_brand_story WHERE id = $1", [req.params.id]);
      if (!storyRows[0]) { res.status(404).json({ error: "Brand story not found" }); return; }
      const result = await updateBrandStorySection(storyRows[0].client_id, sectionKey, content);
      res.json(result);
    } catch (err) { console.error("Update section error:", err); res.status(500).json({ error: "Section update failed" }); }
  });

  // Update brand story status
  router.put("/brand-story/:id/status", async (req, res) => {
    const { status } = req.body;
    if (!status || !["draft", "generated", "reviewed", "approved"].includes(status)) {
      res.status(400).json({ error: "Invalid status" }); return;
    }
    try {
      const { rows } = await query("UPDATE cm_brand_story SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, req.params.id]);
      res.json(rows[0] ? toCamel(rows[0]) : null);
    } catch (err) { console.error("Update status error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // ════════════════════════════════════════════════════════
  //  CONTENT SUGGESTIONS — parsed from Big 5 + TAYA brand story sections
  // ════════════════════════════════════════════════════════

  /**
   * GET /clients/:clientId/brand-story/freshness
   * Returns whether the brand story is up-to-date relative to client data
   * (services, personas, content guide, basic client info).
   * Used to display a "refresh" banner when source data has changed.
   */
  router.get("/clients/:clientId/brand-story/freshness", async (req, res) => {
    const clientId = parseInt(String(req.params.clientId));
    try {
      // Get brand story generation timestamp
      const { rows: storyRows } = await query(
        "SELECT generated_at, updated_at, status FROM cm_brand_story WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1",
        [clientId]
      );
      if (!storyRows[0] || !storyRows[0].generated_at) {
        res.json({ hasStory: false, isStale: false, changes: [] });
        return;
      }
      const generatedAt = new Date(storyRows[0].generated_at);

      // Check timestamps from related tables
      const [clientRes, servicesRes, personasRes, guidelineRes, competitorsRes] = await Promise.all([
        query("SELECT updated_at FROM cm_clients WHERE id = $1", [clientId]),
        query("SELECT MAX(updated_at) AS max_at, COUNT(*) AS cnt FROM cm_services WHERE client_id = $1", [clientId]),
        query("SELECT MAX(updated_at) AS max_at, COUNT(*) AS cnt FROM cm_buyer_personas WHERE client_id = $1", [clientId]),
        query("SELECT updated_at FROM cm_content_guidelines WHERE client_id = $1", [clientId]),
        query("SELECT MAX(updated_at) AS max_at, COUNT(*) AS cnt FROM cm_competitors WHERE client_id = $1", [clientId]),
      ]);

      const changes: Array<{ source: string; changedAt: string; type: "newer" | "added" }> = [];

      const clientUpdatedAt = clientRes.rows[0]?.updated_at;
      if (clientUpdatedAt && new Date(clientUpdatedAt) > generatedAt) {
        changes.push({ source: "Client info", changedAt: clientUpdatedAt, type: "newer" });
      }

      const servicesMax = servicesRes.rows[0]?.max_at;
      if (servicesMax && new Date(servicesMax) > generatedAt) {
        changes.push({ source: "Services", changedAt: servicesMax, type: "newer" });
      }

      const personasMax = personasRes.rows[0]?.max_at;
      if (personasMax && new Date(personasMax) > generatedAt) {
        changes.push({ source: "Buyer personas", changedAt: personasMax, type: "newer" });
      }

      const guidelineUpdatedAt = guidelineRes.rows[0]?.updated_at;
      if (guidelineUpdatedAt && new Date(guidelineUpdatedAt) > generatedAt) {
        changes.push({ source: "Content guidelines", changedAt: guidelineUpdatedAt, type: "newer" });
      }

      const competitorsMax = competitorsRes.rows[0]?.max_at;
      if (competitorsMax && new Date(competitorsMax) > generatedAt) {
        changes.push({ source: "Competitors", changedAt: competitorsMax, type: "newer" });
      }

      // Age check: stale after 90 days regardless
      const ageMs = Date.now() - generatedAt.getTime();
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      const ageStale = ageDays > 90;

      res.json({
        hasStory: true,
        generatedAt: storyRows[0].generated_at,
        ageDays,
        ageStale,
        isStale: changes.length > 0 || ageStale,
        changes,
        changeCount: changes.length,
      });
    } catch (err) {
      console.error("Brand story freshness error:", err);
      res.status(500).json({ error: "Failed to compute freshness" });
    }
  });

  /**
   * GET /clients/:clientId/content-suggestions
   * Parses Big 5 article titles + TAYA questions from the client's brand story
   * and returns structured content suggestions ready to add to the planning sheet.
   * Accepts either numeric client ID or slug.
   */
  router.get("/clients/:clientId/content-suggestions", async (req, res) => {
    const param = String(req.params.clientId);
    let clientId: number;
    try {
      if (/^\d+$/.test(param)) {
        clientId = parseInt(param);
      } else {
        const { rows: r } = await query("SELECT id FROM cm_clients WHERE slug = $1", [param]);
        if (!r[0]) { res.status(404).json({ error: "Client not found" }); return; }
        clientId = r[0].id;
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to resolve client" });
      return;
    }
    try {
      const { rows } = await query(
        "SELECT big_five_section, taya_questions, endless_customers_section FROM cm_brand_story WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1",
        [clientId]
      );
      if (!rows[0]) {
        res.json({ articles: [], questions: [], hasGenerated: false });
        return;
      }

      const story = rows[0] as Record<string, unknown>;
      const articles = parseBigFiveArticles(extractContent(story.big_five_section));
      const questions = parseTayaQuestions(extractContent(story.taya_questions));

      res.json({
        articles,
        questions,
        hasGenerated: !!(story.big_five_section || story.taya_questions),
        bigFiveTotal: articles.length,
        tayaTotal: questions.length,
      });
    } catch (err) {
      console.error("Content suggestions error:", err);
      res.status(500).json({ error: "Failed to load content suggestions" });
    }
  });

  /**
   * POST /clients/:clientId/content-suggestions/add-to-tracking
   * Body: { suggestions: [{ title, type, primaryKeyword?, category? }] }
   * Adds selected suggestions to the planning sheet's "New Content Tracking" tab.
   * If the planning_sheets row doesn't exist for this client+tab, creates it.
   */
  router.post("/clients/:clientId/content-suggestions/add-to-tracking", async (req, res) => {
    const clientSlug = req.params.clientId; // can be slug or id — try both
    const suggestions: Array<{ title: string; type?: string; primaryKeyword?: string; category?: string }> = req.body.suggestions || [];
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      res.status(400).json({ error: "suggestions array required" });
      return;
    }
    try {
      // Resolve to slug if numeric id was passed
      let slug = clientSlug;
      if (/^\d+$/.test(clientSlug)) {
        const { rows } = await query("SELECT slug FROM cm_clients WHERE id = $1", [clientSlug]);
        if (!rows[0]) { res.status(404).json({ error: "Client not found" }); return; }
        slug = rows[0].slug;
      }

      const tabName = "New Content Tracking";
      const headers = ["Service Topic", "Scheduled (m/yyyy)", "Type", "Title (<65 Characters)", "Article Description", "Focus SEO Keyword(s)", "URL Handle", "Standard PR Sources", "Advanced PR Sources", "Assigned To", "Completed", "Info Added to Topical Sitemap", "Notes"];

      // Find or create the planning sheet
      const { rows: sheetRows } = await query(
        `INSERT INTO planning_sheets (client_slug, tab_name, headers)
         VALUES ($1, $2, $3)
         ON CONFLICT (client_slug, tab_name) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [slug, tabName, JSON.stringify(headers)]
      );
      const sheetId = sheetRows[0].id;

      // Get current max row_index
      const { rows: maxRows } = await query(
        "SELECT COALESCE(MAX(row_index), -1) AS max_idx FROM planning_rows WHERE sheet_id = $1",
        [sheetId]
      );
      let nextIdx = (maxRows[0]?.max_idx ?? -1) + 1;

      // Insert each suggestion as a new row
      const inserted = [];
      for (const s of suggestions) {
        const data = {
          "Service Topic": s.category || "",
          "Scheduled (m/yyyy)": "",
          "Type": s.type || "Standard Article",
          "Title (<65 Characters)": s.title || "",
          "Article Description": "",
          "Focus SEO Keyword(s)": s.primaryKeyword || "",
          "URL Handle": s.title ? s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) : "",
          "Standard PR Sources": "",
          "Advanced PR Sources": "",
          "Assigned To": "",
          "Completed": "",
          "Info Added to Topical Sitemap": "",
          "Notes": "Suggested from Brand Strategy (Big 5)",
        };
        const { rows: r } = await query(
          "INSERT INTO planning_rows (sheet_id, row_index, data) VALUES ($1, $2, $3) RETURNING id",
          [sheetId, nextIdx++, JSON.stringify(data)]
        );
        inserted.push(r[0].id);
      }

      res.json({ added: inserted.length, sheetId, slug });
    } catch (err) {
      console.error("Add suggestions to tracking error:", err);
      res.status(500).json({ error: "Failed to add suggestions" });
    }
  });

  // ════════════════════════════════════════════════════════
  //  POPULATE SERVICE FROM BRAND STORY
  // ════════════════════════════════════════════════════════

  router.post("/clients/:clientId/services/populate-from-brand-story", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const { serviceName, category } = req.body;
    if (!serviceName) { res.status(400).json({ error: "serviceName is required" }); return; }

    try {
      // Fetch brand story
      const { rows: storyRows } = await query(
        "SELECT hero_section, problem_section, guide_section, plan_section, success_section, failure_section FROM cm_brand_story WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1",
        [clientId]
      );
      if (!storyRows[0]) { res.status(404).json({ error: "No brand story found. Generate a brand story first." }); return; }

      // Fetch client info for context
      const { rows: clientRows } = await query(
        "SELECT company_name, industry, location FROM cm_clients WHERE id = $1", [clientId]
      );
      const client = clientRows[0] || {};
      const story = storyRows[0];

      // Build context from brand story sections
      const sections: string[] = [];
      const sectionNames: Record<string, string> = {
        hero_section: "Your Customer",
        problem_section: "The Problem You Solve",
        guide_section: "Why You (Your Authority)",
        plan_section: "Your Process",
        success_section: "The Transformation",
        failure_section: "What's at Stake",
      };
      for (const [col, title] of Object.entries(sectionNames)) {
        const data = story[col];
        if (data) {
          const content = typeof data === "string" ? data : (data.content || JSON.stringify(data));
          sections.push(`### ${title}\n${content}`);
        }
      }

      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic();

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `You are helping a marketing agency populate service details for one specific service, based on the company's existing Brand Story.

## Company
- Name: ${client.company_name || "Unknown"}
- Industry: ${client.industry || "Unknown"}
- Location: ${client.location || "Unknown"}

## Brand Story
${sections.join("\n\n")}

## Service to Populate
- Service Name: ${serviceName}
- Category: ${category || "General"}

Based on the brand story above, generate service-specific content for "${serviceName}". Adapt the brand story themes to focus specifically on this service. Be specific and practical, not generic.

Return a JSON object with these fields:
{
  "description": "One-sentence summary of the service (under 150 chars)",
  "descriptionLong": "2-3 paragraph detailed description of this service, what it involves, who it helps",
  "idealPatientProfile": "Who is the ideal client for THIS specific service? Demographics, situations, needs",
  "goodFitCriteria": "Bullet-pointed list of signs someone is a good fit for this service",
  "notGoodFitCriteria": "Bullet-pointed list of signs this service isn't the right fit",
  "differentiators": "What makes this company's version of this service unique vs competitors",
  "expectedOutcomes": "Specific results/outcomes clients can expect from this service",
  "commonConcerns": "Common questions, objections, or concerns prospects have about this service and how to address them"
}

Return ONLY the JSON object, no markdown fences.`
        }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      // Parse JSON — strip markdown fences if present
      const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      const fields = JSON.parse(cleaned);

      res.json(fields);
    } catch (err) {
      console.error("Populate from brand story error:", err);
      res.status(500).json({ error: "Failed to populate service from brand story" });
    }
  });

  // ════════════════════════════════════════════════════════
  //  AI IMPORT — bulk document extraction + enrichment
  // ════════════════════════════════════════════════════════

  router.post("/clients/:clientId/import", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const { documentIds, generateStory, enrichFromWeb } = req.body;
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      res.status(400).json({ error: "documentIds array is required" }); return;
    }
    try {
      const authService = new GoogleAuthService();
      if (!authService.isAuthenticated()) {
        res.status(503).json({ error: "Google Drive not configured — cannot read documents" }); return;
      }
      const driveService = new GoogleDriveService(authService.getClient());
      const result = await importClientData(clientId, documentIds, driveService, {
        generateStory: generateStory !== false,
        enrichFromWeb: enrichFromWeb !== false,
      });
      res.json(result);
    } catch (err) {
      console.error("Import client data error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Import failed" });
    }
  });

  // ════════════════════════════════════════════════════════
  //  MARKET INTELLIGENCE (DataForSEO)
  // ════════════════════════════════════════════════════════

  router.get("/clients/:clientId/market-intel", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    try {
      // Get client domain
      const clientRes = await query("SELECT company_website, domain FROM cm_clients WHERE id = $1", [clientId]);
      if (!clientRes.rows[0]) { res.status(404).json({ error: "Client not found" }); return; }
      let domain = clientRes.rows[0].domain || clientRes.rows[0].company_website || "";
      domain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
      if (!domain) { res.json({ error: "No domain configured for this client" }); return; }

      const seo = new DataForSEOService();
      if (!seo.isAuthenticated()) { res.json({ error: "DataForSEO not configured" }); return; }

      // Pull all three in parallel
      const [overview, keywords, competitors] = await Promise.all([
        seo.getDomainOverview(domain).catch(() => null),
        seo.getDomainRankedKeywords(domain, undefined, 30).catch(() => []),
        seo.getDomainCompetitors(domain, undefined, 10).catch(() => []),
      ]);

      res.json({ domain, overview, keywords, competitors });
    } catch (err) {
      console.error("Market intel error:", err);
      res.status(500).json({ error: "Failed to fetch market intelligence" });
    }
  });

  // ════════════════════════════════════════════════════════
  //  DISCOVERY CALL TRANSCRIPT INGEST
  // ════════════════════════════════════════════════════════

  /**
   * POST /clients/:clientId/transcript-ingest
   * Body: { transcript: string } — full text of a discovery call transcript
   * Uses Claude to extract intake-style fields and updates the client profile.
   * Returns: { extracted: Record<string, string>, fieldsUpdated: number, entitiesCreated: Record<string, number> }
   */
  router.post("/clients/:clientId/transcript-ingest", async (req, res) => {
    const clientId = parseInt(String(req.params.clientId));
    const { transcript } = req.body as { transcript?: string };
    if (!transcript || transcript.trim().length < 50) {
      res.status(400).json({ error: "transcript is required (at least 50 characters)" });
      return;
    }

    try {
      // Get client info for context
      const { rows: clientRows } = await query("SELECT company_name, industry FROM cm_clients WHERE id = $1", [clientId]);
      if (!clientRows[0]) { res.status(404).json({ error: "Client not found" }); return; }
      const clientName = clientRows[0].company_name || "Unknown";
      const industry = clientRows[0].industry || "Unknown";

      // Use Claude to extract structured data from the transcript
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const anthropic = new Anthropic();

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: `You are an expert at extracting structured business data from discovery call transcripts. The client is ${clientName} in the ${industry} industry.

Extract as many fields as possible from the transcript. Return a JSON object with these fields (omit any that can't be confidently extracted):

{
  "companyBackground": "How the company was started / founding story",
  "missionStatement": "Company mission / purpose statement",
  "coreValues": "Core values mentioned",
  "uniqueSellingPoints": "What makes them unique / USPs / differentiators",
  "guarantees": "Guarantees or pledges mentioned",
  "targetAudience": "Description of ideal customers",
  "painPoints": "Customer pain points discussed",
  "services": ["Service 1", "Service 2", ...],
  "serviceAreas": "Cities/regions they serve",
  "competitors": ["Competitor 1", "Competitor 2", ...],
  "testimonialQuotes": ["Direct client quote 1", "Quote 2", ...],
  "topQuestionsCustomersAsk": ["Question 1", "Question 2", ...],
  "marketingGoals": "Their marketing goals discussed",
  "currentChallenges": "Current business challenges",
  "brandVoice": "How they want to sound / their personality",
  "pricing": "Pricing information mentioned",
  "demographics": "Demographic info about their clients"
}

Only include fields where you can extract real data. Be specific — use actual names, numbers, and details from the transcript. Do not fabricate.`,
        messages: [{ role: "user", content: `Here is the discovery call transcript:\n\n${transcript.slice(0, 30000)}` }],
      });

      // Parse Claude's response
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      let extracted: Record<string, unknown> = {};
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
      } catch { /* parse failed */ }

      if (Object.keys(extracted).length === 0) {
        res.status(500).json({ error: "Failed to extract data from transcript. Please try again." });
        return;
      }

      // Apply extracted data to client profile
      let fieldsUpdated = 0;
      const entitiesCreated: Record<string, number> = {};

      // Update cm_clients direct fields
      const clientUpdates: Record<string, string> = {};
      if (extracted.companyBackground && typeof extracted.companyBackground === "string") { clientUpdates.company_background = extracted.companyBackground; fieldsUpdated++; }
      if (extracted.missionStatement && typeof extracted.missionStatement === "string") { clientUpdates.mission_statement = extracted.missionStatement; fieldsUpdated++; }
      if (extracted.coreValues && typeof extracted.coreValues === "string") { clientUpdates.core_values = extracted.coreValues; fieldsUpdated++; }
      if (extracted.targetAudience && typeof extracted.targetAudience === "string") { clientUpdates.demographics_pain_points = extracted.painPoints as string || ""; fieldsUpdated++; }
      if (extracted.brandVoice && typeof extracted.brandVoice === "string") { clientUpdates.what_makes_us_unique = extracted.uniqueSellingPoints as string || ""; fieldsUpdated++; }

      if (Object.keys(clientUpdates).length > 0) {
        const sets = Object.keys(clientUpdates).map((k, i) => `${k} = COALESCE(NULLIF($${i + 2}, ''), ${k})`);
        await query(
          `UPDATE cm_clients SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $1`,
          [clientId, ...Object.values(clientUpdates)]
        );
      }

      // Update content guidelines if USPs / voice extracted
      if (extracted.uniqueSellingPoints || extracted.brandVoice) {
        const guideUpdates: Record<string, string> = {};
        if (extracted.uniqueSellingPoints) guideUpdates.unique_selling_points = String(extracted.uniqueSellingPoints);
        if (extracted.brandVoice) guideUpdates.brand_voice = String(extracted.brandVoice);

        const { rows: existingGuide } = await query("SELECT id FROM cm_content_guidelines WHERE client_id = $1", [clientId]);
        if (existingGuide.length > 0) {
          const sets = Object.keys(guideUpdates).map((k, i) => `${k} = COALESCE(NULLIF($${i + 2}, ''), ${k})`);
          await query(`UPDATE cm_content_guidelines SET ${sets.join(", ")}, updated_at = NOW() WHERE client_id = $1`,
            [clientId, ...Object.values(guideUpdates)]);
        } else {
          const cols = ["client_id", ...Object.keys(guideUpdates)];
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
          await query(`INSERT INTO cm_content_guidelines (${cols.join(", ")}) VALUES (${placeholders})`,
            [clientId, ...Object.values(guideUpdates)]);
        }
        fieldsUpdated += Object.keys(guideUpdates).length;
      }

      // Create services if extracted
      if (Array.isArray(extracted.services)) {
        let count = 0;
        for (const svc of extracted.services) {
          if (typeof svc !== "string" || !svc.trim()) continue;
          const { rows: existing } = await query(
            "SELECT 1 FROM cm_services WHERE client_id = $1 AND service_name = $2 LIMIT 1",
            [clientId, svc.trim()]
          );
          if (existing.length === 0) {
            await query(
              "INSERT INTO cm_services (client_id, service_name, category, source) VALUES ($1, $2, 'Primary', 'transcript')",
              [clientId, svc.trim()]
            );
            count++;
          }
        }
        if (count > 0) entitiesCreated.services = count;
      }

      // Create competitors if extracted
      if (Array.isArray(extracted.competitors)) {
        let count = 0;
        for (const comp of extracted.competitors) {
          if (typeof comp !== "string" || !comp.trim()) continue;
          const { rows: existing } = await query(
            "SELECT 1 FROM cm_competitors WHERE client_id = $1 AND company_name = $2 LIMIT 1",
            [clientId, comp.trim()]
          );
          if (existing.length === 0) {
            await query(
              "INSERT INTO cm_competitors (client_id, company_name, source) VALUES ($1, $2, 'transcript')",
              [clientId, comp.trim()]
            );
            count++;
          }
        }
        if (count > 0) entitiesCreated.competitors = count;
      }

      // Store top questions as intake_data for future brand story generation
      if (Array.isArray(extracted.topQuestionsCustomersAsk) && extracted.topQuestionsCustomersAsk.length > 0) {
        const { rows: storyRows } = await query(
          "SELECT id, intake_data FROM cm_brand_story WHERE client_id = $1 LIMIT 1", [clientId]
        );
        const existingIntake = (storyRows[0]?.intake_data as Record<string, unknown>) || {};
        existingIntake.topQuestionsCustomersAsk = (extracted.topQuestionsCustomersAsk as string[]).join("\n");
        if (storyRows[0]) {
          await query("UPDATE cm_brand_story SET intake_data = $1, updated_at = NOW() WHERE id = $2",
            [JSON.stringify(existingIntake), storyRows[0].id]);
        } else {
          await query("INSERT INTO cm_brand_story (client_id, status, intake_data) VALUES ($1, 'draft', $2)",
            [clientId, JSON.stringify(existingIntake)]);
        }
        fieldsUpdated++;
      }

      res.json({
        extracted,
        fieldsUpdated,
        entitiesCreated,
        transcriptLength: transcript.length,
      });
    } catch (err) {
      console.error("Transcript ingest error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Transcript ingest failed" });
    }
  });

  // ════════════════════════════════════════════════════════
  //  INTAKE TEMPLATE — Excel upload
  // ════════════════════════════════════════════════════════

  const intakeUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  router.post("/clients/:clientId/intake/upload", intakeUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
      const clientId = parseInt(String(req.params.clientId));
      if (isNaN(clientId)) { res.status(400).json({ error: "Invalid clientId" }); return; }

      const result = await importIntakeTemplate(clientId, req.file.buffer);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Intake import error:", err);
      res.status(500).json({ error: message });
    }
  });

  // ════════════════════════════════════════════════════════
  //  STRATEGY GENERATION
  // ════════════════════════════════════════════════════════

  // Get all strategy outputs
  router.get("/clients/:clientId/strategy", async (req, res) => {
    try {
      const { rows } = await query("SELECT * FROM cm_strategy WHERE client_id = $1", [req.params.clientId]);
      res.json(rows[0] ? toCamel(rows[0]) : null);
    } catch (err) { console.error("Get strategy error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // Generate individual strategy components
  router.post("/clients/:clientId/strategy/generate", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const { component, guidance } = req.body;
    const generators: Record<string, (id: number, guidance?: string) => Promise<any>> = {
      pillars: generateContentPillars, journey: generateCustomerJourney,
      plan: generateContentPlan, sprint: generateSprintPlan,
    };
    const gen = generators[component];
    if (!gen) { res.status(400).json({ error: "Invalid component" }); return; }
    // Fire and forget — respond immediately, generate in background
    res.json({ success: true, component, status: "generating" });
    gen(clientId, guidance || undefined)
      .then(() => console.log(`[strategy] ${component} generated for client ${clientId}`))
      .catch((err) => console.error(`[strategy] ${component} failed for client ${clientId}:`, err));
  });

  // Update individual strategy component (manual edits)
  router.put("/clients/:clientId/strategy/:component", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    const { component } = req.params;
    const columnMap: Record<string, string> = {
      pillars: "content_pillars", journey: "customer_journey",
      plan: "content_plan_12mo", sprint: "sprint_plan_90day",
    };
    const column = columnMap[component];
    if (!column) { res.status(400).json({ error: "Invalid component" }); return; }
    try {
      await query(
        `INSERT INTO cm_strategy (client_id, ${column}, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (client_id) DO UPDATE SET ${column} = $2, updated_at = NOW()`,
        [clientId, JSON.stringify(req.body.data)]
      );
      res.json({ success: true });
    } catch (err) { console.error("Update strategy error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // ════════════════════════════════════════════════════════
  //  CAMPAIGNS
  // ════════════════════════════════════════════════════════

  router.get("/campaigns", async (req, res) => {
    const clientId = req.query.clientId;
    try {
      const sql = clientId
        ? "SELECT c.*, cl.company_name as client_name FROM cm_campaigns c JOIN cm_clients cl ON c.client_id = cl.id WHERE c.client_id = $1 ORDER BY c.created_at DESC"
        : "SELECT c.*, cl.company_name as client_name FROM cm_campaigns c JOIN cm_clients cl ON c.client_id = cl.id ORDER BY c.created_at DESC";
      const { rows } = await query(sql, clientId ? [clientId] : []);
      res.json(rowsToCamel(rows));
    } catch (err) { console.error("List campaigns error:", err); res.status(500).json({ error: "Failed" }); }
  });

  router.post("/campaigns", async (req, res) => {
    const b = req.body;
    try {
      const { rows } = await query(
        `INSERT INTO cm_campaigns (client_id, campaign_name, campaign_type, status, platforms, budget, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [b.clientId, b.campaignName, b.campaignType, b.status || "planning", b.platforms, b.budget, b.notes, b.createdBy || 0]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { console.error("Create campaign error:", err); res.status(500).json({ error: "Failed" }); }
  });

  router.put("/campaigns/:id", async (req, res) => {
    const b = req.body;
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const [key, val] of Object.entries(b)) {
      if (key === "id" || key === "clientId" || val === undefined) continue;
      const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      fields.push(`${snakeKey} = $${i++}`);
      values.push(val);
    }
    if (fields.length === 0) { res.status(400).json({ error: "No fields" }); return; }
    fields.push("updated_at = NOW()");
    values.push(req.params.id);
    try {
      const { rows } = await query(`UPDATE cm_campaigns SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`, values);
      res.json(rows[0] ? toCamel(rows[0]) : null);
    } catch (err) { console.error("Update campaign error:", err); res.status(500).json({ error: "Failed" }); }
  });

  router.delete("/campaigns/:id", async (req, res) => {
    try {
      await query("DELETE FROM cm_campaigns WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { console.error("Delete campaign error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // Campaign deliverables by campaign (in addition to the by-client CRUD above)
  router.get("/campaigns/:campaignId/deliverables", async (req, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM cm_campaign_deliverables WHERE campaign_id = $1 ORDER BY sort_order, created_at",
        [req.params.campaignId]
      );
      res.json(rowsToCamel(rows));
    } catch (err) { console.error("List campaign deliverables error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // ════════════════════════════════════════════════════════
  //  TRAFFIC LIGHT SYSTEM
  // ════════════════════════════════════════════════════════

  // Departments
  router.get("/traffic-light/departments", async (_req, res) => {
    try {
      const { rows } = await query("SELECT * FROM cm_tl_departments ORDER BY sort_order, name");
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  router.post("/traffic-light/departments", async (req, res) => {
    const b = req.body;
    try {
      const { rows } = await query(
        "INSERT INTO cm_tl_departments (name, description, icon, color, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [b.name, b.description, b.icon, b.color, b.sortOrder || 0]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Metrics
  router.get("/traffic-light/departments/:deptId/metrics", async (req, res) => {
    try {
      const { rows } = await query("SELECT * FROM cm_tl_metrics WHERE department_id = $1 ORDER BY sort_order", [req.params.deptId]);
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  router.post("/traffic-light/metrics", async (req, res) => {
    const b = req.body;
    try {
      const { rows } = await query(
        "INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [b.departmentId, b.name, b.description, b.metricType || "core_performance", b.greenLabel, b.yellowLabel, b.redLabel]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Health entries
  router.get("/traffic-light/health", async (req, res) => {
    const { clientId, weekOf } = req.query;
    try {
      let sql = "SELECT h.*, d.name as department_name, d.icon, d.color FROM cm_tl_health_entries h JOIN cm_tl_departments d ON h.department_id = d.id WHERE 1=1";
      const params: unknown[] = [];
      let i = 1;
      if (clientId) { sql += ` AND h.client_id = $${i++}`; params.push(clientId); }
      if (weekOf) { sql += ` AND h.week_of = $${i++}`; params.push(weekOf); }
      sql += " ORDER BY d.sort_order";
      const { rows } = await query(sql, params);
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  router.post("/traffic-light/health", async (req, res) => {
    const entries = Array.isArray(req.body) ? req.body : [req.body];
    try {
      const results = [];
      for (const b of entries) {
        const { rows } = await query(
          `INSERT INTO cm_tl_health_entries (client_id, department_id, week_of, status, notes, metric_values, updated_by_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT ON CONSTRAINT cm_tl_health_unique_entry
           DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, metric_values = EXCLUDED.metric_values,
             updated_by_name = EXCLUDED.updated_by_name, updated_at = NOW()
           RETURNING *`,
          [b.clientId, b.departmentId, b.weekOf, b.status || "green", b.notes, b.metricValues ? JSON.stringify(b.metricValues) : null, b.updatedByName]
        );
        if (rows[0]) results.push(toCamel(rows[0]));
      }
      res.json(results);
    } catch (err) { console.error("Upsert health entries error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // Department update
  router.put("/traffic-light/departments/:id", async (req, res) => {
    const b = req.body;
    try {
      const sets: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (b.name !== undefined) { sets.push(`name = $${i++}`); params.push(b.name); }
      if (b.description !== undefined) { sets.push(`description = $${i++}`); params.push(b.description); }
      if (b.icon !== undefined) { sets.push(`icon = $${i++}`); params.push(b.icon); }
      if (b.color !== undefined) { sets.push(`color = $${i++}`); params.push(b.color); }
      if (b.sortOrder !== undefined) { sets.push(`sort_order = $${i++}`); params.push(b.sortOrder); }
      if (b.isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(b.isActive); }
      if (sets.length === 0) return res.json({ success: true });
      sets.push("updated_at = NOW()");
      params.push(req.params.id);
      const { rows } = await query(`UPDATE cm_tl_departments SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, params);
      res.json(toCamel(rows[0]));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Department delete
  router.delete("/traffic-light/departments/:id", async (req, res) => {
    try {
      await query("DELETE FROM cm_tl_departments WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Metric update
  router.put("/traffic-light/metrics/:id", async (req, res) => {
    const b = req.body;
    try {
      const sets: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (b.name !== undefined) { sets.push(`name = $${i++}`); params.push(b.name); }
      if (b.description !== undefined) { sets.push(`description = $${i++}`); params.push(b.description); }
      if (b.metricType !== undefined) { sets.push(`metric_type = $${i++}`); params.push(b.metricType); }
      if (b.unit !== undefined) { sets.push(`unit = $${i++}`); params.push(b.unit); }
      if (b.greenLabel !== undefined) { sets.push(`green_label = $${i++}`); params.push(b.greenLabel); }
      if (b.yellowLabel !== undefined) { sets.push(`yellow_label = $${i++}`); params.push(b.yellowLabel); }
      if (b.redLabel !== undefined) { sets.push(`red_label = $${i++}`); params.push(b.redLabel); }
      if (b.sortOrder !== undefined) { sets.push(`sort_order = $${i++}`); params.push(b.sortOrder); }
      if (b.isActive !== undefined) { sets.push(`is_active = $${i++}`); params.push(b.isActive); }
      if (sets.length === 0) return res.json({ success: true });
      sets.push("updated_at = NOW()");
      params.push(req.params.id);
      const { rows } = await query(`UPDATE cm_tl_metrics SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, params);
      res.json(toCamel(rows[0]));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Metric delete
  router.delete("/traffic-light/metrics/:id", async (req, res) => {
    try {
      await query("DELETE FROM cm_tl_metrics WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Playbooks
  router.get("/traffic-light/playbooks", async (_req, res) => {
    try {
      const { rows } = await query("SELECT p.*, d.name as department_name FROM cm_tl_playbooks p JOIN cm_tl_departments d ON p.department_id = d.id ORDER BY d.sort_order");
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Playbook upsert
  router.put("/traffic-light/playbooks/:departmentId", async (req, res) => {
    const b = req.body;
    const deptId = req.params.departmentId;
    try {
      const { rows: existing } = await query("SELECT id FROM cm_tl_playbooks WHERE department_id = $1", [deptId]);
      if (existing.length > 0) {
        const { rows } = await query(
          `UPDATE cm_tl_playbooks SET yellow_actions = $1, yellow_timeframe = $2, red_actions = $3, red_timeframe = $4,
           escalation_contacts = $5, notes = $6, updated_at = NOW() WHERE department_id = $7 RETURNING *`,
          [b.yellowActions, b.yellowTimeframe, b.redActions, b.redTimeframe, b.escalationContacts, b.notes, deptId]
        );
        res.json(toCamel(rows[0]));
      } else {
        const { rows } = await query(
          `INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [deptId, b.yellowActions, b.yellowTimeframe, b.redActions, b.redTimeframe, b.escalationContacts, b.notes]
        );
        res.json(toCamel(rows[0]));
      }
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Per-client department config — get ALL client department configs (for weekly check-in / roll-up)
  router.get("/traffic-light/client-departments", async (_req, res) => {
    try {
      const { rows } = await query(
        `SELECT cd.client_id, cd.department_id, cd.is_enabled FROM cm_tl_client_departments cd ORDER BY cd.client_id`
      );
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Per-client department config — get which departments are enabled for a specific client
  router.get("/traffic-light/client-departments/:clientId", async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT cd.*, d.name as department_name FROM cm_tl_client_departments cd
         JOIN cm_tl_departments d ON cd.department_id = d.id
         WHERE cd.client_id = $1 ORDER BY d.sort_order`,
        [req.params.clientId]
      );
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Per-client department config — bulk set (replace all for this client)
  router.put("/traffic-light/client-departments/:clientId", async (req, res) => {
    const clientId = req.params.clientId;
    const departments: { departmentId: number; isEnabled: boolean; notes?: string }[] = req.body.departments || [];
    try {
      // Upsert each department config
      for (const d of departments) {
        await query(
          `INSERT INTO cm_tl_client_departments (client_id, department_id, is_enabled, notes)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (client_id, department_id)
           DO UPDATE SET is_enabled = EXCLUDED.is_enabled, notes = EXCLUDED.notes, updated_at = NOW()`,
          [clientId, d.departmentId, d.isEnabled, d.notes || null]
        );
      }
      const { rows } = await query(
        `SELECT cd.*, d.name as department_name FROM cm_tl_client_departments cd
         JOIN cm_tl_departments d ON cd.department_id = d.id
         WHERE cd.client_id = $1 ORDER BY d.sort_order`,
        [clientId]
      );
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Per-client metric overrides — get for a client
  router.get("/traffic-light/client-metrics/:clientId", async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT cm.*, m.name as metric_name, m.department_id, m.green_label as default_green_label,
                m.yellow_label as default_yellow_label, m.red_label as default_red_label
         FROM cm_tl_client_metrics cm
         JOIN cm_tl_metrics m ON cm.metric_id = m.id
         WHERE cm.client_id = $1 ORDER BY m.department_id, m.sort_order`,
        [req.params.clientId]
      );
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Per-client metric overrides — upsert one override
  router.put("/traffic-light/client-metrics/:clientId/:metricId", async (req, res) => {
    const { clientId, metricId } = req.params;
    const b = req.body;
    try {
      const { rows } = await query(
        `INSERT INTO cm_tl_client_metrics (client_id, metric_id, green_label, yellow_label, red_label, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (client_id, metric_id)
         DO UPDATE SET green_label = EXCLUDED.green_label, yellow_label = EXCLUDED.yellow_label,
           red_label = EXCLUDED.red_label, notes = EXCLUDED.notes, updated_at = NOW()
         RETURNING *`,
        [clientId, metricId, b.greenLabel || null, b.yellowLabel || null, b.redLabel || null, b.notes || null]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Per-client metric overrides — delete (revert to global defaults)
  router.delete("/traffic-light/client-metrics/:clientId/:metricId", async (req, res) => {
    try {
      await query("DELETE FROM cm_tl_client_metrics WHERE client_id = $1 AND metric_id = $2",
        [req.params.clientId, req.params.metricId]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Action log — get
  router.get("/traffic-light/actions", async (req, res) => {
    const { clientId, healthEntryId, limit: lim } = req.query;
    try {
      let sql = "SELECT a.*, d.name as department_name FROM cm_tl_action_log a JOIN cm_tl_departments d ON a.department_id = d.id WHERE 1=1";
      const params: unknown[] = [];
      let i = 1;
      if (clientId) { sql += ` AND a.client_id = $${i++}`; params.push(clientId); }
      if (healthEntryId) { sql += ` AND a.health_entry_id = $${i++}`; params.push(healthEntryId); }
      sql += ` ORDER BY a.created_at DESC LIMIT $${i}`;
      params.push(lim ? Number(lim) : 50);
      const { rows } = await query(sql, params);
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Action log — create
  router.post("/traffic-light/actions", async (req, res) => {
    const b = req.body;
    try {
      const { rows } = await query(
        `INSERT INTO cm_tl_action_log (health_entry_id, client_id, department_id, action, action_type, completed_by_name, completed_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING *`,
        [b.healthEntryId, b.clientId, b.departmentId, b.action, b.actionType || "other", b.completedByName, b.notes]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // Client dashboard composite endpoint — all health data for one client in one call
  router.get("/traffic-light/client-dashboard", async (req, res) => {
    const { clientId, weekOf } = req.query;
    if (!clientId || !weekOf) return res.status(400).json({ error: "clientId and weekOf required" });
    try {
      // Calculate previous week
      const d = new Date(weekOf + "T12:00:00");
      d.setDate(d.getDate() - 7);
      const prevWeek = d.toISOString().slice(0, 10);

      const [depts, metrics, playbooks, current, previous, actions, clientDepts, clientMetrics] = await Promise.all([
        query("SELECT * FROM cm_tl_departments WHERE is_active = true ORDER BY sort_order, name"),
        query("SELECT * FROM cm_tl_metrics WHERE is_active = true ORDER BY department_id, sort_order"),
        query("SELECT p.*, d.name as department_name FROM cm_tl_playbooks p JOIN cm_tl_departments d ON p.department_id = d.id"),
        query("SELECT h.*, d.name as department_name, d.icon, d.color FROM cm_tl_health_entries h JOIN cm_tl_departments d ON h.department_id = d.id WHERE h.client_id = $1 AND h.week_of = $2 ORDER BY d.sort_order", [clientId, weekOf]),
        query("SELECT h.*, d.name as department_name FROM cm_tl_health_entries h JOIN cm_tl_departments d ON h.department_id = d.id WHERE h.client_id = $1 AND h.week_of = $2 ORDER BY d.sort_order", [clientId, prevWeek]),
        query("SELECT a.*, d.name as department_name FROM cm_tl_action_log a JOIN cm_tl_departments d ON a.department_id = d.id WHERE a.client_id = $1 ORDER BY a.created_at DESC LIMIT 20", [clientId]),
        query("SELECT cd.*, d.name as department_name FROM cm_tl_client_departments cd JOIN cm_tl_departments d ON cd.department_id = d.id WHERE cd.client_id = $1", [clientId]),
        query("SELECT cm.* FROM cm_tl_client_metrics cm WHERE cm.client_id = $1", [clientId]),
      ]);
      res.json({
        departments: rowsToCamel(depts.rows),
        metrics: rowsToCamel(metrics.rows),
        playbooks: rowsToCamel(playbooks.rows),
        currentEntries: rowsToCamel(current.rows),
        previousEntries: rowsToCamel(previous.rows),
        recentActions: rowsToCamel(actions.rows),
        clientDepartments: rowsToCamel(clientDepts.rows),
        clientMetricOverrides: rowsToCamel(clientMetrics.rows),
      });
    } catch (err) { console.error("Client dashboard error:", err); res.status(500).json({ error: "Failed" }); }
  });

  // Full traffic light config (departments + metrics + playbooks)
  router.get("/traffic-light/config", async (_req, res) => {
    try {
      const [depts, metrics, playbooks] = await Promise.all([
        query("SELECT * FROM cm_tl_departments ORDER BY sort_order, name"),
        query("SELECT * FROM cm_tl_metrics ORDER BY department_id, sort_order"),
        query("SELECT p.*, d.name as department_name FROM cm_tl_playbooks p JOIN cm_tl_departments d ON p.department_id = d.id"),
      ]);
      res.json({
        departments: rowsToCamel(depts.rows),
        metrics: rowsToCamel(metrics.rows),
        playbooks: rowsToCamel(playbooks.rows),
      });
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // ════════════════════════════════════════════════════════
  //  AGENCY TEAM
  // ════════════════════════════════════════════════════════

  router.get("/agency-team", async (_req, res) => {
    try {
      const { rows } = await query("SELECT * FROM cm_agency_team ORDER BY name");
      res.json(rowsToCamel(rows));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  router.post("/agency-team", async (req, res) => {
    const b = req.body;
    try {
      const { rows } = await query(
        "INSERT INTO cm_agency_team (name, email, phone, role, department, bio) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [b.name, b.email, b.phone, b.role, b.department, b.bio]
      );
      res.json(toCamel(rows[0]));
    } catch (err) { res.status(500).json({ error: "Failed" }); }
  });

  // ════════════════════════════════════════════════════════
  //  INTAKE DATA (onboarding responses)
  // ════════════════════════════════════════════════════════

  router.get("/clients/:clientId/intake", async (req, res) => {
    try {
      const { rows } = await query(
        "SELECT intake_data, intake_submitted_at, status FROM cm_brand_story WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1",
        [req.params.clientId]
      );
      if (!rows[0]) {
        res.json({ hasIntakeData: false, rawIntake: null, submittedAt: null, storyStatus: null });
        return;
      }
      res.json({
        hasIntakeData: !!rows[0].intake_data,
        rawIntake: rows[0].intake_data,
        submittedAt: rows[0].intake_submitted_at,
        storyStatus: rows[0].status,
        outlineFields: RESEARCH_OUTLINE_FIELDS,
      });
    } catch (err) { console.error("Get intake data error:", err); res.status(500).json({ error: "Failed to get intake data" }); }
  });

  return router;
}
