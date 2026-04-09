/**
 * API routes for agents, threads, messages, and templates.
 */

import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
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
  createTrackedKeywordSchema,
  contentGapSchema,
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

  /**
   * Build a ClientConfig from the database for a given slug.
   * Falls back to file-based config if DB client doesn't exist or has no data.
   */
  async function resolveClientConfig(slug: string): Promise<{ config: ReturnType<typeof loadClientConfig>; fromDb: boolean }> {
    // Try file-based first
    const fileConfig = loadClientConfig(slug);
    if (fileConfig?.contentProfile) return { config: fileConfig, fromDb: false };

    // Try building from database
    try {
      const { rows: clientRows } = await query(
        "SELECT * FROM cm_clients WHERE slug = $1", [slug]
      );
      if (!clientRows[0]) return { config: fileConfig, fromDb: false };
      const client = clientRows[0] as Record<string, unknown>;
      const clientId = client.id as number;

      // Fetch services, brand story, content guidelines, service areas in parallel
      const [servicesRes, storyRes, guideRes, areasRes] = await Promise.all([
        query("SELECT * FROM cm_services WHERE client_id = $1 AND offered = TRUE ORDER BY category, sort_order, service_name", [clientId]),
        query("SELECT * FROM cm_brand_story WHERE client_id = $1 LIMIT 1", [clientId]),
        query("SELECT * FROM cm_content_guidelines WHERE client_id = $1 LIMIT 1", [clientId]),
        query("SELECT * FROM cm_service_areas WHERE client_id = $1", [clientId]),
      ]);

      const services = servicesRes.rows as Record<string, unknown>[];
      const story = storyRes.rows[0] as Record<string, unknown> | undefined;
      const guide = guideRes.rows[0] as Record<string, unknown> | undefined;

      // Parse target_cities (comma or newline separated string)
      const cityText = (areasRes.rows[0]?.target_cities as string) || "";
      const areas = cityText.split(/[,\n]+/).map((c: string) => c.trim()).filter(Boolean);

      // Build CoreService[] from cm_services (service_name is the actual column)
      const coreServices = services.map((s) => ({
        name: (s.service_name as string) || "",
        slug: ((s.service_name as string) || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: (s.description as string) || (s.description_long as string) || undefined,
        subServices: undefined, // sub-services use parent_service_id, would need separate query
      })).filter((s) => s.name);

      // Build BrandStory from cm_brand_story JSONB sections
      const extractText = (section: unknown): string => {
        if (!section) return "";
        if (typeof section === "string") return section;
        if (typeof section === "object") return JSON.stringify(section);
        return "";
      };
      const storybrand = story ? {
        hero: extractText(story.hero_section),
        problem: extractText(story.problem_section),
        guide: extractText(story.guide_section),
        plan: extractText(story.plan_section),
        callToAction: extractText(story.cta_section),
        avoidFailure: extractText(story.failure_section),
        achieveSuccess: extractText(story.success_section),
      } : undefined;

      // Build BrandVoice from cm_content_guidelines
      const brandVoice = guide ? {
        tone: (guide.tone as string) || "",
        style: (guide.writing_style as string) || "",
        avoidWords: (guide.restrictions as string)?.split(/[,\n]+/).map((w: string) => w.trim()).filter(Boolean) || undefined,
        preferWords: (guide.approved_terminology as string)?.split(/[,\n]+/).map((w: string) => w.trim()).filter(Boolean) || undefined,
      } : undefined;

      const contentProfile = {
        businessType: (client.industry as string) || (client.company_name as string) || "",
        tagline: (guide?.unique_selling_points as string) || undefined,
        cities: areas.length > 0 ? areas.filter(Boolean) as string[] : undefined,
        coreServices: coreServices.length > 0 ? coreServices : undefined,
        storybrand: storybrand?.hero ? storybrand : undefined,
        brandVoice: brandVoice?.tone ? brandVoice : undefined,
      };

      // Only return DB config if we have meaningful content data
      const hasContent = coreServices.length > 0 || storybrand?.hero || brandVoice?.tone;

      const dbConfig = {
        name: (client.company_name as string) || slug,
        provider: "",
        colors: { primary: "#3B82F6", secondary: "#6B7280", accent: "#10B981", dark: "#1F2937", muted: "#9CA3AF", lightBg: "#F9FAFB" },
        fonts: { heading: "Inter", body: "Inter" },
        images: {},
        domain: ((client.company_website as string) || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") || undefined,
        contentProfile: hasContent ? contentProfile : undefined,
        // Preserve file-based settings if they exist
        fulfillmentFolderId: fileConfig?.fulfillmentFolderId || undefined,
        planningSheetId: fileConfig?.planningSheetId || undefined,
        outputFolder: fileConfig?.outputFolder || undefined,
      };

      return { config: dbConfig as ReturnType<typeof loadClientConfig>, fromDb: true };
    } catch (err) {
      console.error("DB content profile resolution error:", err);
      return { config: fileConfig, fromDb: false };
    }
  }

  /** List clients — merges file-based and DB clients */
  router.get("/content-management/clients", async (_req, res) => {
    try {
      // File-based clients
      const fileSlugs = new Set<string>();
      const fileClients = listClients().map((c) => {
        fileSlugs.add(c.slug);
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
          domain: config?.domain || null,
        };
      });

      // DB clients not already in file list
      let dbClients: typeof fileClients = [];
      try {
        const { rows } = await query("SELECT id, slug, company_name, company_website, industry FROM cm_clients WHERE status = 'active' ORDER BY company_name");
        dbClients = rows
          .filter((r: Record<string, unknown>) => !fileSlugs.has(r.slug as string))
          .map((r: Record<string, unknown>) => ({
            slug: r.slug as string,
            name: (r.company_name as string) || (r.slug as string),
            provider: "",
            hasContentProfile: true, // DB clients always have some data
            hasFulfillmentFolder: false,
            hasPlanningSheet: false,
            hasOutputFolder: false,
            outputFolder: null,
            fulfillmentFolderId: null,
            planningSheetId: null,
            domain: ((r.company_website as string) || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") || null,
          }));
      } catch { /* DB not available */ }

      res.json([...fileClients, ...dbClients]);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed to list clients" }); }
  });

  /** Get full client config */
  router.get("/content-management/clients/:slug", async (req, res) => {
    const { config } = await resolveClientConfig(req.params.slug);
    if (!config) { res.status(404).json({ error: "Client not found" }); return; }
    res.json({ slug: req.params.slug, ...config });
  });

  /** Client content status (for badges in the content tab) */
  router.get("/content-management/clients/:slug/status", async (req, res) => {
    const { config } = await resolveClientConfig(req.params.slug);
    if (!config) { res.status(404).json({ error: "Client not found" }); return; }
    res.json({
      hasProfile: !!config.contentProfile,
      hasContentProfile: !!config.contentProfile,
      hasFulfillmentFolder: !!config.fulfillmentFolderId,
      hasPlanningSheet: !!config.planningSheetId,
      hasOutputFolder: !!config.outputFolder,
    });
  });

  /** Get content plan (sitemap + factory pages) — no LLM calls, instant */
  router.get("/content-management/clients/:slug/plan", async (req, res) => {
    const { config } = await resolveClientConfig(req.params.slug);
    if (!config?.contentProfile) {
      res.status(400).json({ error: "Client has no content profile configured. Add services and brand story first." });
      return;
    }
    const sitemap = buildSitemap(config.contentProfile, config.name);
    const factoryPages = buildContentPlan(config.contentProfile, config.name);
    res.json({ sitemap, factoryPages, clientName: config.name });
  });

  /** Generate content strategy (editorial calendar) — uses LLM */
  router.post("/content-management/clients/:slug/strategy", async (req, res) => {
    try {
      const { config } = await resolveClientConfig(req.params.slug);
      if (!config?.contentProfile) {
        res.status(400).json({ error: "Client has no content profile configured. Add services and brand story first." });
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

      const { config } = await resolveClientConfig(req.params.slug);
      if (!config?.contentProfile) {
        res.status(400).json({ error: "Client has no content profile configured. Add services and brand story first." });
        return;
      }

      const outputFolderId = parsed.data.outputFolderId || config.fulfillmentFolderId || config.outputFolder;

      const result = await runContentFactory({
        clientSlug: req.params.slug,
        contentProfile: config.contentProfile,
        clientConfig: config,
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

  /** Upload Excel file and import all sheets into planning data */
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  router.post("/content-management/clients/:slug/planning/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const clientSlug = req.params.slug;
      const results: Record<string, number> = {};

      // Map Excel sheet names to our tab system
      const sheetMapping: Record<string, string> = {
        "Deliverables": "Deliverables",
        "Topical Sitemap": "Topical Sitemap",
        "New Content Tracking": "New Content Tracking",
        "Completed Articles": "Completed Articles",
      };

      for (const excelName of wb.SheetNames) {
        const tabName = sheetMapping[excelName];
        if (!tabName) continue; // skip unrecognized sheets

        const ws = wb.Sheets[excelName];
        const jsonRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (!jsonRows.length) { results[excelName] = 0; continue; }

        const headers = (jsonRows[0] as string[]).map((h) => String(h || "").trim()).filter(Boolean);
        if (headers.length === 0) { results[excelName] = 0; continue; }

        const dataRows = jsonRows.slice(1).filter((row) =>
          (row as string[]).some((c) => c != null && String(c).trim() !== "")
        );

        // Upsert sheet metadata
        const { rows: sheetRows } = await query(
          `INSERT INTO planning_sheets (client_slug, tab_name, headers, last_synced_from_sheet)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (client_slug, tab_name)
           DO UPDATE SET headers = $3, last_synced_from_sheet = NOW(), updated_at = NOW()
           RETURNING id`,
          [clientSlug, tabName, JSON.stringify(headers)]
        );
        const sheetId = sheetRows[0].id;

        // Replace all rows
        await query("DELETE FROM planning_rows WHERE sheet_id = $1", [sheetId]);

        if (dataRows.length > 0) {
          const valuePlaceholders: string[] = [];
          const params: unknown[] = [];
          let idx = 1;
          for (let i = 0; i < dataRows.length; i++) {
            const rowData: Record<string, string> = {};
            headers.forEach((h, j) => {
              const val = (dataRows[i] as unknown[])[j];
              // Convert Excel serial dates to readable dates
              if (typeof val === "number" && val > 40000 && val < 60000) {
                const date = new Date((val - 25569) * 86400 * 1000);
                rowData[h] = date.toISOString().slice(0, 10);
              } else {
                rowData[h] = val != null ? String(val) : "";
              }
            });
            valuePlaceholders.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
            params.push(sheetId, i, JSON.stringify(rowData));
            idx += 3;
          }
          await query(
            `INSERT INTO planning_rows (sheet_id, row_index, data) VALUES ${valuePlaceholders.join(", ")}`,
            params
          );
        }

        results[excelName] = dataRows.length;
      }

      const totalImported = Object.values(results).reduce((a, b) => a + b, 0);
      res.json({ imported: results, total: totalImported, sheetsProcessed: Object.keys(results).length });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Excel upload error:", err);
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

  // ── SEO Tracking ──────────────────────────────────────────

  // List tracked keywords for a client
  router.get("/seo/clients/:slug/keywords", async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT tk.*,
          (SELECT kr.position FROM keyword_rankings kr WHERE kr.tracked_keyword_id = tk.id ORDER BY kr.checked_at DESC LIMIT 1) as current_position,
          (SELECT kr.search_volume FROM keyword_rankings kr WHERE kr.tracked_keyword_id = tk.id ORDER BY kr.checked_at DESC LIMIT 1) as search_volume,
          (SELECT kr.url FROM keyword_rankings kr WHERE kr.tracked_keyword_id = tk.id ORDER BY kr.checked_at DESC LIMIT 1) as ranking_url,
          (SELECT kr.checked_at FROM keyword_rankings kr WHERE kr.tracked_keyword_id = tk.id ORDER BY kr.checked_at DESC LIMIT 1) as last_checked,
          (SELECT kr.position FROM keyword_rankings kr WHERE kr.tracked_keyword_id = tk.id ORDER BY kr.checked_at DESC LIMIT 1 OFFSET 1) as previous_position
        FROM tracked_keywords tk WHERE tk.client_slug = $1 ORDER BY tk.created_at`,
        [req.params.slug]
      );
      res.json(rows);
    } catch (err) {
      console.error("List tracked keywords error:", err);
      res.status(500).json({ error: "Failed to list tracked keywords" });
    }
  });

  // Add tracked keywords (bulk)
  router.post("/seo/clients/:slug/keywords", async (req, res) => {
    const parsed = createTrackedKeywordSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const results = [];
      for (const keyword of parsed.data.keywords) {
        const { rows } = await query(
          `INSERT INTO tracked_keywords (client_slug, keyword, location_code, target_url, tags)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (client_slug, keyword, location_code) DO NOTHING
           RETURNING *`,
          [req.params.slug, keyword, parsed.data.locationCode || 2840, parsed.data.targetUrl || null, parsed.data.tags || []]
        );
        if (rows[0]) results.push(rows[0]);
      }
      res.json({ added: results.length, keywords: results });
    } catch (err) {
      console.error("Add tracked keyword error:", err);
      res.status(500).json({ error: "Failed to add tracked keywords" });
    }
  });

  // Delete tracked keyword
  router.delete("/seo/clients/:slug/keywords/:id", async (req, res) => {
    try {
      await query("DELETE FROM tracked_keywords WHERE id = $1 AND client_slug = $2", [req.params.id, req.params.slug]);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete tracked keyword error:", err);
      res.status(500).json({ error: "Failed to delete tracked keyword" });
    }
  });

  // Trigger ranking check for all tracked keywords of a client
  router.post("/seo/clients/:slug/keywords/check", async (req, res) => {
    if (!seoService?.isAuthenticated()) { res.status(503).json({ error: "DataForSEO not configured" }); return; }
    try {
      // Try file-based config first, then DB
      let domain: string | undefined;
      let businessName: string | undefined;
      const fileConfig = loadClientConfig(req.params.slug);
      if (fileConfig?.domain) domain = fileConfig.domain;
      if (fileConfig?.name) businessName = fileConfig.name;

      if (!domain) {
        const { rows } = await query("SELECT company_name, company_website, domain FROM cm_clients WHERE slug = $1", [req.params.slug]);
        if (rows[0]) {
          domain = (rows[0].domain as string) || ((rows[0].company_website as string) || "")
            .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
          businessName = rows[0].company_name as string;
        }
      }

      // Allow override from request body
      const body = req.body as { domain?: string; businessName?: string };
      if (body?.domain) domain = body.domain;
      if (body?.businessName) businessName = body.businessName;

      if (!domain) { res.status(400).json({ error: "Client has no domain configured" }); return; }

      const { rows: keywords } = await query(
        "SELECT * FROM tracked_keywords WHERE client_slug = $1", [req.params.slug]
      );
      if (keywords.length === 0) { res.json({ checked: 0, results: [] }); return; }

      // Get metrics for all keywords in one batch
      const keywordStrings = keywords.map((k: { keyword: string }) => k.keyword);
      const metrics = await seoService.getKeywordMetrics(keywordStrings, keywords[0].location_code);

      // Get SERP results to find actual positions for the domain
      const results = [];
      for (const kw of keywords) {
        try {
          const serp = await seoService.getSerpResults(kw.keyword, kw.location_code, 30);
          const match = serp.items?.find((item: { url?: string }) => item.url?.includes(domain!));
          const kwMetrics = metrics.find((m: { keyword: string }) => m.keyword.toLowerCase() === kw.keyword.toLowerCase());

          // Look up local pack position from organic SERP (the local pack is one of the items with type=local_pack)
          let localPackPosition: number | null = null;
          let localPackUrl: string | null = null;
          if (kw.track_local_pack) {
            // The SERP returns local_pack items inline. Look for them and check if our business is in there.
            // For more accuracy, we could call the maps endpoint, but using the embedded local_pack from SERP saves API calls.
            const localPackItems = serp.items?.filter((item: { type?: string }) => item.type === "local_pack") || [];
            for (let i = 0; i < localPackItems.length; i++) {
              const lp = localPackItems[i] as { title?: string; url?: string };
              if (businessName && lp.title?.toLowerCase().includes(businessName.toLowerCase())) {
                localPackPosition = i + 1;
                localPackUrl = lp.url || null;
                break;
              }
            }
          }

          const ranking = {
            tracked_keyword_id: kw.id,
            client_slug: req.params.slug,
            keyword: kw.keyword,
            position: match?.position || null,
            url: match?.url || null,
            search_volume: kwMetrics?.searchVolume || null,
            cpc: kwMetrics?.cpc || null,
            competition: kwMetrics?.competition || null,
            difficulty: kwMetrics?.keywordDifficulty || null,
            local_pack_position: localPackPosition,
            local_pack_url: localPackUrl,
          };

          await query(
            `INSERT INTO keyword_rankings (tracked_keyword_id, client_slug, keyword, position, url, search_volume, cpc, competition, difficulty, local_pack_position, local_pack_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [ranking.tracked_keyword_id, ranking.client_slug, ranking.keyword, ranking.position, ranking.url, ranking.search_volume, ranking.cpc, ranking.competition, ranking.difficulty, ranking.local_pack_position, ranking.local_pack_url]
          );
          results.push(ranking);
        } catch (err) {
          console.error(`SERP check failed for "${kw.keyword}":`, err);
          results.push({ keyword: kw.keyword, error: "SERP check failed" });
        }
      }
      res.json({ checked: results.length, results });
    } catch (err) {
      console.error("Keyword check error:", err);
      res.status(500).json({ error: "Failed to check keywords" });
    }
  });

  // Get ranking history for a tracked keyword
  router.get("/seo/clients/:slug/keywords/:id/history", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 52, 200);
      const { rows } = await query(
        "SELECT * FROM keyword_rankings WHERE tracked_keyword_id = $1 ORDER BY checked_at DESC LIMIT $2",
        [req.params.id, limit]
      );
      res.json(rows);
    } catch (err) {
      console.error("Keyword history error:", err);
      res.status(500).json({ error: "Failed to get keyword history" });
    }
  });

  // Get domain snapshot history
  router.get("/seo/clients/:slug/domain/history", async (req, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM domain_snapshots WHERE client_slug = $1 ORDER BY snapshot_date DESC LIMIT 24",
        [req.params.slug]
      );
      res.json(rows);
    } catch (err) {
      console.error("Domain history error:", err);
      res.status(500).json({ error: "Failed to get domain history" });
    }
  });

  // Trigger domain overview snapshot
  router.post("/seo/clients/:slug/domain/snapshot", async (req, res) => {
    if (!seoService?.isAuthenticated()) { res.status(503).json({ error: "DataForSEO not configured" }); return; }
    try {
      const config = loadClientConfig(req.params.slug);
      const domain = config?.domain || (req.body as { domain?: string })?.domain;
      if (!domain) { res.status(400).json({ error: "Client has no domain configured" }); return; }

      const overview = await seoService.getDomainOverview(domain);
      await query(
        `INSERT INTO domain_snapshots (client_slug, domain, organic_traffic, organic_keywords, rank, backlinks, referring_domains, metrics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (client_slug, snapshot_date) DO UPDATE SET
           organic_traffic = EXCLUDED.organic_traffic, organic_keywords = EXCLUDED.organic_keywords,
           rank = EXCLUDED.rank, backlinks = EXCLUDED.backlinks, referring_domains = EXCLUDED.referring_domains,
           metrics = EXCLUDED.metrics`,
        [req.params.slug, domain, overview.organicTraffic, overview.organicKeywords, overview.rank, overview.backlinks, overview.referringDomains, JSON.stringify(overview)]
      );
      res.json({ success: true, snapshot: overview });
    } catch (err) {
      console.error("Domain snapshot error:", err);
      res.status(500).json({ error: "Failed to take domain snapshot" });
    }
  });

  // Content gap analysis
  router.post("/seo/content-gaps", async (req, res) => {
    if (!seoService?.isAuthenticated()) { res.status(503).json({ error: "DataForSEO not configured" }); return; }
    const parsed = contentGapSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
    try {
      const limit = parsed.data.limit || 100;
      // Get client's keywords
      const clientKws = await seoService.getDomainRankedKeywords(parsed.data.domain, parsed.data.locationCode, 200);
      const clientKeywordSet = new Set(clientKws.map((k: { keyword: string }) => k.keyword.toLowerCase()));

      // Get competitor keywords and find gaps
      const gaps: Record<string, { keyword: string; searchVolume: number; difficulty: number; cpc: number; competitors: string[] }> = {};
      for (const compDomain of parsed.data.competitorDomains) {
        const compKws = await seoService.getDomainRankedKeywords(compDomain, parsed.data.locationCode, 200);
        for (const kw of compKws) {
          const lower = kw.keyword.toLowerCase();
          if (!clientKeywordSet.has(lower)) {
            if (!gaps[lower]) {
              gaps[lower] = { keyword: kw.keyword, searchVolume: kw.searchVolume || 0, difficulty: kw.difficulty || 0, cpc: kw.cpc || 0, competitors: [] };
            }
            gaps[lower].competitors.push(compDomain);
          }
        }
      }

      // Sort by volume/difficulty ratio (higher = better opportunity)
      const sorted = Object.values(gaps)
        .sort((a, b) => {
          const scoreA = a.searchVolume / Math.max(a.difficulty, 1);
          const scoreB = b.searchVolume / Math.max(b.difficulty, 1);
          return scoreB - scoreA;
        })
        .slice(0, limit);

      res.json({ gaps: sorted, totalGaps: Object.keys(gaps).length, clientKeywords: clientKws.length });
    } catch (err) {
      console.error("Content gap error:", err);
      res.status(500).json({ error: "Failed to analyze content gaps" });
    }
  });

  // Run on-page audit and save
  router.post("/seo/clients/:slug/audit", async (req, res) => {
    if (!seoService?.isAuthenticated()) { res.status(503).json({ error: "DataForSEO not configured" }); return; }
    const { url } = req.body as { url?: string };
    if (!url) { res.status(400).json({ error: "url is required" }); return; }
    try {
      const result = await seoService.analyzePageInstant(url);
      await query(
        `INSERT INTO seo_audits (client_slug, url, status_code, onpage_score, title, description, h1, load_time, size, checks, broken_links, broken_resources, duplicate_title, duplicate_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [req.params.slug, url, result.statusCode, result.onpageScore, result.title, result.description, result.h1 || [], result.loadTime, result.size, JSON.stringify(result.checks || {}), result.brokenLinks || 0, result.brokenResources || 0, result.duplicateTitle || false, result.duplicateDescription || false]
      );
      res.json(result);
    } catch (err) {
      console.error("On-page audit error:", err);
      res.status(500).json({ error: "Failed to run audit" });
    }
  });

  // List audit history for a client
  router.get("/seo/clients/:slug/audits", async (req, res) => {
    try {
      const { rows } = await query(
        "SELECT * FROM seo_audits WHERE client_slug = $1 ORDER BY audited_at DESC LIMIT 50",
        [req.params.slug]
      );
      res.json(rows);
    } catch (err) {
      console.error("List audits error:", err);
      res.status(500).json({ error: "Failed to list audits" });
    }
  });

  // ═══════════════════════════════════════════════
  //  SEO — Auto-generate keyword seeds from client data
  // ═══════════════════════════════════════════════

  /**
   * Generate seed keywords from client services × cities + brand story.
   * Returns suggestions with search volume metrics for review before adding.
   */
  router.post("/seo/clients/:slug/keywords/suggest-seeds", async (req, res) => {
    if (!seoService?.isAuthenticated()) { res.status(503).json({ error: "DataForSEO not configured" }); return; }
    try {
      const slug = req.params.slug;

      // Get client + services + service areas + brand story
      const { rows: clientRows } = await query("SELECT * FROM cm_clients WHERE slug = $1", [slug]);
      if (!clientRows[0]) { res.status(404).json({ error: "Client not found" }); return; }
      const client = clientRows[0] as Record<string, unknown>;
      const clientId = client.id as number;

      const [servicesRes, areasRes, storyRes] = await Promise.all([
        query("SELECT service_name, category FROM cm_services WHERE client_id = $1 AND offered = TRUE ORDER BY tier, sort_order", [clientId]),
        query("SELECT target_cities FROM cm_service_areas WHERE client_id = $1", [clientId]),
        query("SELECT problem_section, hero_section FROM cm_brand_story WHERE client_id = $1 LIMIT 1", [clientId]),
      ]);

      const services = servicesRes.rows
        .map((r: Record<string, unknown>) => r.service_name as string)
        .filter(Boolean);

      // Parse cities from comma/newline-separated text
      const cityText = (areasRes.rows[0]?.target_cities as string) || "";
      const cities = cityText.split(/[,\n]+/).map((c: string) => c.trim()).filter(Boolean);

      // Generate seed keyword combinations
      const seeds = new Set<string>();

      // Service-only keywords
      for (const svc of services) {
        seeds.add(svc.toLowerCase());
        seeds.add(`${svc.toLowerCase()} near me`);
        seeds.add(`best ${svc.toLowerCase()}`);
      }

      // Service × city combinations
      for (const svc of services) {
        for (const city of cities) {
          seeds.add(`${svc.toLowerCase()} ${city.toLowerCase()}`);
          seeds.add(`${svc.toLowerCase()} in ${city.toLowerCase()}`);
          seeds.add(`${city.toLowerCase()} ${svc.toLowerCase()}`);
        }
      }

      // City-only branded
      for (const city of cities) {
        if (services.length > 0) {
          seeds.add(`${services[0].toLowerCase()} clinic ${city.toLowerCase()}`);
        }
      }

      const seedArray = Array.from(seeds).slice(0, 100); // cap at 100 to control cost

      // Get search volume metrics for all seeds in one batch
      const locationCode = (req.body as { locationCode?: number })?.locationCode || 2840;
      const metrics = await seoService.getKeywordMetrics(seedArray, locationCode);

      // Existing tracked keywords for this client (filter out)
      const { rows: existing } = await query("SELECT keyword FROM tracked_keywords WHERE client_slug = $1", [slug]);
      const existingSet = new Set(existing.map((r: { keyword: string }) => r.keyword.toLowerCase()));

      // Sort by search volume desc, mark existing
      const suggestions = metrics
        .map((m) => ({
          keyword: m.keyword,
          searchVolume: m.searchVolume || 0,
          difficulty: m.keywordDifficulty || null,
          cpc: m.cpc || 0,
          competition: m.competitionLevel || null,
          alreadyTracked: existingSet.has(m.keyword.toLowerCase()),
        }))
        .sort((a, b) => b.searchVolume - a.searchVolume);

      res.json({
        suggestions,
        totalGenerated: seedArray.length,
        totalReturned: suggestions.length,
        services,
        cities,
        sources: { servicesCount: services.length, citiesCount: cities.length, brandStoryAvailable: !!storyRes.rows[0] },
      });
    } catch (err) {
      console.error("Keyword seed generation error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate seeds" });
    }
  });

  /**
   * Bulk-add tracked keywords (used after seed suggestions are reviewed)
   */
  router.post("/seo/clients/:slug/keywords/bulk-add", async (req, res) => {
    const slug = req.params.slug;
    const { keywords, locationCode = 2840, source = "auto-generated", trackLocalPack = false } = req.body as {
      keywords: string[]; locationCode?: number; source?: string; trackLocalPack?: boolean;
    };

    if (!Array.isArray(keywords) || keywords.length === 0) {
      res.status(400).json({ error: "keywords array required" });
      return;
    }

    try {
      const results = [];
      for (const keyword of keywords) {
        const { rows } = await query(
          `INSERT INTO tracked_keywords (client_slug, keyword, location_code, source, track_local_pack)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (client_slug, keyword, location_code) DO NOTHING
           RETURNING *`,
          [slug, keyword.trim(), locationCode, source, trackLocalPack]
        );
        if (rows[0]) results.push(rows[0]);
      }
      res.json({ added: results.length, total: keywords.length, keywords: results });
    } catch (err) {
      console.error("Bulk add keywords error:", err);
      res.status(500).json({ error: "Failed to bulk-add keywords" });
    }
  });

  // ═══════════════════════════════════════════════
  //  SEO — Local Heatmap (GBP grid scan)
  // ═══════════════════════════════════════════════

  /**
   * Run a local heatmap scan for a keyword around a center point.
   * Generates a coordinate grid and queries DataForSEO Maps for each point,
   * recording the client's business position at each grid cell.
   */
  router.post("/seo/clients/:slug/heatmap/scan", async (req, res) => {
    if (!seoService?.isAuthenticated()) { res.status(503).json({ error: "DataForSEO not configured" }); return; }

    const slug = req.params.slug;
    const { keyword, centerLat, centerLng, gridSize = 5, radiusMiles = 1.0, businessName } = req.body as {
      keyword: string; centerLat: number; centerLng: number;
      gridSize?: number; radiusMiles?: number; businessName?: string;
    };

    if (!keyword || centerLat == null || centerLng == null) {
      res.status(400).json({ error: "keyword, centerLat, centerLng required" });
      return;
    }
    if (gridSize < 3 || gridSize > 11 || gridSize % 2 === 0) {
      res.status(400).json({ error: "gridSize must be odd, between 3 and 11" });
      return;
    }

    try {
      // Look up client business name if not provided
      let bizName = businessName;
      if (!bizName) {
        const { rows } = await query("SELECT company_name FROM cm_clients WHERE slug = $1", [slug]);
        bizName = rows[0]?.company_name || slug;
      }

      // Calculate grid offsets — 1 mile ~= 0.0145 degrees latitude, longitude varies by latitude
      const milesToLat = 0.01449; // approx degrees per mile
      const milesToLng = 0.01449 / Math.cos(centerLat * Math.PI / 180);

      const stepMiles = (radiusMiles * 2) / (gridSize - 1); // distance between adjacent grid points
      const half = (gridSize - 1) / 2;

      const points: Array<{ row: number; col: number; lat: number; lng: number }> = [];
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const latOffset = (row - half) * stepMiles * milesToLat;
          const lngOffset = (col - half) * stepMiles * milesToLng;
          points.push({
            row, col,
            lat: centerLat + latOffset,
            lng: centerLng + lngOffset,
          });
        }
      }

      // Create scan record
      const { rows: scanRows } = await query(
        `INSERT INTO local_heatmap_scans (client_slug, keyword, center_lat, center_lng, grid_size, radius_miles, business_name, cost_estimate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [slug, keyword, centerLat, centerLng, gridSize, radiusMiles, bizName, points.length * 0.0006]
      );
      const scanId = scanRows[0].id;

      // Run scans in parallel batches of 5 to avoid overwhelming the API
      const results: Array<{ row: number; col: number; lat: number; lng: number; position: number | null; topCompetitor: string | null }> = [];
      const BATCH_SIZE = 5;
      for (let i = 0; i < points.length; i += BATCH_SIZE) {
        const batch = points.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(batch.map(async (p) => {
          try {
            const listings = await seoService.searchBusinessListingsByCoordinate(keyword, p.lat, p.lng, 20);
            const matchIdx = listings.findIndex((l) =>
              l.title?.toLowerCase().includes((bizName || "").toLowerCase()) ||
              (bizName || "").toLowerCase().includes((l.title || "").toLowerCase())
            );
            return {
              row: p.row, col: p.col, lat: p.lat, lng: p.lng,
              position: matchIdx >= 0 ? matchIdx + 1 : null,
              topCompetitor: matchIdx > 0 ? (listings[0]?.title || null) : null,
            };
          } catch (err) {
            console.error(`Heatmap scan failed at (${p.row},${p.col}):`, err);
            return { row: p.row, col: p.col, lat: p.lat, lng: p.lng, position: null, topCompetitor: null };
          }
        }));
        results.push(...batchResults);
      }

      // Insert all grid points
      const valuePlaceholders: string[] = [];
      const params: unknown[] = [];
      let idx = 1;
      for (const r of results) {
        valuePlaceholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`);
        params.push(scanId, r.row, r.col, r.lat, r.lng, r.position, r.position !== null, r.topCompetitor);
        idx += 8;
      }
      await query(
        `INSERT INTO local_heatmap_points (scan_id, grid_row, grid_col, latitude, longitude, position, business_found, top_competitor)
         VALUES ${valuePlaceholders.join(", ")}`,
        params
      );

      // Calculate stats
      const found = results.filter((r) => r.position !== null);
      const top3 = found.filter((r) => r.position! <= 3);
      const top10 = found.filter((r) => r.position! <= 10);
      const avgPosition = found.length > 0 ? found.reduce((s, r) => s + r.position!, 0) / found.length : null;

      res.json({
        scanId,
        keyword,
        gridSize,
        radiusMiles,
        businessName: bizName,
        totalPoints: results.length,
        pointsFound: found.length,
        top3Count: top3.length,
        top10Count: top10.length,
        averagePosition: avgPosition,
        coverage: ((found.length / results.length) * 100).toFixed(0) + "%",
        points: results,
      });
    } catch (err) {
      console.error("Heatmap scan error:", err);
      res.status(500).json({ error: err instanceof Error ? err.message : "Heatmap scan failed" });
    }
  });

  /** List heatmap scans for a client */
  router.get("/seo/clients/:slug/heatmap/scans", async (req, res) => {
    try {
      const { rows } = await query(
        `SELECT s.*, COUNT(p.id) as point_count,
          COUNT(CASE WHEN p.position IS NOT NULL THEN 1 END) as found_count,
          COUNT(CASE WHEN p.position <= 3 THEN 1 END) as top3_count
         FROM local_heatmap_scans s
         LEFT JOIN local_heatmap_points p ON p.scan_id = s.id
         WHERE s.client_slug = $1
         GROUP BY s.id
         ORDER BY s.scanned_at DESC LIMIT 50`,
        [req.params.slug]
      );
      res.json(rows);
    } catch (err) { res.status(500).json({ error: "Failed to list heatmap scans" }); }
  });

  /** Get single heatmap scan with all grid points */
  router.get("/seo/clients/:slug/heatmap/scans/:scanId", async (req, res) => {
    try {
      const { rows: scanRows } = await query(
        "SELECT * FROM local_heatmap_scans WHERE id = $1 AND client_slug = $2",
        [req.params.scanId, req.params.slug]
      );
      if (!scanRows[0]) { res.status(404).json({ error: "Scan not found" }); return; }

      const { rows: points } = await query(
        "SELECT * FROM local_heatmap_points WHERE scan_id = $1 ORDER BY grid_row, grid_col",
        [req.params.scanId]
      );
      res.json({ scan: scanRows[0], points });
    } catch (err) { res.status(500).json({ error: "Failed to get heatmap scan" }); }
  });

  /** Delete a heatmap scan */
  router.delete("/seo/clients/:slug/heatmap/scans/:scanId", async (req, res) => {
    try {
      await query("DELETE FROM local_heatmap_scans WHERE id = $1 AND client_slug = $2",
        [req.params.scanId, req.params.slug]);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to delete scan" }); }
  });

  // ═══════════════════════════════════════════════
  //  DELIVERABLES — Import from Google Sheet
  // ═══════════════════════════════════════════════

  router.post("/cm/clients/:clientId/deliverables/import-sheet", async (req, res) => {
    const { sheetId } = req.body;
    if (!sheetId) { res.status(400).json({ error: "sheetId is required" }); return; }
    if (!authService?.isAuthenticated()) { res.status(400).json({ error: "Google Drive not configured" }); return; }

    try {
      const driveService = new GoogleDriveService(authService.getClient());
      const sheet = await driveService.readGoogleSheet(sheetId);
      const rows = sheet.values || [];
      if (rows.length < 2) { res.status(400).json({ error: "Sheet is empty" }); return; }

      const clientId = parseInt(req.params.clientId);

      // Delete existing deliverables for this client to re-import
      await query("DELETE FROM cm_marketing_plan WHERE client_id = $1", [clientId]);

      let currentCategory = "";
      let imported = 0;

      for (const row of rows) {
        const col0 = (row[0] || "").trim();
        const col1 = (row[1] || "").trim();
        const col2 = (row[2] || "").trim();
        const col3 = (row[3] || "").trim();

        // Skip the header row
        if (col0 === "Marketing Plan:" || col0 === "") continue;

        // Category headers: rows with no col1 (no TRUE/FALSE) and only col0
        if (!col1 && !col2 && !col3) {
          currentCategory = col0;
          continue;
        }

        // Data row: item, included, deliverables, notes
        if (!currentCategory) currentCategory = "General";
        const isIncluded = col1.toUpperCase() === "TRUE";

        // Parse quantity from deliverables if it's just a number
        let quantityVal: number | null = null;
        let deliverables = col2;
        const numMatch = col2.match(/^(\d+)$/);
        if (numMatch) {
          quantityVal = parseInt(numMatch[1]);
          deliverables = "";
        }

        await query(
          `INSERT INTO cm_marketing_plan (client_id, category, item, is_included, quantity, deliverables, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [clientId, currentCategory, col0, isIncluded, quantityVal, deliverables || null, col3 || null]
        );
        imported++;
      }

      res.json({ success: true, imported });
    } catch (err) {
      console.error("Import deliverables sheet error:", err);
      res.status(500).json({ error: "Failed to import sheet" });
    }
  });

  return router;
}
