#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  MCP Agency Workflow Server
 *  Express server with:
 *    • MCP endpoint at /mcp (Streamable HTTP / SSE)
 *    • Dashboard at /
 *    • REST API at /api/*
 *  Deploy to Railway, Render, or any Node.js host.
 * ═══════════════════════════════════════════════════════════════
 */

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { WorkflowEngine } from "./workflow-engine.js";
import { bridgeWorkflowsToMcp } from "./mcp-bridge.js";
import { registerAgencyWorkflows } from "./agency-workflows.js";
import { getDashboardHtml } from "./dashboard.js";

const PORT = Number(process.env.PORT) || 3000;

async function main(): Promise<void> {
  // ─── 1. Workflow Engine ─────────────────────────────
  const engine = new WorkflowEngine();
  registerAgencyWorkflows(engine);

  console.log(`✓ ${engine.list().length} workflows registered:`);
  for (const wf of engine.list()) {
    console.log(`  • [${wf.category}] ${wf.name}`);
  }

  // ─── 2. Express App ────────────────────────────────
  const app = express();
  app.use(express.json());

  // ─── 3. Dashboard ──────────────────────────────────
  app.get("/", (_req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(getDashboardHtml());
  });

  // ─── 4. REST API (for dashboard) ───────────────────

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
    const result = await engine.run(req.params.name, req.body || {});
    res.json(result);
  });

  // ─── 5. Health Check (Railway uses this) ───────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      workflows: engine.list().length,
      uptime: process.uptime(),
    });
  });

  // ─── 6. MCP SSE Endpoint ───────────────────────────
  //   Clients connect via GET /mcp/sse and POST /mcp/messages
  //   This allows Claude Desktop, Cursor, etc. to connect remotely.

  const transports = new Map<string, SSEServerTransport>();

  app.get("/mcp/sse", async (req, res) => {
    console.log("MCP client connecting via SSE...");

    const server = new McpServer({
      name: "agency-workflow-server",
      version: "1.0.0",
    });

    bridgeWorkflowsToMcp(server, engine);

    const transport = new SSEServerTransport("/mcp/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
      console.log(`MCP client disconnected: ${transport.sessionId}`);
    });

    await server.connect(transport);
    console.log(`MCP client connected: ${transport.sessionId}`);
  });

  app.post("/mcp/messages", async (req, res) => {
    const sessionId = String(req.query.sessionId);
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  // ─── 7. Start ──────────────────────────────────────
  app.listen(PORT, () => {
    console.log("");
    console.log("═══════════════════════════════════════════════");
    console.log("  Agency Workflow Server");
    console.log("═══════════════════════════════════════════════");
    console.log(`  Dashboard:   http://localhost:${PORT}`);
    console.log(`  API:         http://localhost:${PORT}/api/workflows`);
    console.log(`  MCP (SSE):   http://localhost:${PORT}/mcp/sse`);
    console.log(`  Health:      http://localhost:${PORT}/health`);
    console.log("═══════════════════════════════════════════════");
    console.log("");
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
