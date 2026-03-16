/**
 * ═══════════════════════════════════════════════════════════════
 *  MCP ↔ Workflow Bridge
 * ═══════════════════════════════════════════════════════════════
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import { WorkflowEngine, InputType, InputDef } from "./workflow-engine.js";
import { KnowledgeBase } from "./knowledge-base.js";
import { SOPParser } from "./sop-parser.js";
import { ClientAgent } from "./client-agent.js";
import { inputTypeToZod, contentProfileSchema, contentFactoryInputSchema, contentPlannerInputSchema, keywordEnrichSchema, keywordSuggestSchema } from "./validation.js";
import { threadService } from "./thread-service.js";
import { taskService } from "./task-service.js";
import { memoryService } from "./memory-service.js";
import { buildContentPlan, runContentFactory, getRunStatus, type ContentProfile, type ContentType } from "./content-factory.js";
import { generateContentStrategy, strategyToCSV, type ContentPlannerInput } from "./content-planner.js";
import { loadClientConfig } from "./workbook-service.js";
import { GoogleDriveService } from "./google-drive.js";
import type { GoogleAuthService } from "./google-auth.js";
import type { DataForSEOService } from "./dataforseo.js";

function buildZodShape(inputs: Record<string, InputType | InputDef> | undefined): ZodRawShape {
  const shape: ZodRawShape = {};
  if (!inputs) return shape;
  for (const [key, spec] of Object.entries(inputs)) {
    const typeName = typeof spec === "string" ? spec : spec.type;
    const def = typeof spec === "string" ? undefined : spec;
    let schema = inputTypeToZod(typeName);
    if (def?.description) schema = schema.describe(def.description);
    if (def?.required === false) schema = schema.optional() as z.ZodTypeAny;
    shape[key] = schema;
  }
  return shape;
}

export function bridgeWorkflowsToMcp(server: McpServer, engine: WorkflowEngine): void {
  // Management tools
  server.tool("list_workflows", "List all available workflows", {}, async () => ({
    content: [{
      type: "text" as const,
      text: JSON.stringify(engine.list().map((w) => ({
        name: w.name,
        description: w.description,
        category: w.category,
        tags: w.tags ?? [],
        steps: w.steps.map((s) => s.id),
      })), null, 2),
    }],
  }));

  server.tool(
    "describe_workflow",
    "Get detailed info about a specific workflow",
    { workflow_name: z.string() },
    async ({ workflow_name }) => {
      const wf = engine.get(workflow_name);
      if (!wf) return { content: [{ type: "text" as const, text: `Not found: "${workflow_name}"` }], isError: true };
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            ...wf,
            steps: wf.steps.map((s) => ({
              id: s.id,
              description: s.description,
              hasCondition: !!s.condition,
              retries: s.retries ?? 0,
            })),
          }, null, 2),
        }],
      };
    }
  );

  // Register each workflow as a tool
  for (const wf of engine.list()) {
    const toolName = `run_${wf.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    server.tool(toolName, `Run workflow: ${wf.description}`, buildZodShape(wf.inputs), async (args) => {
      const result = await engine.run(wf.name, args as Record<string, unknown>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result.success ? { success: true, results: result.stepResults, durationMs: result.durationMs } : { success: false, error: result.error, failedStep: result.failedStep, partialResults: result.stepResults }, null, 2) }],
        isError: !result.success,
      };
    });
  }
}

export function bridgeKnowledgeToMcp(
  server: McpServer,
  knowledgeBase: KnowledgeBase,
  sopParser: SOPParser,
  clientAgent: ClientAgent
): void {
  // search_knowledge — Search agency knowledge base
  server.tool(
    "search_knowledge",
    "Search the agency knowledge base by query, client name, or document type",
    {
      query: z.string().describe("Search query"),
      client: z.string().optional().describe("Filter by client name"),
      type: z.enum(["sop", "client-doc"]).optional().describe("Filter by document type"),
    },
    async ({ query, client, type }) => {
      const results = knowledgeBase.search(query, { client, type });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(
            results.map((r) => ({
              name: r.document.name,
              path: r.document.path,
              client: r.document.client,
              type: r.document.type,
              score: r.score,
              matchedTerms: r.matchedTerms,
              preview: r.document.contentPreview,
            })),
            null,
            2
          ),
        }],
      };
    }
  );

  // get_client_context — Get a client's full profile, docs, and SOPs
  server.tool(
    "get_client_context",
    "Get a client's full profile including documents, SOPs, brand voice, goals, and KPIs",
    {
      client_name: z.string().describe("The client name"),
    },
    async ({ client_name }) => {
      const context = knowledgeBase.getClientContext(client_name);
      const profile = clientAgent.getProfile(client_name);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(
            {
              profile: profile || null,
              documents: context.documents.map((d) => ({
                name: d.name,
                path: d.path,
                preview: d.contentPreview,
              })),
              sops: context.sops.map((d) => ({
                name: d.name,
                path: d.path,
                preview: d.contentPreview,
              })),
              docCount: context.docCount,
            },
            null,
            2
          ),
        }],
      };
    }
  );

  // ask_client_agent — Ask a question about a client
  server.tool(
    "ask_client_agent",
    "Ask a natural-language question about a specific client, answered from their documents",
    {
      client_name: z.string().describe("The client name"),
      question: z.string().describe("The question to ask"),
    },
    async ({ client_name, question }) => {
      const result = clientAgent.answer(client_name, question);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    }
  );

  // list_sops — List all available SOPs
  server.tool(
    "list_sops",
    "List all available Standard Operating Procedures in the knowledge base",
    {},
    async () => {
      const sops = knowledgeBase.getSOPs();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(
            sops.map((s) => ({
              id: s.id,
              name: s.name,
              client: s.client,
              path: s.path,
              preview: s.contentPreview,
            })),
            null,
            2
          ),
        }],
      };
    }
  );

  // get_sop_details — Get parsed steps for a specific SOP
  server.tool(
    "get_sop_details",
    "Get the parsed steps and checklist items for a specific SOP document",
    {
      sop_id: z.string().describe("The SOP document ID"),
    },
    async ({ sop_id }) => {
      const sops = knowledgeBase.getSOPs();
      const doc = sops.find((s) => s.id === sop_id);
      if (!doc) {
        return {
          content: [{ type: "text" as const, text: `SOP not found: "${sop_id}"` }],
          isError: true,
        };
      }
      const parsed = sopParser.parse(doc);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(parsed, null, 2),
        }],
      };
    }
  );
}

// ═══════════════════════════════════════════════════════════════
//  Thread MCP Bridge
// ═══════════════════════════════════════════════════════════════

export function bridgeThreadsToMcp(server: McpServer): void {
  server.tool(
    "list_threads",
    "List conversation threads, optionally filtered by agent_id, client, or archived status",
    {
      agent_id: z.string().uuid().optional().describe("Filter by agent ID"),
      client: z.string().optional().describe("Filter by client name"),
      archived: z.boolean().optional().describe("Filter by archived status"),
    },
    async ({ agent_id, client, archived }) => {
      const threads = await threadService.list({ agent_id, client, archived });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(threads, null, 2) }],
      };
    }
  );

  server.tool(
    "get_thread",
    "Get a thread with its recent messages",
    {
      thread_id: z.string().uuid().describe("The thread ID"),
      message_limit: z.number().int().min(1).max(200).optional().describe("Max messages to return (default 50)"),
    },
    async ({ thread_id, message_limit }) => {
      const thread = await threadService.getById(thread_id);
      if (!thread) {
        return { content: [{ type: "text" as const, text: `Thread not found: "${thread_id}"` }], isError: true };
      }
      const messages = await threadService.getMessages(thread_id, message_limit ?? 50);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...thread, messages }, null, 2) }],
      };
    }
  );

  server.tool(
    "create_thread",
    "Create a new conversation thread with an agent",
    {
      agent_id: z.string().uuid().describe("The agent ID to use"),
      title: z.string().max(200).optional().describe("Thread title"),
      client: z.string().max(100).optional().describe("Client name"),
      created_by: z.string().max(200).optional().describe("Who created this thread"),
    },
    async ({ agent_id, title, client, created_by }) => {
      const thread = await threadService.create({ agent_id, title, client, created_by });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(thread, null, 2) }],
      };
    }
  );

  server.tool(
    "add_message",
    "Add a message to a thread",
    {
      thread_id: z.string().uuid().describe("The thread ID"),
      role: z.enum(["user", "assistant"]).describe("Message role"),
      content: z.string().min(1).describe("Message content"),
    },
    async ({ thread_id, role, content }) => {
      const thread = await threadService.getById(thread_id);
      if (!thread) {
        return { content: [{ type: "text" as const, text: `Thread not found: "${thread_id}"` }], isError: true };
      }
      const message = await threadService.addMessage(thread_id, role, content);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(message, null, 2) }],
      };
    }
  );
}

// ═══════════════════════════════════════════════════════════════
//  Task MCP Bridge
// ═══════════════════════════════════════════════════════════════

export function bridgeTasksToMcp(server: McpServer): void {
  server.tool(
    "list_tasks",
    "List tasks, optionally filtered by status, priority, tags, thread_id, or assigned_to",
    {
      status: z.enum(["open", "in_progress", "completed", "blocked"]).optional().describe("Filter by status"),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Filter by priority"),
      tags: z.array(z.string()).optional().describe("Filter by tags (all must match)"),
      thread_id: z.string().uuid().optional().describe("Filter by linked thread"),
      assigned_to: z.string().optional().describe("Filter by assignee"),
    },
    async ({ status, priority, tags, thread_id, assigned_to }) => {
      const tasks = await taskService.list({ status, priority, tags, thread_id, assigned_to });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }],
      };
    }
  );

  server.tool(
    "create_task",
    "Create a new task with title, priority, tags, and optional thread link",
    {
      title: z.string().min(1).max(300).describe("Task title"),
      description: z.string().max(10000).optional().describe("Task description"),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Priority (default: medium)"),
      due_date: z.string().optional().describe("Due date (ISO 8601)"),
      tags: z.array(z.string()).optional().describe("Tags for categorization"),
      thread_id: z.string().uuid().optional().describe("Link to a thread"),
      created_by: z.string().optional().describe("Who created this task"),
      assigned_to: z.string().optional().describe("Who is assigned"),
    },
    async (args) => {
      const task = await taskService.create(args);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }],
      };
    }
  );

  server.tool(
    "update_task",
    "Update any fields on an existing task",
    {
      task_id: z.string().uuid().describe("The task ID"),
      title: z.string().min(1).max(300).optional().describe("New title"),
      description: z.string().max(10000).optional().describe("New description"),
      status: z.enum(["open", "in_progress", "completed", "blocked"]).optional().describe("New status"),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("New priority"),
      due_date: z.string().optional().describe("New due date (ISO 8601)"),
      tags: z.array(z.string()).optional().describe("Replace tags"),
      assigned_to: z.string().optional().describe("New assignee"),
    },
    async ({ task_id, ...updates }) => {
      const task = await taskService.update(task_id, updates);
      if (!task) {
        return { content: [{ type: "text" as const, text: `Task not found: "${task_id}"` }], isError: true };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }],
      };
    }
  );

  server.tool(
    "complete_task",
    "Mark a task as completed",
    {
      task_id: z.string().uuid().describe("The task ID to complete"),
    },
    async ({ task_id }) => {
      const task = await taskService.update(task_id, { status: "completed" });
      if (!task) {
        return { content: [{ type: "text" as const, text: `Task not found: "${task_id}"` }], isError: true };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(task, null, 2) }],
      };
    }
  );
}

// ═══════════════════════════════════════════════════════════════
//  Memory MCP Bridge
// ═══════════════════════════════════════════════════════════════

export function bridgeMemoriesToMcp(server: McpServer): void {
  server.tool(
    "save_memory",
    "Save or update a memory by key. Use this to persist information across sessions and devices.",
    {
      key: z.string().min(1).max(300).describe("Unique key for this memory"),
      content: z.string().min(1).max(50000).describe("The content to remember"),
      category: z.string().max(100).optional().describe("Category for organization"),
      created_by: z.string().optional().describe("Who saved this memory"),
    },
    async (args) => {
      const memory = await memoryService.upsert(args);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(memory, null, 2) }],
      };
    }
  );

  server.tool(
    "recall_memory",
    "Search memories by keyword across keys, content, and categories",
    {
      query: z.string().min(1).describe("Search keyword or phrase"),
    },
    async ({ query }) => {
      const results = await memoryService.search(query);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  server.tool(
    "list_memories",
    "List all saved memories, optionally filtered by category",
    {
      category: z.string().optional().describe("Filter by category"),
    },
    async ({ category }) => {
      const memories = await memoryService.list(category);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(memories, null, 2) }],
      };
    }
  );

  server.tool(
    "delete_memory",
    "Delete a memory by its key",
    {
      key: z.string().min(1).describe("The memory key to delete"),
    },
    async ({ key }) => {
      const deleted = await memoryService.delete(key);
      if (!deleted) {
        return { content: [{ type: "text" as const, text: `Memory not found: "${key}"` }], isError: true };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ success: true, deleted_key: key }) }],
      };
    }
  );
}

// ── Content Factory ───────────────────────────────────────

export function bridgeContentFactoryToMcp(server: McpServer, authService?: GoogleAuthService): void {
  server.tool(
    "generate_content_plan",
    "Generate a content plan (dry run) for a client. Returns the list of pages that would be created without actually generating content. Use this to preview before running the full factory.",
    {
      clientSlug: z.string().optional().describe("Client slug from local config (e.g. 'elevated-chiropractic')"),
      contentProfile: contentProfileSchema.optional().describe("Inline content profile — overrides client config if both provided"),
      contentTypes: z.array(z.enum(["website-page", "blog-post", "gbp-post"])).optional().describe("Content types to generate (default: website-page)"),
    },
    async ({ clientSlug, contentProfile, contentTypes }) => {
      try {
        const result = await runContentFactory({
          clientSlug,
          contentProfile: contentProfile as ContentProfile | undefined,
          contentTypes: contentTypes as ContentType[] | undefined,
          dryRun: true,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "run_content_factory",
    "Generate content for a client and save as Google Docs. Creates one Doc per page in a new folder in the client's Drive folder. Returns doc links and run status.",
    {
      clientSlug: z.string().optional().describe("Client slug from local config (e.g. 'elevated-chiropractic')"),
      contentProfile: contentProfileSchema.optional().describe("Inline content profile — overrides client config if both provided"),
      contentTypes: z.array(z.enum(["website-page", "blog-post", "gbp-post"])).optional().describe("Content types to generate (default: website-page)"),
      outputFolderId: z.string().optional().describe("Google Drive folder ID for output (overrides client config)"),
    },
    async ({ clientSlug, contentProfile, contentTypes, outputFolderId }) => {
      try {
        let driveService: GoogleDriveService | undefined;
        if (authService?.isAuthenticated()) {
          driveService = new GoogleDriveService(authService.getClient());
        }

        const result = await runContentFactory(
          {
            clientSlug,
            contentProfile: contentProfile as ContentProfile | undefined,
            contentTypes: contentTypes as ContentType[] | undefined,
            outputFolderId,
          },
          driveService
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_content_factory_status",
    "Check the status of a content factory run by its run ID.",
    {
      runId: z.string().describe("The run ID returned by run_content_factory"),
    },
    async ({ runId }) => {
      const status = getRunStatus(runId);
      if (!status) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "Run not found" }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }],
      };
    }
  );

  // ── Content Planner tools ─────────────────────────────────

  server.tool(
    "generate_content_strategy",
    "Generate a comprehensive content strategy for a client: primary sitemap (service pages, area pages, core pages) plus a 12-month SEO editorial calendar with blog topics, target keywords, and internal linking plan. Returns structured JSON or CSV.",
    {
      clientSlug: z.string().optional().describe("Client slug from local config (e.g. 'elevated-chiropractic')"),
      clientName: z.string().optional().describe("Business name (required if not using clientSlug)"),
      domain: z.string().optional().describe("Client website domain (e.g. 'example.com')"),
      contentProfile: contentProfileSchema.optional().describe("Inline content profile (overrides client config)"),
      postsPerMonth: z.number().optional().describe("Blog posts per month (default: 4)"),
      startMonth: z.number().optional().describe("Starting month 1-12 (default: current)"),
      startYear: z.number().optional().describe("Starting year (default: current)"),
      format: z.enum(["json", "csv"]).optional().describe("Output format (default: json)"),
    },
    async ({ clientSlug, clientName, domain, contentProfile, postsPerMonth, startMonth, startYear, format }) => {
      try {
        let profile = contentProfile as ContentProfile | undefined;
        let name = clientName || "";

        if (clientSlug) {
          const config = loadClientConfig(clientSlug);
          if (!config?.contentProfile) {
            return {
              content: [{ type: "text" as const, text: JSON.stringify({ error: `No content profile for client: ${clientSlug}` }) }],
              isError: true,
            };
          }
          profile = profile || config.contentProfile;
          name = name || config.name;
        }

        if (!profile) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "Provide contentProfile or a clientSlug with a configured profile" }) }],
            isError: true,
          };
        }

        const strategy = await generateContentStrategy({
          clientName: name,
          domain,
          contentProfile: profile,
          postsPerMonth,
          startMonth,
          startYear,
        });

        const output = format === "csv" ? strategyToCSV(strategy) : JSON.stringify(strategy, null, 2);
        return {
          content: [{ type: "text" as const, text: output }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );
}

// ═══════════════════════════════════════════════════════════════
//  Keyword Research MCP Bridge
// ═══════════════════════════════════════════════════════════════

export function bridgeKeywordResearchToMcp(server: McpServer, seoService?: DataForSEOService): void {
  if (!seoService?.isAuthenticated()) return;

  server.tool(
    "keyword_research",
    "Look up real search volume, CPC, competition, and difficulty for a list of keywords using DataForSEO / Google Ads data. Use this to validate keyword choices in content calendars.",
    {
      keywords: z.array(z.string()).min(1).max(700).describe("Keywords to look up (max 700)"),
      location_code: z.number().optional().describe("Location code (default: 2840 = United States)"),
    },
    async ({ keywords, location_code }) => {
      try {
        const metrics = await seoService.getKeywordMetrics(keywords, location_code);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ keywords: metrics, count: metrics.length }, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "keyword_suggestions",
    "Get keyword suggestions from a seed keyword using DataForSEO Labs. Returns related keywords with search volume, CPC, competition, and difficulty scores.",
    {
      seed: z.string().min(1).describe("Seed keyword to get suggestions for"),
      location_code: z.number().optional().describe("Location code (default: 2840 = United States)"),
      limit: z.number().optional().describe("Max results to return (default: 50, max: 200)"),
    },
    async ({ seed, location_code, limit }) => {
      try {
        const suggestions = await seoService.getKeywordSuggestions(seed, location_code, limit);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ keywords: suggestions, count: suggestions.length }, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    }
  );
}
