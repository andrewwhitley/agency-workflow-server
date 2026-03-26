/**
 * Client Management API routes — ported from Manus tRPC routers to Express REST.
 * Covers: clients, contacts, addresses, services, team members, competitors,
 * differentiators, buyer personas, important links, logins, content guidelines,
 * brand story, campaigns, campaign deliverables, marketing plan,
 * traffic light system, agency team, activity log.
 */

import { Router } from "express";
import { query } from "./database.js";
import { DataForSEOService } from "./dataforseo.js";
import { generateContentPillars, generateCustomerJourney, generateContentPlan, generateSprintPlan } from "./strategy-generator.js";
import { generateBrandStory, generateBrandScript, regenerateBrandStorySection, updateBrandStorySection } from "./brand-story-generator.js";
import { importClientData } from "./client-import.js";
import { GoogleDriveService } from "./google-drive.js";
import { GoogleAuthService } from "./google-auth.js";

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

  router.post("/clients", async (req, res) => {
    const b = req.body;
    if (!b.companyName) { res.status(400).json({ error: "companyName is required" }); return; }
    const slug = b.slug || b.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const { rows } = await query(
        `INSERT INTO cm_clients (slug, company_name, legal_name, dba_name, industry, location, domain, company_phone, company_email, company_website, business_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [slug, b.companyName, b.legalName, b.dbaName, b.industry, b.location, b.domain, b.companyPhone, b.companyEmail, b.companyWebsite, b.businessType, b.status || "active"]
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
      ];
      for (const [key, val] of Object.entries(b)) {
        const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        if (allowed.includes(snakeKey) && val !== undefined) {
          fields.push(`${snakeKey} = $${i++}`);
          values.push(val);
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
    const jsonFields = ["heroSection", "problemSection", "guideSection", "planSection", "ctaSection", "successSection", "failureSection", "brandVoiceSection", "visualIdentitySection", "contentStrategySection", "messagingSection", "implementationSection"];
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

  // Generate brand story using AI
  router.post("/clients/:clientId/brand-story/generate", async (req, res) => {
    const clientId = parseInt(req.params.clientId);
    try {
      const result = await generateBrandStory(clientId);
      res.json(result);
    } catch (err) { console.error("Generate brand story error:", err); res.status(500).json({ error: "Brand story generation failed" }); }
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

  // Playbooks
  router.get("/traffic-light/playbooks", async (_req, res) => {
    try {
      const { rows } = await query("SELECT p.*, d.name as department_name FROM cm_tl_playbooks p JOIN cm_tl_departments d ON p.department_id = d.id ORDER BY d.sort_order");
      res.json(rowsToCamel(rows));
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
      });
    } catch (err) { console.error("Get intake data error:", err); res.status(500).json({ error: "Failed to get intake data" }); }
  });

  return router;
}
