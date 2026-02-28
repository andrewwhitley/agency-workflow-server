/**
 * REST API routes for health data.
 * All routes require authentication and scope data to the authenticated user.
 */

import { Router, type Request, type Response } from "express";
import { query } from "./health-database.js";
import { FUNCTIONAL_RANGES, getMarkerReference, BODY_SYSTEMS, PROTOCOL_CATEGORIES, MEAL_TYPES, DIET_TAGS } from "./health-references.js";
import {
  createFamilyMemberSchema, updateFamilyMemberSchema,
  createLabResultSchema, markerInputSchema,
  createSymptomSchema, updateSymptomSchema,
  createProtocolSchema, updateProtocolSchema,
  createDietSchema, updateDietSchema,
  uploadKnowledgeSchema,
} from "./validation.js";
import type { SessionUser } from "./oauth.js";

function getUserEmail(req: Request): string {
  const user = (req.session as any)?.user as SessionUser | undefined;
  return user?.email || "anonymous";
}

async function verifyMemberOwnership(memberId: string, email: string): Promise<boolean> {
  const { rows } = await query(
    "SELECT id FROM family_members WHERE id = $1 AND account_email = $2",
    [memberId, email],
  );
  return rows.length > 0;
}

export function healthRouter(): Router {
  const router = Router();

  // ── Reference Data ──────────────────────────────────────

  router.get("/references", (_req: Request, res: Response) => {
    res.json({ markers: FUNCTIONAL_RANGES, bodySystems: BODY_SYSTEMS, protocolCategories: PROTOCOL_CATEGORIES, mealTypes: MEAL_TYPES, dietTags: DIET_TAGS });
  });

  router.get("/references/search", (req: Request, res: Response) => {
    const q = ((req.query.q as string) || "").toLowerCase();
    if (!q) { res.json([]); return; }
    const results = Object.values(FUNCTIONAL_RANGES).filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q),
    );
    res.json(results);
  });

  // ── Family Members ──────────────────────────────────────

  router.get("/family", async (req: Request, res: Response) => {
    try {
      const { rows } = await query(
        "SELECT * FROM family_members WHERE account_email = $1 ORDER BY role DESC, name",
        [getUserEmail(req)],
      );
      res.json(rows);
    } catch (err) { console.error("GET /family:", err); res.status(500).json({ error: "Failed to load family members" }); }
  });

  router.post("/family", async (req: Request, res: Response) => {
    try {
      const parsed = createFamilyMemberSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const email = getUserEmail(req);
      const d = parsed.data;
      const { rows } = await query(
        `INSERT INTO family_members (account_email, name, date_of_birth, sex, role, avatar_color,
          height_inches, weight_lbs, blood_type, allergies, conditions, medications,
          primary_doctor, pharmacy_name, pharmacy_phone, insurance_provider, insurance_policy, insurance_group,
          emergency_contact_name, emergency_contact_phone, address, health_goals, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
        [email, d.name, d.date_of_birth||null, d.sex||null, d.role||null, d.avatar_color||'#10b981',
         d.height_inches||null, d.weight_lbs||null, d.blood_type||'', d.allergies||[], d.conditions||[], d.medications||[],
         d.primary_doctor||'', d.pharmacy_name||'', d.pharmacy_phone||'', d.insurance_provider||'', d.insurance_policy||'', d.insurance_group||'',
         d.emergency_contact_name||'', d.emergency_contact_phone||'', d.address||'', d.health_goals||[], d.notes||''],
      );
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST /family:", err); res.status(500).json({ error: "Failed to create family member" }); }
  });

  router.put("/family/:id", async (req: Request, res: Response) => {
    try {
      const email = getUserEmail(req);
      const memberId = req.params.id as string;
      if (!(await verifyMemberOwnership(memberId, email))) { res.status(404).json({ error: "Not found" }); return; }
      const parsed = updateFamilyMemberSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      for (const [key, val] of Object.entries(d)) {
        if (val !== undefined) { fields.push(`${key} = $${idx}`); values.push(val); idx++; }
      }
      if (fields.length === 0) { res.status(400).json({ error: "No fields to update" }); return; }
      fields.push("updated_at = NOW()");
      values.push(memberId, email);
      const { rows } = await query(
        `UPDATE family_members SET ${fields.join(", ")} WHERE id = $${idx} AND account_email = $${idx + 1} RETURNING *`,
        values,
      );
      res.json(rows[0]);
    } catch (err) { console.error("PUT /family:", err); res.status(500).json({ error: "Failed to update" }); }
  });

  router.delete("/family/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query("DELETE FROM family_members WHERE id = $1 AND account_email = $2", [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE /family:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  // ── Lab Results ─────────────────────────────────────────

  router.get("/labs", async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string;
      if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query(
        `SELECT lr.*, (SELECT json_agg(lm.* ORDER BY lm.category, lm.name) FROM lab_markers lm WHERE lm.lab_result_id = lr.id) as markers
         FROM lab_results lr WHERE lr.family_member_id = $1 ORDER BY lr.test_date DESC`, [memberId]);
      res.json(rows);
    } catch (err) { console.error("GET /labs:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  router.post("/labs", async (req: Request, res: Response) => {
    try {
      const parsed = createLabResultSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      if (!(await verifyMemberOwnership(d.family_member_id, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows: labRows } = await query(
        `INSERT INTO lab_results (family_member_id, test_date, lab_name, test_type, notes)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [d.family_member_id, d.test_date, d.lab_name||'', d.test_type||'', d.notes||'']);
      const lab = labRows[0];
      if (d.markers?.length) {
        for (const m of d.markers) {
          const ref = getMarkerReference(m.name);
          await query(
            `INSERT INTO lab_markers (lab_result_id, name, value, unit, conventional_low, conventional_high, optimal_low, optimal_high, category, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [lab.id, m.name, m.value, m.unit||ref?.unit||'',
             m.conventional_low??ref?.conventionalLow??null, m.conventional_high??ref?.conventionalHigh??null,
             m.optimal_low??ref?.optimalLow??null, m.optimal_high??ref?.optimalHigh??null,
             m.category||ref?.category||'', m.notes||'']);
        }
      }
      const { rows } = await query(
        `SELECT lr.*, (SELECT json_agg(lm.* ORDER BY lm.category, lm.name) FROM lab_markers lm WHERE lm.lab_result_id = lr.id) as markers
         FROM lab_results lr WHERE lr.id = $1`, [lab.id]);
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST /labs:", err); res.status(500).json({ error: "Failed to create" }); }
  });

  router.delete("/labs/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query(
        `DELETE FROM lab_results WHERE id = $1 AND family_member_id IN (SELECT id FROM family_members WHERE account_email = $2)`,
        [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE /labs:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  router.post("/labs/:id/markers", async (req: Request, res: Response) => {
    try {
      const { rows: lr } = await query(
        `SELECT lr.id FROM lab_results lr JOIN family_members fm ON fm.id = lr.family_member_id WHERE lr.id = $1 AND fm.account_email = $2`,
        [req.params.id, getUserEmail(req)]);
      if (!lr.length) { res.status(404).json({ error: "Not found" }); return; }
      const parsed = markerInputSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const m = parsed.data; const ref = getMarkerReference(m.name);
      const { rows } = await query(
        `INSERT INTO lab_markers (lab_result_id, name, value, unit, conventional_low, conventional_high, optimal_low, optimal_high, category, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [req.params.id, m.name, m.value, m.unit||ref?.unit||'',
         m.conventional_low??ref?.conventionalLow??null, m.conventional_high??ref?.conventionalHigh??null,
         m.optimal_low??ref?.optimalLow??null, m.optimal_high??ref?.optimalHigh??null,
         m.category||ref?.category||'', m.notes||'']);
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST markers:", err); res.status(500).json({ error: "Failed to add" }); }
  });

  router.delete("/markers/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query(
        `DELETE FROM lab_markers WHERE id = $1 AND lab_result_id IN
          (SELECT lr.id FROM lab_results lr JOIN family_members fm ON fm.id = lr.family_member_id WHERE fm.account_email = $2)`,
        [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE marker:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  router.get("/markers/trends", async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string;
      const marker = req.query.marker as string;
      if (!memberId || !marker) { res.status(400).json({ error: "memberId and marker required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query(
        `SELECT lm.value, lm.unit, lm.optimal_low, lm.optimal_high, lm.conventional_low, lm.conventional_high, lr.test_date
         FROM lab_markers lm JOIN lab_results lr ON lr.id = lm.lab_result_id
         WHERE lr.family_member_id = $1 AND lm.name = $2 ORDER BY lr.test_date ASC`,
        [memberId, marker]);
      res.json(rows);
    } catch (err) { console.error("GET trends:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  // ── Symptoms ────────────────────────────────────────────

  router.get("/symptoms", async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string;
      if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query("SELECT * FROM symptoms WHERE family_member_id = $1 ORDER BY logged_date DESC, created_at DESC", [memberId]);
      res.json(rows);
    } catch (err) { console.error("GET /symptoms:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  router.post("/symptoms", async (req: Request, res: Response) => {
    try {
      const parsed = createSymptomSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      if (!(await verifyMemberOwnership(d.family_member_id, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query(
        `INSERT INTO symptoms (family_member_id, logged_date, symptom, severity, body_system, notes)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [d.family_member_id, d.logged_date||new Date().toISOString().split('T')[0], d.symptom, d.severity, d.body_system||'', d.notes||'']);
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST /symptoms:", err); res.status(500).json({ error: "Failed to log" }); }
  });

  router.put("/symptoms/:id", async (req: Request, res: Response) => {
    try {
      const parsed = updateSymptomSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      const fields: string[] = []; const values: unknown[] = []; let idx = 1;
      for (const [key, val] of Object.entries(d)) { if (val !== undefined) { fields.push(`${key} = $${idx}`); values.push(val); idx++; } }
      if (!fields.length) { res.status(400).json({ error: "No fields" }); return; }
      values.push(req.params.id, getUserEmail(req));
      const { rows } = await query(
        `UPDATE symptoms SET ${fields.join(", ")} WHERE id = $${idx} AND family_member_id IN (SELECT id FROM family_members WHERE account_email = $${idx+1}) RETURNING *`, values);
      if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
      res.json(rows[0]);
    } catch (err) { console.error("PUT /symptoms:", err); res.status(500).json({ error: "Failed to update" }); }
  });

  router.delete("/symptoms/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query(
        `DELETE FROM symptoms WHERE id = $1 AND family_member_id IN (SELECT id FROM family_members WHERE account_email = $2)`,
        [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE /symptoms:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  // ── Protocols ───────────────────────────────────────────

  router.get("/protocols", async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string;
      if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query("SELECT * FROM protocols WHERE family_member_id = $1 ORDER BY status, name", [memberId]);
      res.json(rows);
    } catch (err) { console.error("GET /protocols:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  router.post("/protocols", async (req: Request, res: Response) => {
    try {
      const parsed = createProtocolSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      if (!(await verifyMemberOwnership(d.family_member_id, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query(
        `INSERT INTO protocols (family_member_id, name, category, description, dosage, frequency, start_date, end_date, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [d.family_member_id, d.name, d.category||'supplement', d.description||'', d.dosage||'', d.frequency||'',
         d.start_date||null, d.end_date||null, d.status||'active', d.notes||'']);
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST /protocols:", err); res.status(500).json({ error: "Failed to create" }); }
  });

  router.put("/protocols/:id", async (req: Request, res: Response) => {
    try {
      const parsed = updateProtocolSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      const fields: string[] = []; const values: unknown[] = []; let idx = 1;
      for (const [key, val] of Object.entries(d)) { if (val !== undefined) { fields.push(`${key} = $${idx}`); values.push(val); idx++; } }
      if (!fields.length) { res.status(400).json({ error: "No fields" }); return; }
      fields.push("updated_at = NOW()");
      values.push(req.params.id, getUserEmail(req));
      const { rows } = await query(
        `UPDATE protocols SET ${fields.join(", ")} WHERE id = $${idx} AND family_member_id IN (SELECT id FROM family_members WHERE account_email = $${idx+1}) RETURNING *`, values);
      if (!rows.length) { res.status(404).json({ error: "Not found" }); return; }
      res.json(rows[0]);
    } catch (err) { console.error("PUT /protocols:", err); res.status(500).json({ error: "Failed to update" }); }
  });

  router.delete("/protocols/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query(
        `DELETE FROM protocols WHERE id = $1 AND family_member_id IN (SELECT id FROM family_members WHERE account_email = $2)`,
        [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE /protocols:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  // ── Diet Log ────────────────────────────────────────────

  router.get("/diet", async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string;
      if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query("SELECT * FROM diet_log WHERE family_member_id = $1 ORDER BY logged_date DESC, created_at DESC", [memberId]);
      res.json(rows);
    } catch (err) { console.error("GET /diet:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  router.post("/diet", async (req: Request, res: Response) => {
    try {
      const parsed = createDietSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      if (!(await verifyMemberOwnership(d.family_member_id, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query(
        `INSERT INTO diet_log (family_member_id, logged_date, meal_type, description, tags, reactions, energy_level, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [d.family_member_id, d.logged_date||new Date().toISOString().split('T')[0], d.meal_type||'meal', d.description,
         d.tags||[], d.reactions||'', d.energy_level||null, d.notes||'']);
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST /diet:", err); res.status(500).json({ error: "Failed to log" }); }
  });

  router.delete("/diet/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query(
        `DELETE FROM diet_log WHERE id = $1 AND family_member_id IN (SELECT id FROM family_members WHERE account_email = $2)`,
        [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE /diet:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  // ── Chat Conversations ──────────────────────────────────

  router.get("/chat/conversations", async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string;
      if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query(
        `SELECT wc.*, (SELECT COUNT(*) FROM wellness_messages wm WHERE wm.conversation_id = wc.id)::int as message_count
         FROM wellness_conversations wc WHERE wc.family_member_id = $1 AND wc.account_email = $2 ORDER BY wc.updated_at DESC`,
        [memberId, getUserEmail(req)]);
      res.json(rows);
    } catch (err) { console.error("GET /chat:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  router.post("/chat/conversations", async (req: Request, res: Response) => {
    try {
      const memberId = req.body.family_member_id as string;
      if (!memberId) { res.status(400).json({ error: "family_member_id required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query(
        `INSERT INTO wellness_conversations (family_member_id, account_email, title) VALUES ($1,$2,$3) RETURNING *`,
        [memberId, getUserEmail(req), "New Conversation"]);
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST /chat:", err); res.status(500).json({ error: "Failed to create" }); }
  });

  router.get("/chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const { rows: c } = await query("SELECT id FROM wellness_conversations WHERE id = $1 AND account_email = $2", [req.params.id, getUserEmail(req)]);
      if (!c.length) { res.status(404).json({ error: "Not found" }); return; }
      const { rows } = await query("SELECT * FROM wellness_messages WHERE conversation_id = $1 ORDER BY created_at ASC", [req.params.id]);
      res.json(rows);
    } catch (err) { console.error("GET messages:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  router.delete("/chat/conversations/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query("DELETE FROM wellness_conversations WHERE id = $1 AND account_email = $2", [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE /chat:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  // ── Knowledge Documents ─────────────────────────────────

  router.get("/knowledge", async (req: Request, res: Response) => {
    try {
      const { rows } = await query(
        "SELECT id, title, filename, doc_type, category, content_preview, page_count, created_at FROM knowledge_documents WHERE account_email = $1 ORDER BY created_at DESC",
        [getUserEmail(req)]);
      res.json(rows);
    } catch (err) { console.error("GET /knowledge:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  router.post("/knowledge", async (req: Request, res: Response) => {
    try {
      const parsed = uploadKnowledgeSchema.safeParse(req.body);
      if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
      const d = parsed.data;
      const preview = d.content.slice(0, 500);
      const { rows } = await query(
        `INSERT INTO knowledge_documents (account_email, title, filename, content, content_preview, doc_type, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, title, filename, doc_type, category, content_preview, created_at`,
        [getUserEmail(req), d.title, d.filename||'', d.content, preview, d.doc_type||'reference', d.category||'']);
      res.status(201).json(rows[0]);
    } catch (err) { console.error("POST /knowledge:", err); res.status(500).json({ error: "Failed to upload" }); }
  });

  router.delete("/knowledge/:id", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await query("DELETE FROM knowledge_documents WHERE id = $1 AND account_email = $2", [req.params.id, getUserEmail(req)]);
      if (!rowCount) { res.status(404).json({ error: "Not found" }); return; }
      res.json({ success: true });
    } catch (err) { console.error("DELETE /knowledge:", err); res.status(500).json({ error: "Failed to delete" }); }
  });

  // ── Dashboard Summary ───────────────────────────────────

  router.get("/dashboard", async (req: Request, res: Response) => {
    try {
      const memberId = req.query.memberId as string;
      if (!memberId) { res.status(400).json({ error: "memberId required" }); return; }
      if (!(await verifyMemberOwnership(memberId, getUserEmail(req)))) { res.status(404).json({ error: "Not found" }); return; }
      const [labs, symptoms, protocols, diet] = await Promise.all([
        query(`SELECT lr.*, (SELECT json_agg(lm.* ORDER BY lm.category, lm.name) FROM lab_markers lm WHERE lm.lab_result_id = lr.id) as markers
               FROM lab_results lr WHERE lr.family_member_id = $1 ORDER BY lr.test_date DESC LIMIT 5`, [memberId]),
        query("SELECT * FROM symptoms WHERE family_member_id = $1 ORDER BY logged_date DESC LIMIT 10", [memberId]),
        query("SELECT * FROM protocols WHERE family_member_id = $1 ORDER BY status, name", [memberId]),
        query("SELECT * FROM diet_log WHERE family_member_id = $1 ORDER BY logged_date DESC LIMIT 10", [memberId]),
      ]);
      res.json({ recentLabs: labs.rows, recentSymptoms: symptoms.rows, protocols: protocols.rows, recentDiet: diet.rows });
    } catch (err) { console.error("GET /dashboard:", err); res.status(500).json({ error: "Failed to load" }); }
  });

  return router;
}
