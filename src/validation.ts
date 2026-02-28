/**
 * Zod validation schemas for all health data endpoints.
 */

import { z } from "zod";

// ── Family Members ──────────────────────────────────────────

export const createFamilyMemberSchema = z.object({
  name: z.string().min(1).max(255),
  date_of_birth: z.string().optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  role: z.enum(["adult", "child"]).optional(),
  avatar_color: z.string().max(7).optional(),
  height_inches: z.number().positive().optional(),
  weight_lbs: z.number().positive().optional(),
  blood_type: z.string().max(10).optional(),
  allergies: z.array(z.string().max(200)).optional(),
  conditions: z.array(z.string().max(200)).optional(),
  medications: z.array(z.string().max(200)).optional(),
  primary_doctor: z.string().max(255).optional(),
  pharmacy_name: z.string().max(255).optional(),
  pharmacy_phone: z.string().max(50).optional(),
  insurance_provider: z.string().max(255).optional(),
  insurance_policy: z.string().max(100).optional(),
  insurance_group: z.string().max(100).optional(),
  emergency_contact_name: z.string().max(255).optional(),
  emergency_contact_phone: z.string().max(50).optional(),
  address: z.string().max(1000).optional(),
  health_goals: z.array(z.string().max(500)).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateFamilyMemberSchema = createFamilyMemberSchema.partial();

// ── Lab Results ─────────────────────────────────────────────

export const markerInputSchema = z.object({
  name: z.string().min(1).max(255),
  value: z.number(),
  unit: z.string().max(50).optional(),
  conventional_low: z.number().optional(),
  conventional_high: z.number().optional(),
  optimal_low: z.number().optional(),
  optimal_high: z.number().optional(),
  category: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const createLabResultSchema = z.object({
  family_member_id: z.string().uuid(),
  test_date: z.string().min(1),
  lab_name: z.string().max(255).optional(),
  test_type: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
  markers: z.array(markerInputSchema).optional(),
});

export const updateLabResultSchema = z.object({
  test_date: z.string().optional(),
  lab_name: z.string().max(255).optional(),
  test_type: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
});

// ── Symptoms ────────────────────────────────────────────────

export const createSymptomSchema = z.object({
  family_member_id: z.string().uuid(),
  logged_date: z.string().optional(),
  symptom: z.string().min(1).max(255),
  severity: z.number().int().min(1).max(10),
  body_system: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateSymptomSchema = z.object({
  logged_date: z.string().optional(),
  symptom: z.string().min(1).max(255).optional(),
  severity: z.number().int().min(1).max(10).optional(),
  body_system: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
});

// ── Protocols ───────────────────────────────────────────────

export const createProtocolSchema = z.object({
  family_member_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  dosage: z.string().max(255).optional(),
  frequency: z.string().max(255).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["active", "paused", "completed", "discontinued"]).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateProtocolSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  dosage: z.string().max(255).optional(),
  frequency: z.string().max(255).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["active", "paused", "completed", "discontinued"]).optional(),
  notes: z.string().max(5000).optional(),
});

// ── Diet ────────────────────────────────────────────────────

export const createDietSchema = z.object({
  family_member_id: z.string().uuid(),
  logged_date: z.string().optional(),
  meal_type: z.string().max(50).optional(),
  description: z.string().min(1).max(5000),
  tags: z.array(z.string().max(50)).optional(),
  reactions: z.string().max(2000).optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateDietSchema = z.object({
  logged_date: z.string().optional(),
  meal_type: z.string().max(50).optional(),
  description: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().max(50)).optional(),
  reactions: z.string().max(2000).optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(5000).optional(),
});

// ── Chat ────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  family_member_id: z.string().uuid(),
  conversation_id: z.string().uuid().optional(),
});

// ── Knowledge Documents ─────────────────────────────────────

export const uploadKnowledgeSchema = z.object({
  title: z.string().min(1).max(500),
  filename: z.string().max(500).optional(),
  content: z.string().min(1),
  doc_type: z.enum(["reference", "book", "guide", "protocol", "research"]).optional(),
  category: z.string().max(100).optional(),
});
