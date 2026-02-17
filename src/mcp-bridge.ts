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

function inputTypeToZod(type: InputType): z.ZodTypeAny {
  switch (type) {
    case "string":  return z.string();
    case "number":  return z.number();
    case "boolean": return z.boolean();
    case "array":   return z.array(z.unknown());
    case "object":  return z.record(z.unknown());
    default:        return z.string();
  }
}

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
