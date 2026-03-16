/**
 * API routes for agents, threads, messages, and templates.
 */

import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { agentService } from "./agent-service.js";
import { threadService } from "./thread-service.js";
import { taskService } from "./task-service.js";
import { memoryService } from "./memory-service.js";
import { streamChat, type UserContent } from "./chat-engine.js";
import { query } from "./database.js";
import {
  createAgentSchema,
  updateAgentSchema,
  createThreadSchema,
  updateThreadSchema,
  createMessageSchema,
  createTrainingDocSchema,
  createTaskSchema,
  updateTaskSchema,
  upsertMemorySchema,
  contentGenerateRequestSchema,
  updateClientConfigSchema,
  keywordEnrichSchema,
  keywordSuggestSchema,
  serpQuerySchema,
  domainQuerySchema,
  onPageQuerySchema,
  contentSearchSchema,
  businessSearchSchema,
} from "./validation.js";
import type { WorkflowEngine } from "./workflow-engine.js";
import type { KnowledgeBase } from "./knowledge-base.js";
import type { GoogleAuthService } from "./google-auth.js";
import { GoogleDriveService } from "./google-drive.js";
import type { DataForSEOService } from "./dataforseo.js";
import { listClients, loadClientConfig, saveClientConfig, createWorkbook } from "./workbook-service.js";
import { buildContentPlan, runContentFactory, getRunStatus, listRuns, type ContentPageSpec } from "./content-factory.js";
import { generateContentStrategy, buildSitemap, strategyToCSV, type ContentPlannerInput } from "./content-planner.js";
import { contentQueue } from "./content-queue.js";
import { contentFactoryInputSchema, contentPlannerInputSchema, updatePlanningRowSchema, createPlanningRowSchema } from "./validation.js";
import * as planningService from "./planning-sheet-service.js";

