#!/usr/bin/env node
import "dotenv/config";
import path from "path";
/**
 * ═══════════════════════════════════════════════════════════════
 *  MCP Agency Workflow Server
 *  Express server with:
 *    • MCP endpoint at /mcp (Streamable HTTP / SSE)
 *    • Dashboard at /
 *    • REST API at /api/*
 *    • Google Drive integration + Knowledge Base
 *    • AI Agent conversations with persistent threads
 *  Deploy to Railway, Render, or any Node.js host.
 * ═══════════════════════════════════════════════════════════════
 */

import express from "express";
import cookieSession from "cookie-session";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { WorkflowEngine } from "./workflow-engine.js";
import { bridgeWorkflowsToMcp, bridgeKnowledgeToMcp, bridgeThreadsToMcp, bridgeTasksToMcp, bridgeMemoriesToMcp, bridgeContentFactoryToMcp, bridgeKeywordResearchToMcp } from "./mcp-bridge.js";
import { registerAgencyWorkflows } from "./agency-workflows.js";
import { getLoginPageHtml, getAccessDeniedHtml } from "./dashboard.js";
import { GoogleAuthService } from "./google-auth.js";
import { GoogleDriveService } from "./google-drive.js";
import { DocumentIndexer } from "./document-indexer.js";
import { KnowledgeBase } from "./knowledge-base.js";
import { SOPParser } from "./sop-parser.js";
import { ClientAgent } from "./client-agent.js";
import { DiscordBot } from "./discord-bot.js";
import { runMigrations, closePool, query as dbQuery } from "./database.js";
import { Scheduler, type JobExecutor } from "./scheduler.js";
import { streamChat } from "./chat-engine.js";
import { agentService } from "./agent-service.js";
import { threadService } from "./thread-service.js";
import { createScheduledJobSchema, updateScheduledJobSchema } from "./validation.js";
import { apiRouter } from "./api-routes.js";
import { clientManagementRouter } from "./client-management-routes.js";
import { DataForSEOService } from "./dataforseo.js";
import {
  rockService, scorecardService, issueService, meetingService, peopleAnalyzerService,
  isEosAdmin,
} from "./eos-service.js";
import { redactionMiddleware } from "./redaction.js";
import {
  getOAuth2Client,
  isOAuthConfigured,
  isEmailAllowed,
  requireAuth,
  type SessionUser,
} from "./oauth.js";
import { EnrichmentService } from "./enrichment-service.js";
import {
  isMcpOAuthConfigured,
  getProtectedResourceMetadata,
  getAuthorizationServerMetadata,
  handleAuthorize,
  handleAuthorizeApproval,
  handleToken,
  handleRegister,
  validateBearerToken,
} from "./mcp-auth.js";

const PORT = Number(process.env.PORT) || 3000;

function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret === "dev-secret-not-for-production") {
      console.error("FATAL: SESSION_SECRET must be set to a secure value in production.");
      process.exit(1);
    }
  }
}

