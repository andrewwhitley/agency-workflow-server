/**
 * Thread and message CRUD service backed by PostgreSQL.
 */

import { query } from "./database.js";

export interface Thread {
  id: string;
  title: string | null;
  agent_id: string;
  client: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
  // Joined fields
  agent_name?: string;
  message_count?: number;
  last_message_preview?: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  token_count: number | null;
  created_at: string;
}

export const threadService = {
  async list(filters?: {
    agent_id?: string;
    client?: string;
    archived?: boolean;
    created_by?: string;
  }): Promise<Thread[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.agent_id) {
      conditions.push(`t.agent_id = $${idx++}`);
      values.push(filters.agent_id);
    }
    if (filters?.client) {
      conditions.push(`t.client = $${idx++}`);
      values.push(filters.client);
    }
    if (filters?.archived !== undefined) {
      conditions.push(`t.archived = $${idx++}`);
      values.push(filters.archived);
    }
    if (filters?.created_by) {
      conditions.push(`t.created_by = $${idx++}`);
      values.push(filters.created_by);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT t.*,
              a.name AS agent_name,
              COALESCE(mc.cnt, 0)::int AS message_count,
              lm.content AS last_message_preview,
              lm.created_at AS last_message_at
       FROM threads t
       JOIN agents a ON a.id = t.agent_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) AS cnt FROM messages WHERE thread_id = t.id
       ) mc ON true
       LEFT JOIN LATERAL (
         SELECT content, created_at FROM messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1
       ) lm ON true
       ${where}
       ORDER BY COALESCE(lm.created_at, t.created_at) DESC`,
      values
    );

    return rows.map((r) => ({
      ...r,
      last_message_preview: r.last_message_preview
        ? r.last_message_preview.slice(0, 100)
        : null,
    }));
  },

  async getById(id: string): Promise<Thread | null> {
    const { rows } = await query(
      `SELECT t.*, a.name AS agent_name
       FROM threads t
       JOIN agents a ON a.id = t.agent_id
       WHERE t.id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(data: {
    title?: string;
    agent_id: string;
    client?: string;
    created_by?: string;
  }): Promise<Thread> {
    const { rows } = await query(
      `INSERT INTO threads (title, agent_id, client, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.title ?? null, data.agent_id, data.client ?? null, data.created_by ?? null]
    );
    return rows[0];
  },

  async update(
    id: string,
    data: Partial<{ title: string; archived: boolean }>
  ): Promise<Thread | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.archived !== undefined) {
      fields.push(`archived = $${idx++}`);
      values.push(data.archived);
    }

    if (!fields.length) return this.getById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await query(
      `UPDATE threads SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM threads WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },

  // ── Messages ────────────────────────────────────────

  async getMessages(
    threadId: string,
    limit = 100,
    before?: string
  ): Promise<Message[]> {
    if (before) {
      const { rows } = await query(
        `SELECT * FROM messages
         WHERE thread_id = $1 AND created_at < $2
         ORDER BY created_at DESC LIMIT $3`,
        [threadId, before, limit]
      );
      return rows.reverse();
    }

    const { rows } = await query(
      `SELECT * FROM messages
       WHERE thread_id = $1
       ORDER BY created_at ASC`,
      [threadId]
    );
    return rows;
  },

  async addMessage(
    threadId: string,
    role: "user" | "assistant",
    content: string,
    tokenCount?: number
  ): Promise<Message> {
    const { rows } = await query(
      `INSERT INTO messages (thread_id, role, content, token_count)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [threadId, role, content, tokenCount ?? null]
    );

    // Touch thread updated_at
    await query("UPDATE threads SET updated_at = NOW() WHERE id = $1", [threadId]);

    return rows[0];
  },

  async getMessageCount(threadId: string): Promise<number> {
    const { rows } = await query(
      "SELECT COUNT(*)::int AS count FROM messages WHERE thread_id = $1",
      [threadId]
    );
    return rows[0].count;
  },

  // ── Thread by Discord channel mapping ───────────────

  async findByDiscordChannel(channelId: string): Promise<Thread | null> {
    // Convention: threads with created_by = 'discord:<channelId>'
    const { rows } = await query(
      `SELECT t.*, a.name AS agent_name
       FROM threads t
       JOIN agents a ON a.id = t.agent_id
       WHERE t.created_by = $1 AND t.archived = false
       ORDER BY t.created_at DESC LIMIT 1`,
      [`discord:${channelId}`]
    );
    return rows[0] || null;
  },
};
