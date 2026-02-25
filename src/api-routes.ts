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
} from "./validation.js";
import type { WorkflowEngine } from "./workflow-engine.js";
import type { KnowledgeBase } from "./knowledge-base.js";
import type { GoogleAuthService } from "./google-auth.js";
import { GoogleDriveService } from "./google-drive.js";
import { listClients, loadClientConfig, createWorkbook } from "./workbook-service.js";

export function apiRouter(engine: WorkflowEngine, knowledgeBase: KnowledgeBase, authService?: GoogleAuthService): Router {
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

  return router;
}
