#!/usr/bin/env node
import "dotenv/config";
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
import { bridgeWorkflowsToMcp, bridgeKnowledgeToMcp, bridgeThreadsToMcp, bridgeTasksToMcp, bridgeMemoriesToMcp } from "./mcp-bridge.js";
import { registerAgencyWorkflows } from "./agency-workflows.js";
import { getDashboardHtml, getLoginPageHtml, getAccessDeniedHtml } from "./dashboard.js";
import { GoogleAuthService } from "./google-auth.js";
import { GoogleDriveService } from "./google-drive.js";
import { DocumentIndexer } from "./document-indexer.js";
import { KnowledgeBase } from "./knowledge-base.js";
import { SOPParser } from "./sop-parser.js";
import { ClientAgent } from "./client-agent.js";
import { DiscordBot } from "./discord-bot.js";
import { runMigrations, closePool } from "./database.js";
import { apiRouter } from "./api-routes.js";
import { redactionMiddleware } from "./redaction.js";
import {
  getOAuth2Client,
  isOAuthConfigured,
  isEmailAllowed,
  requireAuth,
  type SessionUser,
} from "./oauth.js";
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
  app.use("/api", redactionMiddleware as any);

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

  // ─── 4. Dashboard (protected) ──────────────────────
  app.get("/", requireAuth, (req, res) => {
    const user = (req.session as any)?.user as SessionUser | undefined;
    res.setHeader("Content-Type", "text/html");
    res.send(getDashboardHtml(user));
  });

  // ─── 5. REST API (for dashboard) ───────────────────
  // Protect all /api routes except /api/auth/me (already defined above)
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
    const doc = indexer.getById(req.params.id);
    if (!doc || doc.type !== "sop") {
      res.status(404).json({ error: "SOP not found" });
      return;
    }
    const parsed = sopParser.parse(doc);
    res.json(parsed);
  });

  app.post("/api/sops/:id/register", (req, res) => {
    const doc = indexer.getById(req.params.id);
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

  // ─── 12b. AI Agent Routes ──────────────────────────
  if (process.env.DATABASE_URL) {
    // Higher body limit for file/image uploads in chat
    app.use("/api/threads", express.json({ limit: "25mb" }));
    app.use("/api", apiRouter(engine, knowledgeBase, authService));
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
    return server;
  }

  // MCP auth middleware: OAuth Bearer → API key fallback → open if neither configured
  app.use("/mcp", (req, res, next) => {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    console.log(`[MCP Auth] ${req.method} ${req.path} | auth=${authHeader ? "Bearer ..." + (bearerToken?.slice(-6) || "") : "none"}`);

    // 1. Try OAuth Bearer token
    if (bearerToken && isMcpOAuthConfigured() && validateBearerToken(bearerToken)) {
      console.log("[MCP Auth] ✓ OAuth Bearer token valid");
      return next();
    }

    // 2. Try legacy API key (via Bearer header or query param)
    const apiKey = process.env.MCP_API_KEY;
    if (apiKey) {
      const provided = bearerToken || (req.query.api_key as string);
      if (provided === apiKey) {
        console.log("[MCP Auth] ✓ API key valid");
        return next();
      }
    }

    // 3. If neither auth method is configured, allow open access
    if (!apiKey && !isMcpOAuthConfigured()) return next();

    // 4. Unauthorized
    console.log(`[MCP Auth] ✗ Unauthorized`);
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


    // Start Discord bot (logs its own status line)
    await discordBot.start();

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