async function main(): Promise<void> {
  // ─── 0. Environment Validation ──────────────────────
  validateEnv();

  // ─── 0b. Database ───────────────────────────────────
  if (process.env.DATABASE_URL) {
    console.log("Connecting to PostgreSQL...");
    await runMigrations();
    console.log("✓ Database ready");
  } else {
    console.log("⚠ DATABASE_URL not set — AI agents/threads features disabled");
  }

  // ─── 1. Workflow Engine ─────────────────────────────
  const engine = new WorkflowEngine();
  registerAgencyWorkflows(engine);

  console.log(`✓ ${engine.list().length} workflows registered:`);
  for (const wf of engine.list()) {
    console.log(`  • [${wf.category}] ${wf.name}`);
  }

  // ─── 2. Knowledge Base Services ─────────────────────
  const authService = new GoogleAuthService();
  const indexer = new DocumentIndexer();
  const knowledgeBase = new KnowledgeBase(indexer);
  const sopParser = new SOPParser();
  const clientAgent = new ClientAgent(indexer);

  console.log(`✓ Knowledge base loaded: ${indexer.getAll().length} documents, ${indexer.getClients().length} clients`);

  // ─── 2b. DataForSEO ──────────────────────────────────
  const seoService = new DataForSEOService();

  // ─── 3. Express App ────────────────────────────────
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // ─── 3b. Session middleware ───────────────────────
  app.use(
    cookieSession({
      name: "session",
      secret: process.env.SESSION_SECRET || "dev-secret-not-for-production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })
  );

  // ─── 3c. Rate limiting ──────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use("/api", apiLimiter);
  app.use("/api", (req: any, res: any, next: any) => {
    // Skip redaction for content-management routes (sheet data has arbitrary column names)
    if (req.path.startsWith("/content-management/")) return next();
    return (redactionMiddleware as any)(req, res, next);
  });

  // ─── 3d. Auth Routes (public) ────────────────────
  app.get("/auth/login", (_req, res) => {
    // If already logged in, redirect to dashboard
    if (isOAuthConfigured() && ((_req.session as any)?.user)) {
      res.redirect("/");
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.send(getLoginPageHtml());
  });

  app.get("/auth/google", (_req, res) => {
    if (!isOAuthConfigured()) {
      res.redirect("/");
      return;
    }
    const client = getOAuth2Client();
    const url = client.generateAuthUrl({
      access_type: "online",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });
    res.redirect(url);
  });

  app.get("/auth/google/callback", async (req, res) => {
    if (!isOAuthConfigured()) {
      res.redirect("/");
      return;
    }
    const code = req.query.code as string;
    if (!code) {
      res.redirect("/auth/login");
      return;
    }

    try {
      const client = getOAuth2Client();
      const { tokens } = await client.getToken(code);
      client.setCredentials(tokens);

      // Verify ID token and extract user info
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload()!;
      const email = payload.email!;

      // Check allow-list
      if (!isEmailAllowed(email)) {
        res.setHeader("Content-Type", "text/html");
        res.status(403).send(getAccessDeniedHtml(email));
        return;
      }

      // Set session
      const user: SessionUser = {
        email,
        name: payload.name || email,
        picture: payload.picture || "",
      };
      (req.session as any).user = user;

      res.redirect("/");
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.redirect("/auth/login");
    }
  });

  app.get("/auth/logout", (req, res) => {
    req.session = null;
    res.redirect("/auth/login");
  });

  // ─── 3d. Session status (public) ─────────────────
  app.get("/api/auth/me", (req, res) => {
    const user = (req.session as any)?.user as SessionUser | undefined;
    if (user) {
      res.json({ authenticated: true, user });
    } else {
      res.json({ authenticated: !isOAuthConfigured() });
    }
  });

  // ─── 3e. OAuth 2.1 for MCP (public, no session needed) ──
  if (isMcpOAuthConfigured()) {
    // Root well-known endpoints
    app.get("/.well-known/oauth-protected-resource", (_req, res) => {
      res.json(getProtectedResourceMetadata());
    });
    app.get("/.well-known/oauth-authorization-server", (_req, res) => {
      res.json(getAuthorizationServerMetadata());
    });
    // Path-specific well-known endpoints (RFC 9728 — inserted between host and path)
    app.get("/.well-known/oauth-protected-resource/*", (_req, res) => {
      res.json(getProtectedResourceMetadata());
    });
    app.get("/.well-known/oauth-authorization-server/*", (_req, res) => {
      res.json(getAuthorizationServerMetadata());
    });
    app.get("/oauth/authorize", handleAuthorize);
    app.post("/oauth/authorize", handleAuthorizeApproval);
    app.post("/oauth/token", handleToken);
    app.post("/oauth/register", handleRegister);
    console.log("✓ MCP OAuth 2.1 endpoints enabled");
  }

  // ─── 4. React app static assets (unprotected — JS/CSS/images) ──
  const clientDistPath = path.join(import.meta.dirname, "client-dist");
  app.use(express.static(clientDistPath));

  // ─── 5. REST API (for dashboard) ───────────────────

  // Public routes (no auth required)
  if (process.env.DATABASE_URL) {
    app.get("/api/public/brand-story/:token", async (req, res) => {
      try {
        const { rows: storyRows } = await dbQuery(
          `SELECT bs.*, c.company_name, c.industry FROM cm_brand_story bs
           JOIN cm_clients c ON c.id = bs.client_id
           WHERE bs.share_token = $1`, [req.params.token]
        );
        if (!storyRows[0]) { res.status(404).json({ error: "Brand story not found" }); return; }
        const row = storyRows[0];
        const { rows: personaRows } = await dbQuery(
          "SELECT * FROM cm_buyer_personas WHERE client_id = $1", [row.client_id]
        );
        const { rows: guideRows } = await dbQuery(
          "SELECT brand_colors FROM cm_content_guidelines WHERE client_id = $1", [row.client_id]
        );
        const toCamel = (r: Record<string, unknown>) => {
          const o: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
          return o;
        };
        res.json({
          story: toCamel(row),
          companyName: row.company_name,
          industry: row.industry,
          status: row.status,
          generatedAt: row.generated_at,
          buyerPersonas: personaRows.map(toCamel),
          brandColors: guideRows[0]?.brand_colors || null,
        });
      } catch (err) { console.error("Public brand story error:", err); res.status(500).json({ error: "Failed" }); }
    });

    // Public onboarding: verify client
    app.get("/api/public/onboarding/verify/:clientId", async (req, res) => {
      try {
        const param = req.params.clientId;
        const isNumeric = /^\d+$/.test(param);
        const { rows } = await dbQuery(
          isNumeric
            ? "SELECT id, slug, company_name FROM cm_clients WHERE id = $1"
            : "SELECT id, slug, company_name FROM cm_clients WHERE slug = $1",
          [isNumeric ? parseInt(param) : param]
        );
        if (!rows[0]) { res.json({ found: false }); return; }
        res.json({ found: true, companyName: rows[0].company_name, numericId: rows[0].id });
      } catch (err) { console.error("Public verify client error:", err); res.status(500).json({ error: "Failed" }); }
    });

    // Public onboarding: submit intake
    app.post("/api/public/onboarding/submit", async (req, res) => {
      try {
        const { intakeData, clientId, clientSlug } = req.body;
        if (!intakeData) { res.status(400).json({ error: "intakeData is required" }); return; }

        let resolvedClientId: number;

        if (clientId || clientSlug) {
          // Find existing client
          const lookup = clientId
            ? await dbQuery("SELECT id FROM cm_clients WHERE id = $1", [clientId])
            : await dbQuery("SELECT id FROM cm_clients WHERE slug = $1", [clientSlug]);
          if (!lookup.rows[0]) { res.status(404).json({ error: "Client not found" }); return; }
          resolvedClientId = lookup.rows[0].id;

          // Update client fields from intake data
          const updates: string[] = [];
          const vals: unknown[] = [];
          let idx = 1;
          const fieldMap: Record<string, string> = {
            companyName: "company_name",
            industry: "industry",
            location: "location",
            domain: "domain",
            companyWebsite: "company_website",
            companyPhone: "company_phone",
            companyEmail: "company_email",
            yearFounded: "year_founded",
            numberOfEmployees: "number_of_employees",
          };
          for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
            const val = intakeData[jsKey];
            if (val !== undefined && val !== null && val !== "") {
              updates.push(`${dbKey} = $${idx++}`);
              vals.push(val);
            }
          }
          if (updates.length > 0) {
            vals.push(resolvedClientId);
            await dbQuery(`UPDATE cm_clients SET ${updates.join(", ")} WHERE id = $${idx}`, vals);
          }
        } else {
          // Create new client
          const name = intakeData.companyName || "New Client";
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const { rows: newClient } = await dbQuery(
            `INSERT INTO cm_clients (slug, company_name, industry, location, domain, company_website, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'active') RETURNING id`,
            [slug, name, intakeData.industry || null, intakeData.location || null, intakeData.domain || null, intakeData.companyWebsite || null]
          );
          resolvedClientId = newClient[0].id;
        }

        // Upsert brand_story with intake_data
        const { rows: existing } = await dbQuery(
          "SELECT id FROM cm_brand_story WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1",
          [resolvedClientId]
        );
        if (existing[0]) {
          await dbQuery(
            "UPDATE cm_brand_story SET intake_data = $1, intake_submitted_at = NOW(), updated_at = NOW() WHERE id = $2",
            [JSON.stringify(intakeData), existing[0].id]
          );
        } else {
          await dbQuery(
            "INSERT INTO cm_brand_story (client_id, status, intake_data, intake_submitted_at) VALUES ($1, 'draft', $2, NOW())",
            [resolvedClientId, JSON.stringify(intakeData)]
          );
        }

        res.json({ success: true, clientId: resolvedClientId });
      } catch (err) { console.error("Public onboarding submit error:", err); res.status(500).json({ error: "Failed to submit onboarding" }); }
    });
  }

  // Temp: list + rebuild differentiators
  app.post("/api/admin/fix-diff", async (req, res) => {
    if (req.query.token !== "fix-2026") { res.status(403).json({ error: "Forbidden" }); return; }
    const { query: dbQuery } = await import("./database.js");
    const clientId = 1;
    const action = String(req.query.action || "list");
    if (action === "list") {
      const r = await dbQuery("SELECT id, category, title, LEFT(description, 80) as desc_preview FROM cm_differentiators WHERE client_id = $1 ORDER BY category", [clientId]);
      res.json({ count: r.rows.length, rows: r.rows });
    } else if (action === "rebuild") {
      await dbQuery("DELETE FROM cm_differentiators WHERE client_id = $1", [clientId]);
      const diffs: { cat: string; title: string; desc: string }[] = [
        { cat: "Approach", title: "Integrative East-West Medicine", desc: "Unique blend of Traditional Chinese Medicine with modern functional and naturopathic medicine under one roof" },
        { cat: "Approach", title: "Root-Cause Focus", desc: "Every treatment plan starts with finding the root cause — not masking symptoms with medications" },
        { cat: "Approach", title: "Non-Toxic Philosophy", desc: "All aesthetic treatments are minimally invasive and free of harsh chemicals — safe, gentle, results-driven" },
        { cat: "Approach", title: "Whole-Person Care", desc: "Treatments address mind, body, and spirit — internal health enhances external results" },
        { cat: "Service", title: "Comprehensive Service Range", desc: "Acupuncture, naturopathic medicine, BHRT, IV therapy, medical aesthetics, and hair restoration all in one practice" },
        { cat: "Service", title: "Personalized Treatment Plans", desc: "Every patient receives a custom protocol tailored to their unique health profile, goals, and lifestyle" },
        { cat: "Experience", title: "Award-Winning Practice", desc: "2x Natural Nutmeg 10Best Awards winner in Nursing, Naturopathic Medicine, and Acupuncture/TCM" },
        { cat: "Experience", title: "Multi-Disciplinary Team", desc: "6 specialists across naturopathic medicine, acupuncture, aesthetics, and women's health" },
        { cat: "Location", title: "Convenient Hamden Location", desc: "Centrally located at 2661 Whitney Ave, Hamden — serving the greater New Haven area with telemedicine options" },
      ];
      for (const d of diffs) {
        await dbQuery("INSERT INTO cm_differentiators (client_id, category, title, description) VALUES ($1,$2,$3,$4)", [clientId, d.cat, d.title, d.desc]);
      }
      res.json({ success: true, created: diffs.length });
    }
  });

  // Protect all /api routes except /api/auth/me and /api/public/*
  app.use("/api", requireAuth);

  app.get("/api/workflows", (_req, res) => {
    res.json(
      engine.list().map((w) => ({
        name: w.name,
        description: w.description,
        category: w.category,
        tags: w.tags,
        steps: w.steps.map((s) => ({ id: s.id, description: s.description })),
        inputs: w.inputs,
      }))
    );
  });

  app.get("/api/stats", (_req, res) => {
    res.json(engine.getStats());
  });

  app.get("/api/history", (_req, res) => {
    res.json(engine.getHistory());
  });

  app.post("/api/run/:name", async (req, res) => {
    const wf = engine.get(req.params.name);
    if (!wf) {
      res.status(404).json({ error: `Workflow "${req.params.name}" not found` });
      return;
    }
    const result = await engine.run(req.params.name, req.body || {});
    res.json(result);
  });

  // ─── 6. Auth Status Route ─────────────────────────

  app.get("/api/auth/status", (_req, res) => {
    res.json({
      connected: authService.isAuthenticated(),
      serviceEmail: authService.getServiceEmail(),
    });
  });

  // ─── 7. Google Drive Routes ────────────────────────

  app.get("/api/drive/folders", async (req, res) => {
    if (!authService.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated with Google Drive" });
      return;
    }
    try {
      const drive = new GoogleDriveService(authService.getClient());
      const parentId = req.query.parentId as string | undefined;
      const folders = await drive.listFolders(parentId);
      res.json(folders);
    } catch (err) {
      console.error("Drive folders error:", err);
      res.status(500).json({ error: "Failed to list folders" });
    }
  });

  app.get("/api/drive/files/:folderId", async (req, res) => {
    if (!authService.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated with Google Drive" });
      return;
    }
    try {
      const drive = new GoogleDriveService(authService.getClient());
      const files = await drive.listFiles(req.params.folderId);
      res.json(files);
    } catch (err) {
      console.error("Drive files error:", err);
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // ─── 8. Document Indexer Routes ────────────────────

  app.post("/api/index/sync", async (req, res) => {
    if (!authService.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated with Google Drive" });
      return;
    }
    try {
      const drive = new GoogleDriveService(authService.getClient());
      const folderId = req.body.folderId as string;
      if (!folderId) {
        res.status(400).json({ error: "folderId is required" });
        return;
      }
      const count = await indexer.indexFolder(folderId, drive);
      res.json({ success: true, indexed: count, total: indexer.getAll().length });
    } catch (err) {
      console.error("Index sync error:", err);
      res.status(500).json({ error: "Failed to sync documents" });
    }
  });

  app.get("/api/index/documents", (_req, res) => {
    const docs = indexer.getAll().map((d) => ({
      id: d.id,
      name: d.name,
      path: d.path,
      client: d.client,
      type: d.type,
      contentPreview: d.contentPreview,
      keywords: d.keywords,
      lastSyncedAt: d.lastSyncedAt,
    }));
    res.json(docs);
  });

  app.get("/api/index/clients", (_req, res) => {
    res.json(indexer.getClients());
  });

  // ─── 9. Knowledge Base Routes ──────────────────────

  app.get("/api/knowledge/search", (req, res) => {
    const query = (req.query.q as string) || "";
    const client = req.query.client as string | undefined;
    const type = req.query.type as "sop" | "client-doc" | undefined;
    const results = knowledgeBase.search(query, { client, type });
    res.json(
      results.map((r) => ({
        name: r.document.name,
        path: r.document.path,
        client: r.document.client,
        type: r.document.type,
        score: r.score,
        matchedTerms: r.matchedTerms,
        preview: r.document.contentPreview,
      }))
    );
  });

  // ─── 10. SOP Routes ───────────────────────────────

  app.get("/api/sops", (_req, res) => {
    const sops = knowledgeBase.getSOPs();
    res.json(
      sops.map((s) => ({
        id: s.id,
        name: s.name,
        client: s.client,
        path: s.path,
        contentPreview: s.contentPreview,
      }))
    );
  });

  app.get("/api/sops/:id/parsed", (req, res) => {
    const doc = indexer.getById(String(req.params.id));
    if (!doc || doc.type !== "sop") {
      res.status(404).json({ error: "SOP not found" });
      return;
    }
    const parsed = sopParser.parse(doc);
    res.json(parsed);
  });

  app.post("/api/sops/:id/register", (req, res) => {
    const doc = indexer.getById(String(req.params.id));
    if (!doc || doc.type !== "sop") {
      res.status(404).json({ error: "SOP not found" });
      return;
    }
    const parsed = sopParser.parse(doc);
    const workflow = sopParser.toWorkflow(parsed, doc.client || undefined);

    // Unregister if already exists, then register
    engine.unregister(workflow.name);
    engine.register(workflow);

    res.json({ success: true, workflowName: workflow.name, steps: parsed.steps.length });
  });

  // ─── 11. Client Agent Routes ──────────────────────

  app.get("/api/clients", (_req, res) => {
    const clients = indexer.getClients();
    const profiles = clients.map((name) => {
      const existing = clientAgent.getProfile(name);
      return existing || { name, documentCount: indexer.getByClient(name).length, sopCount: 0, brandVoice: [], goals: [], kpis: [], services: [], lastUpdated: "" };
    });
    res.json(profiles);
  });

  app.post("/api/clients/:name/build", (req, res) => {
    const clientName = req.params.name;
    const docs = indexer.getByClient(clientName);
    if (!docs.length) {
      res.status(404).json({ error: `No documents found for client "${clientName}"` });
      return;
    }
    const profile = clientAgent.buildProfile(clientName);
    res.json(profile);
  });

  app.post("/api/clients/:name/ask", (req, res) => {
    const clientName = req.params.name;
    const question = req.body.question as string;
    if (!question) {
      res.status(400).json({ error: "question is required" });
      return;
    }
    const result = clientAgent.answer(clientName, question);
    res.json(result);
  });

  // ─── 12. Discord Logs Route ─────────────────────────
  app.get("/api/discord/logs", (_req, res) => {
    let logs = discordBot.getChatLog();
    const channel = _req.query.channel as string | undefined;
    const type = _req.query.type as string | undefined;
    if (channel) {
      logs = logs.filter((l) => l.channelName === channel || l.channelId === channel);
    }
    if (type === "command" || type === "conversation") {
      logs = logs.filter((l) => l.type === type);
    }
    res.json(logs);
  });

  // ─── 12b. EOS Dashboard Routes ─────────────────────
  const EOS_FOLDER_ID = process.env.EOS_FOLDER_ID || "";

  const requireEosAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const email = (req.session as any)?.user?.email;
    if (!isEosAdmin(email)) { res.status(403).json({ error: "Admin access required" }); return; }
    next();
  };

  app.get("/api/eos/role", (req, res) => {
    const email = (req.session as any)?.user?.email;
    res.json({ admin: isEosAdmin(email), email: email || null });
  });

  app.get("/api/eos/files", async (_req, res) => {
    if (!authService.isAuthenticated() || !EOS_FOLDER_ID) {
      res.json({ files: [] }); return;
    }
    try {
      const drive = new GoogleDriveService(authService.getClient());
      const files = await drive.listFiles(EOS_FOLDER_ID);
      res.json({ files });
    } catch (err) { res.status(500).json({ error: "Failed to list EOS files" }); }
  });

  app.get("/api/eos/file/:fileId", async (req, res) => {
    if (!authService.isAuthenticated()) { res.status(401).json({ error: "Google Drive not connected" }); return; }
    try {
      const drive = new GoogleDriveService(authService.getClient());
      const content = await drive.readFile(req.params.fileId, req.query.mimeType as string || "application/vnd.google-apps.document");
      res.json({ content });
    } catch (err) { res.status(500).json({ error: "Failed to read EOS file" }); }
  });

  if (process.env.DATABASE_URL) {
    // Rocks
    app.get("/api/eos/rocks", async (req, res) => {
      try { res.json(await rockService.list(req.query.quarter as string)); }
      catch { res.status(500).json({ error: "Failed to load rocks" }); }
    });
    app.post("/api/eos/rocks", async (req, res) => {
      try { res.json(await rockService.create(req.body)); }
      catch { res.status(500).json({ error: "Failed to create rock" }); }
    });
    app.put("/api/eos/rocks/:id", async (req, res) => {
      try { res.json(await rockService.update(req.params.id, req.body)); }
      catch { res.status(500).json({ error: "Failed to update rock" }); }
    });
    app.delete("/api/eos/rocks/:id", async (req, res) => {
      try { await rockService.delete(req.params.id); res.json({ success: true }); }
      catch { res.status(500).json({ error: "Failed to delete rock" }); }
    });
    // Scorecard
    app.get("/api/eos/scorecard", async (_req, res) => {
      try { res.json(await scorecardService.listMetrics()); }
      catch { res.status(500).json({ error: "Failed to load scorecard" }); }
    });
    app.post("/api/eos/scorecard/metrics", async (req, res) => {
      try { res.json(await scorecardService.createMetric(req.body)); }
      catch { res.status(500).json({ error: "Failed to create metric" }); }
    });
    app.put("/api/eos/scorecard/metrics/:id", async (req, res) => {
      try { res.json(await scorecardService.updateMetric(req.params.id, req.body)); }
      catch { res.status(500).json({ error: "Failed to update metric" }); }
    });
    app.delete("/api/eos/scorecard/metrics/:id", async (req, res) => {
      try { await scorecardService.deleteMetric(req.params.id); res.json({ success: true }); }
      catch { res.status(500).json({ error: "Failed to delete metric" }); }
    });
    app.post("/api/eos/scorecard/entries", async (req, res) => {
      try { res.json(await scorecardService.addEntry(req.body)); }
      catch { res.status(500).json({ error: "Failed to add scorecard entry" }); }
    });
    // Issues (IDS)
    app.get("/api/eos/issues", async (req, res) => {
      try {
        const email = (req.session as any)?.user?.email;
        const cat = req.query.category as string;
        if (cat === "internal" && !isEosAdmin(email)) { res.status(403).json({ error: "Admin access required" }); return; }
        res.json(await issueService.list(cat, req.query.status as string));
      } catch { res.status(500).json({ error: "Failed to load issues" }); }
    });
    app.post("/api/eos/issues", async (req, res) => {
      try {
        const email = (req.session as any)?.user?.email;
        if (req.body.category === "internal" && !isEosAdmin(email)) { res.status(403).json({ error: "Admin access required" }); return; }
        res.json(await issueService.create(req.body));
      } catch { res.status(500).json({ error: "Failed to create issue" }); }
    });
    app.put("/api/eos/issues/:id", async (req, res) => {
      try { res.json(await issueService.update(req.params.id, req.body)); }
      catch { res.status(500).json({ error: "Failed to update issue" }); }
    });
    app.delete("/api/eos/issues/:id", async (req, res) => {
      try { await issueService.delete(req.params.id); res.json({ success: true }); }
      catch { res.status(500).json({ error: "Failed to delete issue" }); }
    });
    // Meetings
    app.get("/api/eos/meetings", async (_req, res) => {
      try { res.json(await meetingService.list()); }
      catch { res.status(500).json({ error: "Failed to load meetings" }); }
    });
    app.get("/api/eos/meetings/:id", async (req, res) => {
      try {
        const m = await meetingService.getById(req.params.id);
        m ? res.json(m) : res.status(404).json({ error: "Meeting not found" });
      } catch { res.status(500).json({ error: "Failed to load meeting" }); }
    });
    app.post("/api/eos/meetings", async (req, res) => {
      try {
        const email = (req.session as any)?.user?.email;
        res.json(await meetingService.create({ ...req.body, created_by: email }));
      } catch { res.status(500).json({ error: "Failed to create meeting" }); }
    });
    app.put("/api/eos/meetings/:id", async (req, res) => {
      try { res.json(await meetingService.update(req.params.id, req.body)); }
      catch { res.status(500).json({ error: "Failed to update meeting" }); }
    });
    app.delete("/api/eos/meetings/:id", async (req, res) => {
      try { await meetingService.delete(req.params.id); res.json({ success: true }); }
      catch { res.status(500).json({ error: "Failed to delete meeting" }); }
    });
    // People Analyzer (admin only)
    app.get("/api/eos/people", requireEosAdmin as any, async (req, res) => {
      try { res.json(await peopleAnalyzerService.list(req.query.quarter as string)); }
      catch { res.status(500).json({ error: "Failed to load people analyzer" }); }
    });
    app.post("/api/eos/people", requireEosAdmin as any, async (req, res) => {
      try {
        const email = (req.session as any)?.user?.email;
        res.json(await peopleAnalyzerService.upsert({ ...req.body, created_by: email }));
      } catch { res.status(500).json({ error: "Failed to save people analyzer" }); }
    });
    app.delete("/api/eos/people/:id", requireEosAdmin as any, async (req, res) => {
      try { await peopleAnalyzerService.delete(req.params.id); res.json({ success: true }); }
      catch { res.status(500).json({ error: "Failed to delete entry" }); }
    });
  }

  // ─── 12d. Sales / Enrichment Routes (admin-only) ───
  if (process.env.DATABASE_URL) {
    const enrichmentService = new EnrichmentService(seoService, authService);

    const requireSalesAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const email = (req.session as any)?.user?.email;
      if (!isEosAdmin(email)) { res.status(403).json({ error: "Admin access required" }); return; }
      next();
    };

    app.post("/api/sales/import", requireSalesAdmin as any, async (req, res) => {
      try {
        const { sheetId, tab } = req.body;
        if (!sheetId) { res.status(400).json({ error: "sheetId is required" }); return; }
        res.json(await enrichmentService.importFromSheet(sheetId, tab));
      } catch (err: any) { res.status(500).json({ error: err.message || "Import failed" }); }
    });

    app.get("/api/sales/prospects", requireSalesAdmin as any, async (req, res) => {
      try {
        res.json(await enrichmentService.listProspects({
          tier: req.query.tier as string,
          status: req.query.status as string,
          state: req.query.state as string,
          specialty: req.query.specialty as string,
          search: req.query.search as string,
          sort: req.query.sort as string,
          order: req.query.order as "asc" | "desc",
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        }));
      } catch (err: any) { res.status(500).json({ error: err.message || "Failed to list prospects" }); }
    });

    app.get("/api/sales/prospects/:id", requireSalesAdmin as any, async (req, res) => {
      try {
        const prospect = await enrichmentService.getProspect(req.params.id);
        if (!prospect) { res.status(404).json({ error: "Prospect not found" }); return; }
        res.json(prospect);
      } catch (err: any) { res.status(500).json({ error: err.message || "Failed to get prospect" }); }
    });

    app.get("/api/sales/stats", requireSalesAdmin as any, async (_req, res) => {
      try { res.json(await enrichmentService.getStats()); }
      catch (err: any) { res.status(500).json({ error: err.message || "Failed to get stats" }); }
    });

    app.post("/api/sales/enrich/start", requireSalesAdmin as any, async (req, res) => {
      try {
        res.json(await enrichmentService.startEnrichment(req.body));
      } catch (err: any) { res.status(500).json({ error: err.message || "Failed to start enrichment" }); }
    });

    app.post("/api/sales/enrich/backfill", requireSalesAdmin as any, async (req, res) => {
      try {
        res.json(await enrichmentService.startBackfill(req.body));
      } catch (err: any) { res.status(500).json({ error: err.message || "Failed to start backfill" }); }
    });

    app.post("/api/sales/enrich/pause", requireSalesAdmin as any, async (_req, res) => {
      try { await enrichmentService.pauseEnrichment(); res.json({ success: true }); }
      catch (err: any) { res.status(500).json({ error: err.message || "Failed to pause" }); }
    });

    app.post("/api/sales/enrich/resume", requireSalesAdmin as any, async (_req, res) => {
      try { await enrichmentService.resumeEnrichment(); res.json({ success: true }); }
      catch (err: any) { res.status(500).json({ error: err.message || "Failed to resume" }); }
    });

    app.post("/api/sales/enrich/cancel", requireSalesAdmin as any, async (_req, res) => {
      try { await enrichmentService.cancelEnrichment(); res.json({ success: true }); }
      catch (err: any) { res.status(500).json({ error: err.message || "Failed to cancel" }); }
    });

    // SSE progress stream
    app.get("/api/sales/enrich/status", requireSalesAdmin as any, (req, res) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const onProgress = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      enrichmentService.getProgressEmitter().on("progress", onProgress);
      req.on("close", () => {
        enrichmentService.getProgressEmitter().off("progress", onProgress);
      });
    });

    app.get("/api/sales/enrich/runs", requireSalesAdmin as any, async (_req, res) => {
      try { res.json(await enrichmentService.getEnrichmentRuns()); }
      catch (err: any) { res.status(500).json({ error: err.message || "Failed to get runs" }); }
    });

    app.post("/api/sales/export", requireSalesAdmin as any, async (req, res) => {
      try {
        const { sheetId, tier } = req.body;
        if (!sheetId) { res.status(400).json({ error: "sheetId is required" }); return; }
        res.json(await enrichmentService.exportToSheet(sheetId, { tier }));
      } catch (err: any) { res.status(500).json({ error: err.message || "Export failed" }); }
    });
  }

  // ─── 12c. AI Agent Routes ──────────────────────────
  if (process.env.DATABASE_URL) {
    // Higher body limit for file/image uploads in chat
    app.use("/api/threads", express.json({ limit: "25mb" }));
    app.use("/api", apiRouter(engine, knowledgeBase, authService, seoService));
    app.use("/api/cm", clientManagementRouter());

    // Marketing Guides CRUD
    const guideToCamel = (row: Record<string, unknown>) => {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
      return o;
    };
    app.get("/api/guides/categories", async (_req, res) => {
      try {
        const { rows } = await dbQuery("SELECT * FROM guide_categories ORDER BY sort_order, name");
        res.json(rows.map(guideToCamel));
      } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
    });
    app.post("/api/guides/categories", async (req, res) => {
      const { name, description, icon, parentId } = req.body;
      try {
        const { rows } = await dbQuery(
          "INSERT INTO guide_categories (name, description, icon, parent_id) VALUES ($1, $2, $3, $4) RETURNING *",
          [name, description, icon, parentId || null]
        );
        res.json(guideToCamel(rows[0]));
      } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
    });

    app.get("/api/guides", async (req, res) => {
      try {
        const { status, categoryId, search } = req.query;
        let sql = "SELECT g.*, c.name as category_name, c.icon as category_icon FROM marketing_guides g LEFT JOIN guide_categories c ON c.id = g.category_id WHERE 1=1";
        const params: unknown[] = [];
        let i = 1;
        if (status) { sql += ` AND g.status = $${i++}`; params.push(status); }
        if (categoryId) { sql += ` AND g.category_id = $${i++}`; params.push(categoryId); }
        if (search) { sql += ` AND (g.title ILIKE $${i} OR g.description ILIKE $${i} OR g.tags ILIKE $${i})`; params.push(`%${search}%`); i++; }
        sql += " ORDER BY g.updated_at DESC";
        const { rows } = await dbQuery(sql, params);
        res.json(rows.map(guideToCamel));
      } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
    });
    app.get("/api/guides/:id", async (req, res) => {
      try {
        const { rows } = await dbQuery(
          "SELECT g.*, c.name as category_name, c.icon as category_icon FROM marketing_guides g LEFT JOIN guide_categories c ON c.id = g.category_id WHERE g.id = $1",
          [req.params.id]
        );
        if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
        res.json(guideToCamel(rows[0]));
      } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
    });
    app.post("/api/guides", async (req, res) => {
      const { title, categoryId, content, description, tags, status } = req.body;
      try {
        const { rows } = await dbQuery(
          "INSERT INTO marketing_guides (title, category_id, content, description, tags, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
          [title, categoryId || null, content || "", description, tags, status || "draft"]
        );
        res.json(guideToCamel(rows[0]));
      } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
    });
    app.put("/api/guides/:id", async (req, res) => {
      const b = req.body;
      const fields: string[] = [];
      const values: unknown[] = [];
      let pi = 1;
      for (const [key, val] of Object.entries(b)) {
        const col = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
        if (["title", "category_id", "content", "description", "tags", "status"].includes(col)) {
          fields.push(`${col} = $${pi++}`);
          values.push(val);
        }
      }
      if (fields.length === 0) { res.json({}); return; }
      fields.push("updated_at = NOW()");
      values.push(req.params.id);
      try {
        const { rows } = await dbQuery(`UPDATE marketing_guides SET ${fields.join(", ")} WHERE id = $${pi} RETURNING *`, values);
        res.json(rows[0] ? guideToCamel(rows[0]) : null);
      } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
    });
    app.delete("/api/guides/:id", async (req, res) => {
      try {
        await dbQuery("DELETE FROM marketing_guides WHERE id = $1", [req.params.id]);
        res.json({ success: true });
      } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
    });
  }

  // ─── 13. Dashboard Summary (single endpoint) ──────
  app.get("/api/summary", requireAuth, async (_req, res) => {
    const reasons: string[] = [];
    let healthState: "ok" | "warn" | "down" = "ok";

    // Service health
    const dbConnected = !!process.env.DATABASE_URL;
    const driveConnected = authService.isAuthenticated();
    const discordConnected = discordBot.isConnected();
    const oracleConfigured = !!process.env.ORACLE_FOLDER_ID;

    if (!dbConnected) { healthState = "warn"; reasons.push("Database not configured"); }
    if (!driveConnected) { reasons.push("Google Drive not connected"); }

    // Agents count (safe — returns 0 if DB is down)
    let agentCount = 0;
    let threadCount = 0;
    let taskCounts = { open: 0, in_progress: 0, completed: 0, blocked: 0 };
    let memoryCount = 0;

    if (dbConnected) {
      try {
        const { agentService } = await import("./agent-service.js");
        const { threadService } = await import("./thread-service.js");
        const { taskService } = await import("./task-service.js");
        const { memoryService } = await import("./memory-service.js");

        const [agents, threads, tasks, memories] = await Promise.all([
          agentService.list().catch(() => []),
          threadService.list().catch(() => []),
          taskService.list().catch(() => []),
          memoryService.list().catch(() => []),
        ]);

        agentCount = agents.length;
        threadCount = threads.length;
        memoryCount = memories.length;
        for (const t of tasks) {
          const s = t.status as keyof typeof taskCounts;
          if (s in taskCounts) taskCounts[s]++;
        }
      } catch {
        healthState = "warn";
        reasons.push("Database query failed");
      }
    }

    res.json({
      generatedAt: new Date().toISOString(),
      health: { state: healthState, reasons },
      services: {
        database: { status: dbConnected ? "ok" : "down", label: "Database" },
        drive: { status: driveConnected ? "ok" : "down", label: "Google Drive", email: authService.getServiceEmail() || null },
        discord: { status: discordConnected ? "ok" : "down", label: "Discord" },
        oracle: { status: oracleConfigured && driveConnected ? "ok" : "down", label: "Oracle Folder" },
        mcp: { status: "ok", label: "MCP Endpoint" },
        dataforseo: { status: seoService.isAuthenticated() ? "ok" : "down", label: "DataForSEO" },
      },
      stats: {
        workflows: engine.list().length,
        agents: agentCount,
        threads: threadCount,
        tasks: taskCounts,
        memories: memoryCount,
        documents: indexer.getAll().length,
        clients: indexer.getClients().length,
      },
      workflows: engine.list().map((w) => ({
        name: w.name,
        description: w.description,
        category: w.category,
        tags: w.tags,
        steps: w.steps.map((s) => ({ id: s.id, description: s.description })),
        inputs: w.inputs,
      })),
      workflowStats: engine.getStats(),
      workflowHistory: engine.getHistory().slice(0, 50),
      uptime: process.uptime(),
    });
  });

  // ─── 14. Health Check (Railway uses this) ──────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      workflows: engine.list().length,
      indexedDocuments: indexer.getAll().length,
      clients: indexer.getClients().length,
      driveConnected: authService.isAuthenticated(),
      uptime: process.uptime(),
    });
  });

  // ─── 14. MCP Endpoint (Streamable HTTP + legacy SSE) ────

  // Helper: create a wired-up MCP server instance
  function createMcpServer(): McpServer {
    const server = new McpServer({ name: "agency-workflow-server", version: "1.0.0" });
    bridgeWorkflowsToMcp(server, engine);
    bridgeKnowledgeToMcp(server, knowledgeBase, sopParser, clientAgent);
    bridgeThreadsToMcp(server);
    bridgeTasksToMcp(server);
    bridgeMemoriesToMcp(server);
    bridgeContentFactoryToMcp(server, authService);
    bridgeKeywordResearchToMcp(server, seoService);
    return server;
  }

  // MCP auth middleware: OAuth Bearer → API key fallback → open if neither configured
  app.use("/mcp", (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    // 1. Try OAuth Bearer token
    if (bearerToken && isMcpOAuthConfigured() && validateBearerToken(bearerToken)) {
      return next();
    }

    // 2. Try legacy API key (via Bearer header or query param)
    const apiKey = process.env.MCP_API_KEY;
    if (apiKey) {
      const provided = bearerToken || (req.query.api_key as string);
      if (provided === apiKey) return next();
    }

    // 3. If neither auth method is configured, allow open access
    if (!apiKey && !isMcpOAuthConfigured()) return next();

    // 4. Unauthorized
    const wwwAuth = isMcpOAuthConfigured()
      ? `Bearer resource_metadata="${process.env.MCP_BASE_URL || process.env.BASE_URL}/.well-known/oauth-protected-resource"`
      : "Bearer";
    res.setHeader("WWW-Authenticate", wwwAuth);
    res.status(401).json({ error: "Unauthorized" });
  });

  // ── Streamable HTTP transport (Claude.ai uses this) ──
  const streamableTransports = new Map<string, StreamableHTTPServerTransport>();

  // Single handler for GET, POST, DELETE on /mcp
  const handleStreamableMcp = async (req: express.Request, res: express.Response) => {
    // Check for existing session
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport = sessionId ? streamableTransports.get(sessionId) : undefined;

    if (transport) {
      // Existing session — delegate
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // For POST without session (initialization), or GET (SSE listen)
    if (req.method === "POST" || req.method === "GET") {
      transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
      const server = createMcpServer();
      await server.connect(transport);

      transport.onclose = () => {
        const sid = transport!.sessionId;
        if (sid) streamableTransports.delete(sid);
        console.log(`MCP Streamable session closed: ${sid}`);
      };

      await transport.handleRequest(req, res, req.body);

      if (transport.sessionId) {
        streamableTransports.set(transport.sessionId, transport);
        console.log(`MCP Streamable session started: ${transport.sessionId}`);
      }
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  };

  app.all("/mcp", handleStreamableMcp as any);

  // ── Legacy SSE transport (existing MCP clients) ──
  const sseTransports = new Map<string, SSEServerTransport>();

  app.get("/mcp/sse", async (req, res) => {
    console.log("MCP client connecting via SSE...");
    const server = createMcpServer();
    const transport = new SSEServerTransport("/mcp/messages", res);
    sseTransports.set(transport.sessionId, transport);

    res.on("close", () => {
      sseTransports.delete(transport.sessionId);
      console.log(`MCP SSE client disconnected: ${transport.sessionId}`);
    });

    await server.connect(transport);
    console.log(`MCP SSE client connected: ${transport.sessionId}`);
  });

  app.post("/mcp/messages", async (req, res) => {
    const sessionId = String(req.query.sessionId);
    const transport = sseTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  // ─── 15. Discord Bot ───────────────────────────────
  const discordBot = new DiscordBot({
    engine,
    knowledgeBase,
    indexer,
    clientAgent,
    authService,
  });

  // ─── 15b. Scheduler ──────────────────────────────
  let scheduler: Scheduler | null = null;

  if (process.env.DATABASE_URL) {
    const jobExecutor: JobExecutor = {
      async executePrompt(config) {
        let threadId = config.thread_id;
        if (!threadId) {
          const agents = await agentService.list();
          const agent = config.agent_id
            ? agents.find((a) => a.id === config.agent_id)
            : agents.find((a) => a.name === "General Assistant") || agents[0];
          if (!agent) throw new Error("No agents configured");
          const thread = await threadService.create({
            title: `Scheduled: ${config.prompt.slice(0, 50)}`,
            agent_id: agent.id,
            created_by: "scheduler",
          });
          threadId = thread.id;
        }

        let response = "";
        const driveService = authService.isAuthenticated()
          ? new GoogleDriveService(authService.getClient())
          : undefined;
        const generator = streamChat(threadId, config.prompt, engine, knowledgeBase, driveService);
        for await (const event of generator) {
          if (event.type === "text") response += event.content;
        }

        if (config.discord_channel_id && discordBot.isConnected()) {
          await discordBot.sendToChannel(config.discord_channel_id, response);
        }

        return response;
      },

      async executeWorkflow(config) {
        const result = await engine.run(config.workflow_name, config.inputs || {});
        const summary = result.success
          ? `Workflow **${config.workflow_name}** completed in ${result.durationMs}ms`
          : `Workflow **${config.workflow_name}** failed: ${result.error}`;

        if (config.discord_channel_id && discordBot.isConnected()) {
          await discordBot.sendToChannel(config.discord_channel_id, summary);
        }

        return summary;
      },

      async executeDriveSync(config) {
        if (!authService.isAuthenticated()) return "Drive not authenticated";
        const drive = new GoogleDriveService(authService.getClient());
        const count = await indexer.refreshIndex(drive);
        return `Synced ${count} documents`;
      },
    };

    scheduler = new Scheduler(jobExecutor);
  }

  // ─── 15c. Scheduler API Routes ──────────────────────
  if (process.env.DATABASE_URL && scheduler) {
    const sched = scheduler; // for closure

    app.get("/api/scheduler/jobs", requireAuth, async (_req, res) => {
      try {
        res.json(await sched.listAll());
      } catch (err) {
        console.error("List jobs error:", err);
        res.status(500).json({ error: "Failed to list jobs" });
      }
    });

    app.post("/api/scheduler/jobs", requireAuth, async (req, res) => {
      try {
        const parsed = createScheduledJobSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: parsed.error.flatten() });
          return;
        }
        const job = await sched.createJob(parsed.data);
        res.status(201).json(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(400).json({ error: message });
      }
    });

    app.get("/api/scheduler/jobs/:id", requireAuth, async (req, res) => {
      const job = await sched.getJob(String(req.params.id));
      if (!job) { res.status(404).json({ error: "Job not found" }); return; }
      res.json(job);
    });

    app.put("/api/scheduler/jobs/:id", requireAuth, async (req, res) => {
      try {
        const parsed = updateScheduledJobSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: parsed.error.flatten() });
          return;
        }
        const job = await sched.updateJob(String(req.params.id), parsed.data);
        if (!job) { res.status(404).json({ error: "Job not found" }); return; }
        res.json(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(400).json({ error: message });
      }
    });

    app.delete("/api/scheduler/jobs/:id", requireAuth, async (req, res) => {
      const deleted = await sched.deleteJob(String(req.params.id));
      res.json({ success: deleted });
    });

    app.get("/api/scheduler/jobs/:id/runs", requireAuth, async (req, res) => {
      try {
        const runs = await sched.getJobRuns(String(req.params.id), Number(req.query.limit) || 20);
        res.json(runs);
      } catch (err) {
        console.error("Get job runs error:", err);
        res.status(500).json({ error: "Failed to get job runs" });
      }
    });

    app.post("/api/scheduler/jobs/:id/run", requireAuth, async (req, res) => {
      try {
        const result = await sched.triggerNow(String(req.params.id));
        res.json({ success: true, result });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        res.status(500).json({ error: message });
      }
    });
  }

  // ─── React SPA catch-all ──────────────────────
  // Must be AFTER all API routes, health check, and MCP endpoints
  // Public pages (brand-story) skip auth; all others require it
  app.get("/brand-story/*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
  app.get("/onboarding/*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
  app.get("*", requireAuth, (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  // ─── 16. Start ────────────────────────────────────
  const server = app.listen(PORT, async () => {
    console.log("");
    console.log("═══════════════════════════════════════════════");
    console.log("  Agency Workflow Server");
    console.log("═══════════════════════════════════════════════");
    console.log(`  Dashboard:   http://localhost:${PORT}`);
    console.log(`  API:         http://localhost:${PORT}/api/workflows`);
    console.log(`  MCP (SSE):   http://localhost:${PORT}/mcp/sse`);
    console.log(`  Health:      http://localhost:${PORT}/health`);
    console.log(`  Drive:       ${authService.isAuthenticated() ? "Connected (" + authService.getServiceEmail() + ")" : "Not configured (set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON)"}`);
    console.log(`  Auth:        ${isOAuthConfigured() ? "Google OAuth enabled" : "Disabled (no GOOGLE_OAUTH_CLIENT_ID)"}`);
    console.log(`  MCP Auth:    ${isMcpOAuthConfigured() ? "OAuth 2.1 enabled" : process.env.MCP_API_KEY ? "API key only" : "Open access"}`);
    console.log(`  Database:    ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`);
    console.log(`  Oracle:      ${process.env.ORACLE_FOLDER_ID ? "Configured" : "Not configured (set ORACLE_FOLDER_ID)"}`);
    console.log(`  DataForSEO:  ${seoService.isAuthenticated() ? "Connected (" + seoService.getLogin() + ")" : "Not configured (set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD)"}`);

    // Start Discord bot (logs its own status line)
    await discordBot.start();

    // Start scheduler
    if (scheduler) {
      await scheduler.start();
      console.log(`  Scheduler:   Active`);
    } else {
      console.log(`  Scheduler:   Disabled (no DATABASE_URL)`);
    }

    console.log("═══════════════════════════════════════════════");
    console.log("");
  });

  // ─── 17. Graceful Shutdown ────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    const forceTimer = setTimeout(() => {
      console.error("Forced shutdown after 10s timeout");
      process.exit(1);
    }, 10000);

    try {
      server.close();
      if (scheduler) scheduler.stop();
      indexer.stopPeriodicSync();
      await closePool();
      console.log("Shutdown complete.");
      clearTimeout(forceTimer);
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      clearTimeout(forceTimer);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
