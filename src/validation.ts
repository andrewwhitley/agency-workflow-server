/**
 * Shared validation schemas and utilities.
 */

import { z, ZodTypeAny } from "zod";
import type { InputType, InputDef } from "./workflow-engine.js";

// ── Zod schema helper (extracted from mcp-bridge.ts) ─────────

export function inputTypeToZod(type: InputType): ZodTypeAny {
  switch (type) {
    case "string":  return z.string();
    case "number":  return z.number();
    case "boolean": return z.boolean();
    case "array":   return z.array(z.unknown());
    case "object":  return z.record(z.unknown());
    default:        return z.string();
  }
}

// ── Agent schemas ─────────────────────────────────────────────

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(""),
  system_prompt: z.string().max(50000).default("You are a helpful assistant."),
  model: z.string().default("claude-sonnet-4-5-20250929"),
  max_tokens: z.number().int().min(1).max(64000).default(4096),
  temperature: z.number().min(0).max(1).default(0.7),
});

export const updateAgentSchema = createAgentSchema.partial();

// ── Thread schemas ────────────────────────────────────────────

export const createThreadSchema = z.object({
  title: z.string().max(200).optional(),
  agent_id: z.string().uuid(),
  client: z.string().max(100).optional(),
  created_by: z.string().max(200).optional(),
});

export const updateThreadSchema = z.object({
  title: z.string().max(200).optional(),
  archived: z.boolean().optional(),
});

// ── Attachment schema ─────────────────────────────────────────

export const attachmentSchema = z.object({
  name: z.string().min(1).max(500),
  mime_type: z.string().min(1).max(200),
  data: z.string().max(30_000_000), // base64, ~22MB raw
});

// ── Message schemas ───────────────────────────────────────────

export const createMessageSchema = z.object({
  content: z.string().min(0).max(100000),
  attachments: z.array(attachmentSchema).max(5).optional(),
}).refine(
  (d) => (d.content && d.content.trim().length > 0) || (d.attachments && d.attachments.length > 0),
  { message: "Either content or attachments must be provided" },
);

// ── Training doc schemas ──────────────────────────────────────

export const createTrainingDocSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(200000),
  doc_type: z.enum(["reference", "example", "instruction", "context"]).default("reference"),
  source: z.string().max(500).optional(),
});

// ── Task schemas ─────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(10000).default(""),
  status: z.enum(["open", "in_progress", "completed", "blocked"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  due_date: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  thread_id: z.string().uuid().optional(),
  created_by: z.string().max(200).optional(),
  assigned_to: z.string().max(200).optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ── Memory schemas ───────────────────────────────────────────

export const upsertMemorySchema = z.object({
  key: z.string().min(1).max(300),
  content: z.string().min(1).max(50000),
  category: z.string().max(100).optional(),
  created_by: z.string().max(200).optional(),
});

// ── Content Factory schemas ──────────────────────────────────

export const subServiceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const coreServiceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subServices: z.array(subServiceSchema).optional(),
});

export const storyBrandSchema = z.object({
  hero: z.string().max(2000),
  problem: z.string().max(2000),
  guide: z.string().max(2000),
  plan: z.string().max(2000),
  callToAction: z.string().max(500),
  avoidFailure: z.string().max(2000),
  achieveSuccess: z.string().max(2000),
});

export const brandVoiceSchema = z.object({
  tone: z.string().max(500),
  style: z.string().max(500),
  avoidWords: z.array(z.string().max(100)).optional(),
  preferWords: z.array(z.string().max(100)).optional(),
});

export const contentProfileSchema = z.object({
  businessType: z.string().min(1).max(200),
  tagline: z.string().max(500).optional(),
  cities: z.array(z.string().max(200)).optional(),
  coreServices: z.array(coreServiceSchema).optional(),
  storybrand: storyBrandSchema.optional(),
  brandVoice: brandVoiceSchema.optional(),
  contentPrompts: z.record(z.string().max(10000)).optional(),
});

export const contentFactoryInputSchema = z.object({
  clientSlug: z.string().max(200).optional(),
  contentProfile: contentProfileSchema.optional(),
  contentTypes: z.array(z.enum(["website-page", "blog-post", "gbp-post"])).optional(),
  dryRun: z.boolean().optional(),
  outputFolderId: z.string().max(200).optional(),
});

// ── Content Planner schemas ──────────────────────────────────

export const contentPlannerInputSchema = z.object({
  clientName: z.string().min(1).max(200),
  clientSlug: z.string().max(200).optional(),
  domain: z.string().max(500).optional(),
  contentProfile: contentProfileSchema.optional(),
  postsPerMonth: z.number().int().min(1).max(20).optional(),
  includesCaseStudies: z.boolean().optional(),
  startMonth: z.number().int().min(1).max(12).optional(),
  startYear: z.number().int().min(2024).max(2030).optional(),
});

// ── Content Management schemas ───────────────────────────────

export const contentGenerateRequestSchema = z.object({
  pageNames: z.array(z.string().max(300)).optional(),
  enableQA: z.boolean().optional(),
  qaPassThreshold: z.number().min(0).max(100).optional(),
  outputFolderId: z.string().max(200).optional(),
  contentTypes: z.array(z.enum(["website-page", "blog-post", "gbp-post"])).optional(),
});

export const updateClientConfigSchema = z.object({
  fulfillmentFolderId: z.string().max(200).optional(),
  outputFolder: z.string().max(200).optional(),
  planningSheetId: z.string().max(200).optional(),
  contentProfile: contentProfileSchema.optional(),
});

// ── Scheduled Job schemas ────────────────────────────────────

export const createScheduledJobSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  cron_expression: z.string().min(1).max(100),
  job_type: z.enum(["prompt", "workflow", "drive_sync"]),
  config: z.record(z.unknown()),
  enabled: z.boolean().optional(),
  created_by: z.string().max(200).optional(),
});

export const updateScheduledJobSchema = createScheduledJobSchema.partial();

// ── Workflow run validation ───────────────────────────────────

export const workflowRunSchema = z.record(z.unknown());
