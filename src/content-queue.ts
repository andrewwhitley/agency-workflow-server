/**
 * Content generation job queue with concurrency control.
 * Prevents server overload from concurrent LLM calls.
 */

export interface ContentJob {
  id: string;
  clientSlug: string;
  pageName: string;
  status: "queued" | "running" | "completed" | "failed";
  error?: string;
  result?: unknown;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

type JobExecutor = (job: ContentJob) => Promise<unknown>;

export class ContentQueue {
  private queue: ContentJob[] = [];
  private running = 0;
  private maxConcurrency: number;
  private executor: JobExecutor | null = null;
  private listeners = new Map<string, Array<() => void>>();

  constructor(maxConcurrency?: number) {
    this.maxConcurrency = maxConcurrency ?? parseInt(process.env.CONTENT_QUEUE_CONCURRENCY || "2", 10);
  }

  setExecutor(fn: JobExecutor): void {
    this.executor = fn;
  }

  enqueue(job: Omit<ContentJob, "status" | "createdAt">): ContentJob {
    const full: ContentJob = { ...job, status: "queued", createdAt: new Date() };
    this.queue.push(full);
    this.processNext();
    return full;
  }

  getJob(id: string): ContentJob | undefined {
    return this.queue.find((j) => j.id === id);
  }

  getJobsByPrefix(prefix: string): ContentJob[] {
    return this.queue.filter((j) => j.id.startsWith(prefix));
  }

  listJobs(): ContentJob[] {
    return [...this.queue];
  }

  get stats() {
    const queued = this.queue.filter((j) => j.status === "queued").length;
    const running = this.running;
    const completed = this.queue.filter((j) => j.status === "completed").length;
    const failed = this.queue.filter((j) => j.status === "failed").length;
    return { queued, running, completed, failed, total: this.queue.length };
  }

  /** Wait for all jobs with a given prefix to finish */
  waitForPrefix(prefix: string): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        const jobs = this.getJobsByPrefix(prefix);
        if (jobs.every((j) => j.status === "completed" || j.status === "failed")) {
          resolve();
        }
      };
      check();
      // Poll-based since jobs complete async
      const interval = setInterval(() => {
        check();
        const jobs = this.getJobsByPrefix(prefix);
        if (jobs.every((j) => j.status === "completed" || j.status === "failed")) {
          clearInterval(interval);
        }
      }, 500);
    });
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrency || !this.executor) return;

    const next = this.queue.find((j) => j.status === "queued");
    if (!next) return;

    next.status = "running";
    next.startedAt = new Date();
    this.running++;

    try {
      next.result = await this.executor(next);
      next.status = "completed";
    } catch (err) {
      next.status = "failed";
      next.error = err instanceof Error ? err.message : String(err);
    } finally {
      next.completedAt = new Date();
      this.running--;
      this.processNext(); // Pick up next queued job
    }
  }

  /** Clear completed/failed jobs older than given ms */
  cleanup(olderThanMs = 3600000): void {
    const cutoff = Date.now() - olderThanMs;
    this.queue = this.queue.filter(
      (j) => j.status === "queued" || j.status === "running" || j.createdAt.getTime() > cutoff
    );
  }
}

/** Singleton queue instance */
export const contentQueue = new ContentQueue();
