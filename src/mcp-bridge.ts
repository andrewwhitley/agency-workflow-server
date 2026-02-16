/**
 * ═══════════════════════════════════════════════════════════════
 *  MCP ↔ Workflow Bridge
 * ═══════════════════════════════════════════════════════════════
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import { WorkflowEngine, InputType, InputDef } from "./workflow-engine.js";

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
