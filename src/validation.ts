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

// ── Message schemas ───────────────────────────────────────────

export const createMessageSchema = z.object({
  content: z.string().min(1).max(100000),
});

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

// ── Workflow run validation ───────────────────────────────────

export const workflowRunSchema = z.record(z.unknown());
