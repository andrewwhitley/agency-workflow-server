/**
 * Task CRUD service backed by PostgreSQL.
 */

import { query } from "./database.js";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  tags: string[];
  thread_id: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export const taskService = {
  async list(filters?: {
    status?: string;
    priority?: string;
    tags?: string[];
    thread_id?: string;
    assigned_to?: string;
  }): Promise<Task[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }
    if (filters?.priority) {
      conditions.push(`priority = $${idx++}`);
      values.push(filters.priority);
    }
    if (filters?.tags && filters.tags.length > 0) {
      conditions.push(`tags @> $${idx++}`);
      values.push(filters.tags);
    }
    if (filters?.thread_id) {
      conditions.push(`thread_id = $${idx++}`);
      values.push(filters.thread_id);
    }
    if (filters?.assigned_to) {
      conditions.push(`assigned_to = $${idx++}`);
      values.push(filters.assigned_to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT * FROM tasks ${where}
       ORDER BY
         CASE priority
           WHEN 'urgent' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           WHEN 'low' THEN 3
         END,
         created_at DESC`,
      values
    );
    return rows;
  },

  async getById(id: string): Promise<Task | null> {
    const { rows } = await query("SELECT * FROM tasks WHERE id = $1", [id]);
    return rows[0] || null;
  },

  async create(data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    tags?: string[];
    thread_id?: string;
    created_by?: string;
    assigned_to?: string;
  }): Promise<Task> {
    const { rows } = await query(
      `INSERT INTO tasks (title, description, status, priority, due_date, tags, thread_id, created_by, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.title,
        data.description ?? "",
        data.status ?? "open",
        data.priority ?? "medium",
        data.due_date ?? null,
        data.tags ?? [],
        data.thread_id ?? null,
        data.created_by ?? null,
        data.assigned_to ?? null,
      ]
    );
    return rows[0];
  },

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      due_date: string;
      tags: string[];
      thread_id: string;
      assigned_to: string;
    }>
  ): Promise<Task | null> {
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
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM tasks WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },
};
