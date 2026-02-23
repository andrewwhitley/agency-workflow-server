/**
 * Memory key-value service backed by PostgreSQL.
 */

import { query } from "./database.js";

export interface Memory {
  id: string;
  key: string;
  content: string;
  category: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const memoryService = {
  async list(category?: string): Promise<Memory[]> {
    if (category) {
      const { rows } = await query(
        "SELECT * FROM memories WHERE category = $1 ORDER BY updated_at DESC",
        [category]
      );
      return rows;
    }
    const { rows } = await query(
      "SELECT * FROM memories ORDER BY updated_at DESC"
    );
    return rows;
  },

  async getByKey(key: string): Promise<Memory | null> {
    const { rows } = await query("SELECT * FROM memories WHERE key = $1", [key]);
    return rows[0] || null;
  },

  async upsert(data: {
    key: string;
    content: string;
    category?: string;
    created_by?: string;
  }): Promise<Memory> {
    const { rows } = await query(
      `INSERT INTO memories (key, content, category, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET
         content = EXCLUDED.content,
         category = COALESCE(EXCLUDED.category, memories.category),
         updated_at = NOW()
       RETURNING *`,
      [data.key, data.content, data.category ?? null, data.created_by ?? null]
    );
    return rows[0];
  },

  async search(q: string): Promise<Memory[]> {
    const pattern = `%${q}%`;
    const { rows } = await query(
      `SELECT * FROM memories
       WHERE key ILIKE $1 OR content ILIKE $1 OR category ILIKE $1
       ORDER BY updated_at DESC`,
      [pattern]
    );
    return rows;
  },

  async delete(key: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM memories WHERE key = $1", [key]);
    return (rowCount ?? 0) > 0;
  },
};