export function apiRouter(engine: WorkflowEngine, knowledgeBase: KnowledgeBase, authService?: GoogleAuthService, seoService?: DataForSEOService): Router {
  const router = Router();

  // ── Agents ──────────────────────────────────────────

  router.get("/agents", async (_req, res) => {
    try {
      const agents = await agentService.list();
      // Include training doc count
      const result = await Promise.all(
        agents.map(async (a) => {
          const docs = await agentService.getTrainingDocs(a.id);
          return { ...a, training_doc_count: docs.length };
        })
      );
      res.json(result);
    } catch (err) {
      console.error("List agents error:", err);
      res.status(500).json({ error: "Failed to list agents" });
    }
  });

  router.get("/agents/:id", async (req, res) => {
    try {
      const agent = await agentService.getById(req.params.id);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      const trainingDocs = await agentService.getTrainingDocs(agent.id);
      res.json({ ...agent, training_docs: trainingDocs });
    } catch (err) {
      console.error("Get agent error:", err);
      res.status(500).json({ error: "Failed to get agent" });
    }
  });

  router.post("/agents", async (req, res) => {
    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const agent = await agentService.create(parsed.data);
      res.status(201).json(agent);
    } catch (err) {
      console.error("Create agent error:", err);
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

  router.put("/agents/:id", async (req, res) => {
    const parsed = updateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const agent = await agentService.update(req.params.id, parsed.data);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      res.json(agent);
    } catch (err) {
      console.error("Update agent error:", err);
      res.status(500).json({ error: "Failed to update agent" });
    }
  });

  router.delete("/agents/:id", async (req, res) => {
    try {
      const deleted = await agentService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete agent error:", err);
      res.status(500).json({ error: "Failed to delete agent" });
    }
  });

  // ── Training Docs ───────────────────────────────────

  router.post("/agents/:id/training", async (req, res) => {
    const parsed = createTrainingDocSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const agent = await agentService.getById(req.params.id);
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      const doc = await agentService.addTrainingDoc(req.params.id, parsed.data);
      res.status(201).json(doc);
    } catch (err) {
      console.error("Add training doc error:", err);
      res.status(500).json({ error: "Failed to add training doc" });
    }
  });

  router.delete("/agents/:agentId/training/:docId", async (req, res) => {
    try {
      const deleted = await agentService.deleteTrainingDoc(req.params.docId);
      if (!deleted) {
        res.status(404).json({ error: "Training doc not found" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete training doc error:", err);
      res.status(500).json({ error: "Failed to delete training doc" });
    }
  });

  // ── Threads ─────────────────────────────────────────

  router.get("/threads", async (req, res) => {
    try {
      const threads = await threadService.list({
        agent_id: req.query.agent_id as string | undefined,
        client: req.query.client as string | undefined,
        archived: req.query.archived === "true" ? true : req.query.archived === "false" ? false : undefined,
        created_by: req.query.created_by as string | undefined,
      });
      res.json(threads);
    } catch (err) {
      console.error("List threads error:", err);
      res.status(500).json({ error: "Failed to list threads" });
    }
  });

  router.get("/threads/:id", async (req, res) => {
    try {
      const thread = await threadService.getById(req.params.id);
      if (!thread) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }
      res.json(thread);
    } catch (err) {
      console.error("Get thread error:", err);
      res.status(500).json({ error: "Failed to get thread" });
    }
  });

  router.post("/threads", async (req, res) => {
    const parsed = createThreadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const thread = await threadService.create(parsed.data);
      res.status(201).json(thread);
    } catch (err) {
      console.error("Create thread error:", err);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  router.put("/threads/:id", async (req, res) => {
    const parsed = updateThreadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const thread = await threadService.update(req.params.id, parsed.data);
      if (!thread) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }
      res.json(thread);
    } catch (err) {
      console.error("Update thread error:", err);
      res.status(500).json({ error: "Failed to update thread" });
    }
  });

  router.delete("/threads/:id", async (req, res) => {
    try {
      const deleted = await threadService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete thread error:", err);
      res.status(500).json({ error: "Failed to delete thread" });
    }
  });

  // ── Messages ────────────────────────────────────────

  router.get("/threads/:id/messages", async (req, res) => {
    try {
      const thread = await threadService.getById(req.params.id);
      if (!thread) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }
      const messages = await threadService.getMessages(
        req.params.id,
        Number(req.query.limit) || 100,
        req.query.before as string | undefined
      );
      res.json(messages);
    } catch (err) {
      console.error("Get messages error:", err);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  router.post("/threads/:id/messages", async (req, res) => {
    const parsed = createMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const thread = await threadService.getById(req.params.id);
    if (!thread) {
      res.status(404).json({ error: "Thread not found" });
      return;
    }

    // ── Process attachments into content blocks ──────
    let userContent: UserContent = parsed.data.content;
    let dbContent: string | undefined;
    const attachments = parsed.data.attachments;

    if (attachments && attachments.length > 0) {
      const contentBlocks: Anthropic.ContentBlockParam[] = [];
      const dbNotes: string[] = [];

      if (parsed.data.content) {
        contentBlocks.push({ type: "text", text: parsed.data.content });
      }

      for (const att of attachments) {
        const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

        if (IMAGE_TYPES.includes(att.mime_type)) {
          contentBlocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: att.mime_type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: att.data,
            },
          });
          dbNotes.push(`[Attached image: ${att.name}]`);
        } else if (att.mime_type === "application/pdf") {
          try {
            const { PDFParse } = await import("pdf-parse");
            const buffer = Buffer.from(att.data, "base64");
            const parser = new PDFParse({ data: buffer });
            const result = await parser.getText();
            const text = (result.text || "").slice(0, 50000);
            contentBlocks.push({ type: "text", text: `[Content of ${att.name}]:\n${text}` });
            dbNotes.push(`[Attached PDF: ${att.name}, ${result.total} pages]`);
          } catch (err) {
            console.error("PDF parse error:", err);
            contentBlocks.push({ type: "text", text: `[Failed to parse PDF: ${att.name}]` });
            dbNotes.push(`[Attached PDF: ${att.name} (parse failed)]`);
          }
        } else if (att.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          try {
            const mammoth = await import("mammoth");
            const buffer = Buffer.from(att.data, "base64");
            const result = await mammoth.extractRawText({ buffer });
            const text = result.value.slice(0, 50000);
            contentBlocks.push({ type: "text", text: `[Content of ${att.name}]:\n${text}` });
            dbNotes.push(`[Attached DOCX: ${att.name}]`);
          } catch (err) {
            console.error("DOCX parse error:", err);
            contentBlocks.push({ type: "text", text: `[Failed to parse DOCX: ${att.name}]` });
            dbNotes.push(`[Attached DOCX: ${att.name} (parse failed)]`);
          }
        } else {
          // Try reading as UTF-8 text
          try {
            const text = Buffer.from(att.data, "base64").toString("utf-8").slice(0, 50000);
            contentBlocks.push({ type: "text", text: `[Content of ${att.name}]:\n${text}` });
            dbNotes.push(`[Attached file: ${att.name}]`);
          } catch {
            dbNotes.push(`[Attached file: ${att.name} (unreadable)]`);
          }
        }
      }

      userContent = contentBlocks;
      dbContent = [parsed.data.content, ...dbNotes].filter(Boolean).join("\n");
    }

    // SSE streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    try {
      // Create a Drive service for this request if auth is available
      const driveService = authService?.isAuthenticated()
        ? new GoogleDriveService(authService.getClient())
        : undefined;

      const generator = streamChat(
        req.params.id,
        userContent,
        engine,
        knowledgeBase,
        driveService,
        dbContent
      );

      for await (const event of generator) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      console.error("Chat stream error:", err);
      res.write(`data: ${JSON.stringify({ type: "error", content: "Internal server error" })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  });

  // ── Thread Templates ────────────────────────────────

  router.get("/thread-templates", async (_req, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM thread_templates ORDER BY created_at ASC"
      );
      res.json(rows);
    } catch (err) {
      console.error("List thread templates error:", err);
      res.status(500).json({ error: "Failed to list templates" });
    }
  });

  router.post("/threads/from-template/:id", async (req, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM thread_templates WHERE id = $1",
        [req.params.id]
      );
      const template = rows[0];
      if (!template) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      // Find the agent by name
      const agent = await agentService.getByName(template.agent_name);
      if (!agent) {
        res.status(400).json({ error: `Agent "${template.agent_name}" not found` });
        return;
      }

      // Create thread
      const thread = await threadService.create({
        title: template.name,
        agent_id: agent.id,
        client: req.body?.client,
        created_by: req.body?.created_by,
      });

      // Add initial message
      await threadService.addMessage(thread.id, "user", template.initial_message);

      res.status(201).json({ thread, initial_message: template.initial_message });
    } catch (err) {
      console.error("Create from template error:", err);
      res.status(500).json({ error: "Failed to create from template" });
    }
  });

  // ── Tasks ───────────────────────────────────────────

  router.get("/tasks", async (req, res) => {
    try {
      const tags = req.query.tags ? (req.query.tags as string).split(",") : undefined;
      const tasks = await taskService.list({
        status: req.query.status as string | undefined,
        priority: req.query.priority as string | undefined,
        tags,
        thread_id: req.query.thread_id as string | undefined,
        assigned_to: req.query.assigned_to as string | undefined,
      });
      res.json(tasks);
    } catch (err) {
      console.error("List tasks error:", err);
      res.status(500).json({ error: "Failed to list tasks" });
    }
  });

  router.get("/tasks/:id", async (req, res) => {
    try {
      const task = await taskService.getById(req.params.id);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json(task);
    } catch (err) {
      console.error("Get task error:", err);
      res.status(500).json({ error: "Failed to get task" });
    }
  });

  router.post("/tasks", async (req, res) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const task = await taskService.create(parsed.data);
      res.status(201).json(task);
    } catch (err) {
      console.error("Create task error:", err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  router.put("/tasks/:id", async (req, res) => {
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const task = await taskService.update(req.params.id, parsed.data);
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json(task);
    } catch (err) {
      console.error("Update task error:", err);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  router.delete("/tasks/:id", async (req, res) => {
    try {
      const deleted = await taskService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete task error:", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // ── Memories ─────────────────────────────────────────

  router.get("/memories", async (req, res) => {
    try {
      const memories = await memoryService.list(req.query.category as string | undefined);
      res.json(memories);
    } catch (err) {
      console.error("List memories error:", err);
      res.status(500).json({ error: "Failed to list memories" });
    }
  });

  router.get("/memories/search", async (req, res) => {
    const q = (req.query.q as string) || "";
    if (!q) {
      res.status(400).json({ error: "q parameter is required" });
      return;
    }
    try {
      const results = await memoryService.search(q);
      res.json(results);
    } catch (err) {
      console.error("Search memories error:", err);
      res.status(500).json({ error: "Failed to search memories" });
    }
  });

  router.get("/memories/:key", async (req, res) => {
    try {
      const memory = await memoryService.getByKey(req.params.key);
      if (!memory) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }
      res.json(memory);
    } catch (err) {
      console.error("Get memory error:", err);
      res.status(500).json({ error: "Failed to get memory" });
    }
  });

  router.put("/memories", async (req, res) => {
    const parsed = upsertMemorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const memory = await memoryService.upsert(parsed.data);
      res.json(memory);
    } catch (err) {
      console.error("Upsert memory error:", err);
      res.status(500).json({ error: "Failed to save memory" });
    }
  });

  router.delete("/memories/:key", async (req, res) => {
    try {
      const deleted = await memoryService.delete(req.params.key);
      if (!deleted) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete memory error:", err);
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // ── Workbooks ─────────────────────────────────────────

  router.get("/workbooks/clients", async (_req, res) => {
    try {
      const clients = listClients();
      res.json(clients);
    } catch (err) {
      console.error("List workbook clients error:", err);
      res.status(500).json({ error: "Failed to list clients" });
    }
  });

  router.get("/workbooks/clients/:slug", async (req, res) => {
    try {
      const config = loadClientConfig(req.params.slug);
      if (!config) { res.status(404).json({ error: "Client not found" }); return; }
      res.json(config);
    } catch (err) {
      console.error("Get client config error:", err);
      res.status(500).json({ error: "Failed to get client config" });
    }
  });

  router.post("/workbooks/create", async (req, res) => {
    const { client, sourceDocId, title } = req.body || {};
    if (!client || !sourceDocId) {
      res.status(400).json({ error: "client and sourceDocId are required" });
      return;
    }
    try {
      const result = await createWorkbook(client, sourceDocId, title);
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Create workbook error:", err);
      res.status(500).json({ error: `Failed to create workbook: ${message}` });
    }
  });

  // ── Content Factory ─────────────────────────────────────

  router.post("/content-factory/plan", async (req, res) => {
    try {
      const parsed = contentFactoryInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }
      const result = await runContentFactory({ ...parsed.data, dryRun: true });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Content factory plan error:", err);
      res.status(500).json({ error: message });
    }
  });

  router.post("/content-factory/generate", async (req, res) => {
    try {
      const parsed = contentFactoryInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      // Build drive service if auth is available
      let driveService: GoogleDriveService | undefined;
      if (authService?.isAuthenticated()) {
        driveService = new GoogleDriveService(authService.getClient());
      }

      const result = await runContentFactory(parsed.data, driveService);
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Content factory generate error:", err);
      res.status(500).json({ error: message });
    }
  });

  router.get("/content-factory/status/:runId", async (req, res) => {
    const status = getRunStatus(req.params.runId);
    if (!status) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.json(status);
  });

  router.get("/content-factory/runs", async (_req, res) => {
    res.json(listRuns());
  });

  // ── Content Planner ───────────────────────────────────────

  router.post("/content-planner/strategy", async (req, res) => {
    try {
      const parsed = contentPlannerInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
      }

      // Resolve content profile from clientSlug if not inline
      let contentProfile = parsed.data.contentProfile;
      let clientName = parsed.data.clientName;

      if (!contentProfile && parsed.data.clientSlug) {
        const config = loadClientConfig(parsed.data.clientSlug);
        if (!config?.contentProfile) {
          res.status(400).json({ error: `No content profile found for client: ${parsed.data.clientSlug}` });
          return;
        }
        contentProfile = config.contentProfile;
        clientName = clientName || config.name;
      }

      if (!contentProfile) {
        res.status(400).json({ error: "Provide contentProfile inline or a clientSlug with a configured profile" });
        return;
      }

      const strategy = await generateContentStrategy({
        ...parsed.data,
        clientName,
        contentProfile,
      });

      // Return CSV if requested
      if (req.query.format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${clientName}-content-strategy.csv"`);
        res.send(strategyToCSV(strategy));
        return;
      }

      res.json(strategy);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Content planner error:", err);
      res.status(500).json({ error: message });
    }
  });

  // ── Content Management ─────────────────────────────────────

  /** List clients that have a contentProfile configured */
  router.get("/content-management/clients", (_req, res) => {
    const clients = listClients().map((c) => {
      const config = loadClientConfig(c.slug);
      return {
        slug: c.slug,
        name: c.name,
        provider: c.provider,
        hasContentProfile: !!config?.contentProfile,
        hasFulfillmentFolder: !!config?.fulfillmentFolderId,
        hasPlanningSheet: !!config?.planningSheetId,
        hasOutputFolder: !!config?.outputFolder,
        outputFolder: config?.outputFolder || null,
        fulfillmentFolderId: config?.fulfillmentFolderId || null,
        planningSheetId: config?.planningSheetId || null,
      };
    });
    res.json(clients);
  });

  /** Get full client config */
  router.get("/content-management/clients/:slug", (req, res) => {
    const config = loadClientConfig(req.params.slug);
    if (!config) { res.status(404).json({ error: "Client not found" }); return; }
    res.json({ slug: req.params.slug, ...config });
  });

  /** Get content plan (sitemap + factory pages) — no LLM calls, instant */
  router.get("/content-management/clients/:slug/plan", (req, res) => {
    const config = loadClientConfig(req.params.slug);
    if (!config?.contentProfile) {
      res.status(400).json({ error: "Client has no content profile configured" });
      return;
    }
    const sitemap = buildSitemap(config.contentProfile, config.name);
    const factoryPages = buildContentPlan(config.contentProfile, config.name);
    res.json({ sitemap, factoryPages, clientName: config.name });
  });

  /** Generate content strategy (editorial calendar) — uses LLM */
  router.post("/content-management/clients/:slug/strategy", async (req, res) => {
    try {
      const config = loadClientConfig(req.params.slug);
      if (!config?.contentProfile) {
        res.status(400).json({ error: "Client has no content profile configured" });
        return;
      }
      const strategy = await generateContentStrategy({
        clientName: config.name,
        contentProfile: config.contentProfile,
        postsPerMonth: req.body?.postsPerMonth,
        startMonth: req.body?.startMonth,
        startYear: req.body?.startYear,
      });
      if (req.query.format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${config.name}-content-strategy.csv"`);
        res.send(strategyToCSV(strategy));
        return;
      }
      res.json(strategy);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Content strategy error:", err);
      res.status(500).json({ error: message });
    }
  });

  /** Trigger content generation (queued) */
  router.post("/content-management/clients/:slug/generate", async (req, res) => {
    try {
      const parsed = contentGenerateRequestSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

      const config = loadClientConfig(req.params.slug);
      if (!config?.contentProfile) {
        res.status(400).json({ error: "Client has no content profile configured" });
        return;
      }

      const outputFolderId = parsed.data.outputFolderId || config.fulfillmentFolderId || config.outputFolder;

      const result = await runContentFactory({
        clientSlug: req.params.slug,
        contentTypes: parsed.data.contentTypes || ["website-page"],
        dryRun: false,
        outputFolderId: outputFolderId || undefined,
        enableQA: parsed.data.enableQA,
        qaPassThreshold: parsed.data.qaPassThreshold,
      }, authService ? new GoogleDriveService(authService.getClient()) : undefined);

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Content generation error:", err);
      res.status(500).json({ error: message });
    }
  });

  /** Update client config (fulfillment folder, etc.) */
  router.patch("/content-management/clients/:slug/config", (req, res) => {
    const parsed = updateClientConfigSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    const updated = saveClientConfig(req.params.slug, parsed.data);
    if (!updated) { res.status(404).json({ error: "Client not found" }); return; }
    res.json({ slug: req.params.slug, ...updated });
  });

  /** Content queue status */
  router.get("/content-management/queue", (_req, res) => {
    res.json(contentQueue.stats);
  });

  // ── Planning Data (DB-backed, Sheet as backup) ────────────

  /** Read planning tab data from database */
  router.get("/content-management/clients/:slug/planning/:tab", async (req, res) => {
    try {
      const data = await planningService.getSheetData(req.params.slug, req.params.tab);
      if (!data) {
        // No DB data yet — check if there's a planning sheet to import from
        const config = loadClientConfig(req.params.slug);
        if (config?.planningSheetId) {
          res.json({ headers: [], rows: [], needsImport: true });
        } else {
          res.json({ headers: [], rows: [], needsImport: false });
        }
        return;
      }
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /** Update a planning row */
  router.put("/content-management/clients/:slug/planning/:tab/rows/:rowId", async (req, res) => {
    const parsed = updatePlanningRowSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const row = await planningService.updateRow(req.params.rowId, parsed.data.data);
      if (!row) { res.status(404).json({ error: "Row not found" }); return; }
      res.json(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /** Create a new planning row */
  router.post("/content-management/clients/:slug/planning/:tab/rows", async (req, res) => {
    const parsed = createPlanningRowSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const row = await planningService.createRow(req.params.slug, req.params.tab, parsed.data.data);
      if (!row) { res.status(404).json({ error: "No planning sheet found for this client/tab. Import first." }); return; }
      res.json(row);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /** Delete a planning row */
  router.delete("/content-management/clients/:slug/planning/:tab/rows/:rowId", async (req, res) => {
    try {
      const deleted = await planningService.deleteRow(req.params.rowId);
      if (!deleted) { res.status(404).json({ error: "Row not found" }); return; }
      res.json({ deleted: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /** Import from Google Sheet into database */
  router.post("/content-management/clients/:slug/planning/import", async (req, res) => {
    if (!authService?.isAuthenticated()) {
      res.status(500).json({ error: "Google service account not configured" });
      return;
    }
    try {
      const driveService = new GoogleDriveService(authService.getClient());
      const tab = typeof req.query.tab === "string" ? req.query.tab : undefined;
      let results: Record<string, number>;
      if (tab) {
        const tabName = planningService.resolveTabName(tab);
        const { imported } = await planningService.importSheetTab(req.params.slug, tabName, driveService);
        results = { [tab]: imported };
      } else {
        results = await planningService.importAllTabs(req.params.slug, driveService);
      }
      res.json({ imported: results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  /** Sync database data back to Google Sheet */
  router.post("/content-management/clients/:slug/planning/sync-back", async (req, res) => {
    if (!authService?.isAuthenticated()) {
      res.status(500).json({ error: "Google service account not configured" });
      return;
    }
    try {
      const driveService = new GoogleDriveService(authService.getClient());
      const tab = typeof req.query.tab === "string" ? req.query.tab : undefined;
      let results: Record<string, number>;
      if (tab) {
        const { synced } = await planningService.syncBackToSheet(req.params.slug, tab, driveService);
        results = { [tab]: synced };
      } else {
        results = await planningService.syncAllTabs(req.params.slug, driveService);
      }
      res.json({ synced: results });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // ── Keyword / SEO ─────────────────────────────────────────────

  router.post("/content-management/keywords/enrich", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD." });
      return;
    }
    const parsed = keywordEnrichSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const metrics = await seoService.getKeywordMetrics(
        parsed.data.keywords,
        parsed.data.locationCode,
      );
      res.json({ keywords: metrics, count: metrics.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Keyword enrich error:", err);
      res.status(500).json({ error: message });
    }
  });

  router.post("/content-management/keywords/suggest", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD." });
      return;
    }
    const parsed = keywordSuggestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    try {
      const suggestions = await seoService.getKeywordSuggestions(
        parsed.data.seed,
        parsed.data.locationCode,
        parsed.data.limit,
      );
      res.json({ keywords: suggestions, count: suggestions.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Keyword suggest error:", err);
      res.status(500).json({ error: message });
    }
  });

  // ── SERP ─────────────────────────────────────────────────────

  router.post("/seo/serp", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured." });
      return;
    }
    const parsed = serpQuerySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const result = await seoService.getSerpResults(
        parsed.data.keyword, parsed.data.locationCode, parsed.data.depth,
      );
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("SERP error:", err);
      res.status(500).json({ error: message });
    }
  });

  // ── Domain Analytics ──────────────────────────────────────────

  router.post("/seo/domain/overview", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured." });
      return;
    }
    const parsed = domainQuerySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const result = await seoService.getDomainOverview(
        parsed.data.domain, parsed.data.locationCode,
      );
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Domain overview error:", err);
      res.status(500).json({ error: message });
    }
  });

  router.post("/seo/domain/keywords", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured." });
      return;
    }
    const parsed = domainQuerySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const result = await seoService.getDomainRankedKeywords(
        parsed.data.domain, parsed.data.locationCode, parsed.data.limit,
      );
      res.json({ keywords: result, count: result.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Domain keywords error:", err);
      res.status(500).json({ error: message });
    }
  });

  router.post("/seo/domain/competitors", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured." });
      return;
    }
    const parsed = domainQuerySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const result = await seoService.getDomainCompetitors(
        parsed.data.domain, parsed.data.locationCode, parsed.data.limit,
      );
      res.json({ competitors: result, count: result.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Domain competitors error:", err);
      res.status(500).json({ error: message });
    }
  });

  // ── On-Page Analysis ──────────────────────────────────────────

  router.post("/seo/onpage", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured." });
      return;
    }
    const parsed = onPageQuerySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const result = await seoService.analyzePageInstant(parsed.data.url);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("On-page error:", err);
      res.status(500).json({ error: message });
    }
  });

  // ── Content Analysis ──────────────────────────────────────────

  router.post("/seo/content", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured." });
      return;
    }
    const parsed = contentSearchSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const result = await seoService.searchContent(
        parsed.data.keyword, parsed.data.limit,
      );
      res.json({ results: result, count: result.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Content analysis error:", err);
      res.status(500).json({ error: message });
    }
  });

  // ── Business Data ─────────────────────────────────────────────

  router.post("/seo/business", async (req, res) => {
    if (!seoService?.isAuthenticated()) {
      res.status(503).json({ error: "DataForSEO not configured." });
      return;
    }
    const parsed = businessSearchSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const result = await seoService.searchBusinessListings(
        parsed.data.keyword, parsed.data.locationCode, parsed.data.limit,
      );
      res.json({ listings: result, count: result.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Business data error:", err);
      res.status(500).json({ error: message });
    }
  });

  return router;
}
