/**
 * ═══════════════════════════════════════════════════════════════
 *  Workflow Engine
 *  Define multi-step workflows with simple, declarative configs.
 * ═══════════════════════════════════════════════════════════════
 */

export type InputType = "string" | "number" | "boolean" | "array" | "object";

export interface InputDef {
  type: InputType;
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface WorkflowContext {
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  state: Record<string, unknown>;
  log: (message: string) => void;
}

export interface WorkflowStep {
  id: string;
  description?: string;
  action: (ctx: WorkflowContext) => Promise<unknown>;
  condition?: (ctx: WorkflowContext) => boolean;
  onError?: (error: Error, ctx: WorkflowContext) => Promise<unknown>;
  retries?: number;
  retryDelay?: number;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
  inputs?: Record<string, InputType | InputDef>;
  tags?: string[];
  category?: string;
}

export interface WorkflowResult {
  success: boolean;
  workflow: string;
  stepResults: Record<string, unknown>;
  logs: string[];
  durationMs: number;
  error?: string;
  failedStep?: string;
}

/** In-memory run history for the dashboard */
export interface WorkflowRun {
  id: string;
  workflow: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  inputs: Record<string, unknown>;
  result?: WorkflowResult;
}

export class WorkflowEngine {
  private workflows = new Map<string, WorkflowDefinition>();
  private runHistory: WorkflowRun[] = [];
  private maxHistory = 200;

  register(definition: WorkflowDefinition): void {
    this.validate(definition);
    this.workflows.set(definition.name, definition);
  }

  unregister(name: string): boolean {
    return this.workflows.delete(name);
  }

  get(name: string): WorkflowDefinition | undefined {
    return this.workflows.get(name);
  }

  list(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  getHistory(): WorkflowRun[] {
    return [...this.runHistory];
  }

  getStats() {
    const total = this.runHistory.length;
    const successes = this.runHistory.filter((r) => r.status === "success").length;
    const failures = this.runHistory.filter((r) => r.status === "failed").length;
    const running = this.runHistory.filter((r) => r.status === "running").length;
    const avgDuration =
      total > 0
        ? Math.round(
            this.runHistory
              .filter((r) => r.durationMs)
              .reduce((sum, r) => sum + (r.durationMs ?? 0), 0) /
              Math.max(1, total - running)
          )
        : 0;

    // Per-workflow stats
    const byWorkflow: Record<string, { runs: number; successes: number; avgMs: number }> = {};
    for (const run of this.runHistory) {
      if (!byWorkflow[run.workflow]) {
        byWorkflow[run.workflow] = { runs: 0, successes: 0, avgMs: 0 };
      }
      byWorkflow[run.workflow].runs++;
      if (run.status === "success") byWorkflow[run.workflow].successes++;
      if (run.durationMs) {
        byWorkflow[run.workflow].avgMs += run.durationMs;
      }
    }
    for (const key of Object.keys(byWorkflow)) {
      const entry = byWorkflow[key];
      entry.avgMs = entry.runs > 0 ? Math.round(entry.avgMs / entry.runs) : 0;
    }

    return { total, successes, failures, running, avgDuration, byWorkflow };
  }

  async run(name: string, inputs: Record<string, unknown> = {}): Promise<WorkflowResult> {
    const definition = this.workflows.get(name);
    if (!definition) {
      return {
        success: false,
        workflow: name,
        stepResults: {},
        logs: [`Workflow "${name}" not found.`],
        durationMs: 0,
        error: `Workflow "${name}" not found.`,
      };
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const runRecord: WorkflowRun = {
      id: runId,
      workflow: name,
      status: "running",
      startedAt: new Date().toISOString(),
      inputs,
    };
    this.runHistory.unshift(runRecord);
    if (this.runHistory.length > this.maxHistory) this.runHistory.pop();

    const logs: string[] = [];
    const startTime = Date.now();
    const resolvedInputs = this.resolveDefaults(definition, inputs);

    const ctx: WorkflowContext = {
      inputs: resolvedInputs,
      results: {},
      state: {},
      log: (msg: string) => logs.push(`[${new Date().toISOString()}] ${msg}`),
    };

    ctx.log(`▶ Starting workflow: ${name}`);

    for (const step of definition.steps) {
      if (step.condition && !step.condition(ctx)) {
        ctx.log(`⏭ Skipping step "${step.id}"`);
        continue;
      }

      ctx.log(`⚙ Running step: ${step.id}${step.description ? ` — ${step.description}` : ""}`);

      try {
        const result = await this.executeWithRetry(step, ctx);
        ctx.results[step.id] = result;
        ctx.log(`✓ Step "${step.id}" completed`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        ctx.log(`✗ Step "${step.id}" failed: ${errMsg}`);

        const result: WorkflowResult = {
          success: false,
          workflow: name,
          stepResults: ctx.results,
          logs,
          durationMs: Date.now() - startTime,
          error: errMsg,
          failedStep: step.id,
        };

        runRecord.status = "failed";
        runRecord.completedAt = new Date().toISOString();
        runRecord.durationMs = result.durationMs;
        runRecord.result = result;
        return result;
      }
    }

    ctx.log(`✔ Workflow "${name}" completed`);

    const result: WorkflowResult = {
      success: true,
      workflow: name,
      stepResults: ctx.results,
      logs,
      durationMs: Date.now() - startTime,
    };

    runRecord.status = "success";
    runRecord.completedAt = new Date().toISOString();
    runRecord.durationMs = result.durationMs;
    runRecord.result = result;
    return result;
  }

  private validate(def: WorkflowDefinition): void {
    if (!def.name?.trim()) throw new Error("Workflow must have a name.");
    if (!def.steps?.length) throw new Error("Workflow must have at least one step.");
    const ids = new Set<string>();
    for (const step of def.steps) {
      if (!step.id) throw new Error("Every step must have an id.");
      if (ids.has(step.id)) throw new Error(`Duplicate step id: "${step.id}"`);
      ids.add(step.id);
    }
  }

  private resolveDefaults(def: WorkflowDefinition, inputs: Record<string, unknown>): Record<string, unknown> {
    const resolved = { ...inputs };
    if (def.inputs) {
      for (const [key, spec] of Object.entries(def.inputs)) {
        if (resolved[key] === undefined) {
          const inputDef = typeof spec === "string" ? null : spec;
          if (inputDef?.default !== undefined) resolved[key] = inputDef.default;
        }
      }
    }
    return resolved;
  }

  private async executeWithRetry(step: WorkflowStep, ctx: WorkflowContext): Promise<unknown> {
    const maxAttempts = (step.retries ?? 0) + 1;
    const delay = step.retryDelay ?? 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await step.action(ctx);
      } catch (error) {
        if (attempt < maxAttempts) {
          ctx.log(`⟳ Retrying step "${step.id}" (${attempt + 1}/${maxAttempts})...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if (step.onError) {
          return await step.onError(error instanceof Error ? error : new Error(String(error)), ctx);
        }
        throw error;
      }
    }
  }
}
