/**
 * ═══════════════════════════════════════════════════════════════
 *  Scheduler
 *  In-process cron scheduler backed by PostgreSQL for persistence.
 *  Jobs survive deploys — re-registered from DB on startup.
 * ═══════════════════════════════════════════════════════════════
 */

import cron from "node-cron";
import { query } from "./database.js";

// ── Interfaces ──────────────────────────────────────────────

export interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  cron_expression: string;
  job_type: "prompt" | "workflow" | "drive_sync";
  config: Record<string, unknown>;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_result: string | null;
  last_error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRun {
  id: string;
  job_id: string;
  started_at: string;
  completed_at: string | null;
  status: "running" | "completed" | "failed";
  result: string | null;
  error: string | null;
  duration_ms: number | null;
}

export interface CreateJobInput {
  name: string;
  description?: string;
  cron_expression: string;
  job_type: "prompt" | "workflow" | "drive_sync";
  config: Record<string, unknown>;
  enabled?: boolean;
  created_by?: string;
}

export interface JobExecutor {
  executePrompt(config: {
    prompt: string;
    agent_id?: string;
    discord_channel_id?: string;
    thread_id?: string;
  }): Promise<string>;
  executeWorkflow(config: {
    workflow_name: string;
    inputs?: Record<string, unknown>;
    discord_channel_id?: string;
  }): Promise<string>;
  executeDriveSync(config: {
    folder_id: string;
  }): Promise<string>;
}

// ── Scheduler ───────────────────────────────────────────────

export class Scheduler {
  private tasks = new Map<string, cron.ScheduledTask>();
  private executor: JobExecutor;

  constructor(executor: JobExecutor) {
    this.executor = executor;
  }

  async start(): Promise<void> {
    const jobs = await this.listEnabled();
    for (const job of jobs) {
      this.registerCronTask(job);
    }
    console.log(`[scheduler] Registered ${jobs.length} cron jobs`);
  }

  stop(): void {
    for (const task of this.tasks.values()) {
      task.stop();
    }
    this.tasks.clear();
  }

  private registerCronTask(job: ScheduledJob): void {
    // Stop existing task if re-registering
    if (this.tasks.has(job.id)) {
      this.tasks.get(job.id)!.stop();
    }

    if (!cron.validate(job.cron_expression)) {
      console.error(`[scheduler] Invalid cron expression for "${job.name}": ${job.cron_expression}`);
      return;
    }

    const task = cron.schedule(job.cron_expression, () => {
      this.executeJob(job).catch((err) => {
        console.error(`[scheduler] Job "${job.name}" unhandled error:`, err);
      });
    });

    this.tasks.set(job.id, task);
  }

  private async executeJob(job: ScheduledJob): Promise<void> {
    console.log(`[scheduler] Running job "${job.name}" (${job.job_type})`);

    // Insert job_run row
    const { rows: runRows } = await query(
      `INSERT INTO job_runs (job_id, status) VALUES ($1, 'running') RETURNING id`,
      [job.id]
    );
    const runId = runRows[0].id;
    const startTime = Date.now();

    let result: string | undefined;
    let error: string | undefined;

    try {
      switch (job.job_type) {
        case "prompt":
          result = await this.executor.executePrompt(job.config as any);
          break;
        case "workflow":
          result = await this.executor.executeWorkflow(job.config as any);
          break;
        case "drive_sync":
          result = await this.executor.executeDriveSync(job.config as any);
          break;
        default:
          throw new Error(`Unknown job type: ${job.job_type}`);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error(`[scheduler] Job "${job.name}" failed:`, error);
    }

    const durationMs = Date.now() - startTime;
    const status = error ? "failed" : "completed";

    // Update job_run
    await query(
      `UPDATE job_runs SET status = $1, result = $2, error = $3, completed_at = NOW(), duration_ms = $4 WHERE id = $5`,
      [status, result?.slice(0, 50000) ?? null, error ?? null, durationMs, runId]
    );

    // Update job metadata
    await query(
      `UPDATE scheduled_jobs SET last_run_at = NOW(), last_result = $1, last_error = $2, updated_at = NOW() WHERE id = $3`,
      [result?.slice(0, 10000) ?? null, error ?? null, job.id]
    );
  }

  // ── CRUD ──────────────────────────────────────────────

  async createJob(data: CreateJobInput): Promise<ScheduledJob> {
    if (!cron.validate(data.cron_expression)) {
      throw new Error(`Invalid cron expression: ${data.cron_expression}`);
    }

    const { rows } = await query(
      `INSERT INTO scheduled_jobs (name, description, cron_expression, job_type, config, enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.name,
        data.description ?? "",
        data.cron_expression,
        data.job_type,
        JSON.stringify(data.config),
        data.enabled !== false,
        data.created_by ?? null,
      ]
    );

    const job = rows[0] as ScheduledJob;
    if (job.enabled) {
      this.registerCronTask(job);
    }
    return job;
  }

  async updateJob(id: string, data: Partial<CreateJobInput>): Promise<ScheduledJob | null> {
    if (data.cron_expression && !cron.validate(data.cron_expression)) {
      throw new Error(`Invalid cron expression: ${data.cron_expression}`);
    }

    // Build dynamic update
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { sets.push(`name = $${idx++}`); values.push(data.name); }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); values.push(data.description); }
    if (data.cron_expression !== undefined) { sets.push(`cron_expression = $${idx++}`); values.push(data.cron_expression); }
    if (data.job_type !== undefined) { sets.push(`job_type = $${idx++}`); values.push(data.job_type); }
    if (data.config !== undefined) { sets.push(`config = $${idx++}`); values.push(JSON.stringify(data.config)); }
    if (data.enabled !== undefined) { sets.push(`enabled = $${idx++}`); values.push(data.enabled); }

    if (sets.length === 0) return this.getJob(id);

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE scheduled_jobs SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) return null;

    const job = rows[0] as ScheduledJob;

    // Re-register or stop the cron task
    if (job.enabled) {
      this.registerCronTask(job);
    } else if (this.tasks.has(job.id)) {
      this.tasks.get(job.id)!.stop();
      this.tasks.delete(job.id);
    }

    return job;
  }

  async deleteJob(id: string): Promise<boolean> {
    // Stop the cron task
    if (this.tasks.has(id)) {
      this.tasks.get(id)!.stop();
      this.tasks.delete(id);
    }

    const { rowCount } = await query("DELETE FROM scheduled_jobs WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getJob(id: string): Promise<ScheduledJob | null> {
    const { rows } = await query("SELECT * FROM scheduled_jobs WHERE id = $1", [id]);
    return (rows[0] as ScheduledJob) || null;
  }

  async listAll(): Promise<ScheduledJob[]> {
    const { rows } = await query("SELECT * FROM scheduled_jobs ORDER BY created_at DESC");
    return rows as ScheduledJob[];
  }

  async listEnabled(): Promise<ScheduledJob[]> {
    const { rows } = await query("SELECT * FROM scheduled_jobs WHERE enabled = true ORDER BY name");
    return rows as ScheduledJob[];
  }

  async getJobRuns(jobId: string, limit = 20): Promise<JobRun[]> {
    const { rows } = await query(
      "SELECT * FROM job_runs WHERE job_id = $1 ORDER BY started_at DESC LIMIT $2",
      [jobId, limit]
    );
    return rows as JobRun[];
  }

  async triggerNow(jobId: string): Promise<string> {
    const job = await this.getJob(jobId);
    if (!job) throw new Error("Job not found");
    await this.executeJob(job);
    return `Job "${job.name}" triggered successfully`;
  }
}
