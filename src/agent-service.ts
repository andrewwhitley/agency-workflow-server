/**
 * Agent CRUD service backed by PostgreSQL.
 */

import { query } from "./database.js";

export interface Agent {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  max_tokens: number;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingDoc {
  id: string;
  agent_id: string;
  title: string;
  content: string;
  doc_type: string;
  source: string | null;
  created_at: string;
}

export const agentService = {
  async list(): Promise<Agent[]> {
    const { rows } = await query(
      "SELECT * FROM agents ORDER BY created_at ASC"
    );
    return rows;
  },

  async getById(id: string): Promise<Agent | null> {
    const { rows } = await query("SELECT * FROM agents WHERE id = $1", [id]);
    return rows[0] || null;
  },

  async getByName(name: string): Promise<Agent | null> {
    const { rows } = await query("SELECT * FROM agents WHERE name = $1", [name]);
    return rows[0] || null;
  },

  async create(data: {
    name: string;
    description?: string;
    system_prompt?: string;
    model?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<Agent> {
    const { rows } = await query(
      `INSERT INTO agents (name, description, system_prompt, model, max_tokens, temperature)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.name,
        data.description ?? "",
        data.system_prompt ?? "You are a helpful assistant.",
        data.model ?? "claude-sonnet-4-5-20250929",
        data.max_tokens ?? 4096,
        data.temperature ?? 0.7,
      ]
    );
    return rows[0];
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      system_prompt: string;
      model: string;
      max_tokens: number;
      temperature: number;
    }>
  ): Promise<Agent | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (!fields.length) return this.getById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE agents SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM agents WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },

  // ── Training Docs ───────────────────────────────────

  async getTrainingDocs(agentId: string): Promise<TrainingDoc[]> {
    const { rows } = await query(
      "SELECT * FROM agent_training_docs WHERE agent_id = $1 ORDER BY created_at ASC",
      [agentId]
    );
    return rows;
  },

  async addTrainingDoc(
    agentId: string,
    data: { title: string; content: string; doc_type?: string; source?: string }
  ): Promise<TrainingDoc> {
    const { rows } = await query(
      `INSERT INTO agent_training_docs (agent_id, title, content, doc_type, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [agentId, data.title, data.content, data.doc_type ?? "reference", data.source ?? null]
    );
    return rows[0];
  },

  async deleteTrainingDoc(docId: string): Promise<boolean> {
    const { rowCount } = await query(
      "DELETE FROM agent_training_docs WHERE id = $1",
      [docId]
    );
    return (rowCount ?? 0) > 0;
  },
};
