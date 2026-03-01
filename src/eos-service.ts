/**
 * EOS (Entrepreneurial Operating System) CRUD service.
 * Handles Rocks, Scorecards, IDS Issues, L10 Meeting Notes, and People Analyzer.
 */

import { query } from "./database.js";

// ── Types ──────────────────────────────────────────────

export interface Rock {
  id: string;
  title: string;
  owner: string;
  quarter: string;
  status: "on_track" | "off_track" | "done";
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ScorecardMetric {
  id: string;
  metric_name: string;
  owner: string;
  goal: string;
  unit: string;
  active: boolean;
  created_at: string;
}

export interface ScorecardEntry {
  id: string;
  metric_id: string;
  week_of: string;
  value: string;
  on_track: boolean;
  created_at: string;
}

export interface ScorecardMetricWithEntries extends ScorecardMetric {
  entries: ScorecardEntry[];
}

export interface EosIssue {
  id: string;
  title: string;
  description: string;
  priority: number;
  status: "open" | "solving" | "solved" | "tabled";
  category: "ids" | "internal";
  owner: string | null;
  resolved_notes: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingNotes {
  id: string;
  meeting_date: string;
  meeting_type: string;
  attendees: string[];
  segue: string;
  scorecard_review: string;
  rock_review: string;
  headlines: string;
  todos: string;
  ids_list: string;
  conclusion: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeopleAnalyzer {
  id: string;
  team_member: string;
  quarter: string;
  right_person: boolean | null;
  right_seat: boolean | null;
  core_values_scores: Record<string, boolean | null>;
  gwo_get_it: boolean | null;
  gwo_want_it: boolean | null;
  gwo_capacity: boolean | null;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Admin helpers ────────────────────────────────────────

export function getEosAdminEmails(): string[] {
  const raw = process.env.EOS_ADMIN_EMAILS || process.env.ALLOWED_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEosAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const admins = getEosAdminEmails();
  if (admins.length === 0) return true; // no list = everyone is admin (dev mode)
  return admins.includes(email.toLowerCase());
}

// ── Rocks ──────────────────────────────────────────────

export const rockService = {
  async list(quarter?: string): Promise<Rock[]> {
    const where = quarter ? "WHERE quarter = $1" : "";
    const params = quarter ? [quarter] : [];
    const { rows } = await query(
      `SELECT * FROM eos_rocks ${where} ORDER BY
        CASE status WHEN 'off_track' THEN 0 WHEN 'on_track' THEN 1 WHEN 'done' THEN 2 END,
        updated_at DESC`,
      params
    );
    return rows;
  },

  async create(data: { title: string; owner: string; quarter: string; notes?: string }): Promise<Rock> {
    const { rows } = await query(
      `INSERT INTO eos_rocks (title, owner, quarter, notes) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.title, data.owner, data.quarter, data.notes ?? ""]
    );
    return rows[0];
  },

  async update(id: string, data: Partial<{ title: string; owner: string; quarter: string; status: string; notes: string }>): Promise<Rock | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) { fields.push(`${key} = $${idx}`); values.push(value); idx++; }
    }
    if (!fields.length) return null;
    fields.push("updated_at = NOW()");
    values.push(id);
    const { rows } = await query(`UPDATE eos_rocks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    return rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM eos_rocks WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },
};

// ── Scorecard ──────────────────────────────────────────

export const scorecardService = {
  async listMetrics(): Promise<ScorecardMetricWithEntries[]> {
    const { rows: metrics } = await query(
      "SELECT * FROM eos_scorecard_metrics WHERE active = TRUE ORDER BY metric_name"
    );
    const { rows: entries } = await query(
      "SELECT * FROM eos_scorecard_entries ORDER BY week_of DESC LIMIT 500"
    );
    const entryMap = new Map<string, ScorecardEntry[]>();
    for (const e of entries) {
      if (!entryMap.has(e.metric_id)) entryMap.set(e.metric_id, []);
      entryMap.get(e.metric_id)!.push(e);
    }
    return metrics.map((m: ScorecardMetric) => ({
      ...m,
      entries: entryMap.get(m.id) || [],
    }));
  },

  async createMetric(data: { metric_name: string; owner: string; goal?: string; unit?: string }): Promise<ScorecardMetric> {
    const { rows } = await query(
      `INSERT INTO eos_scorecard_metrics (metric_name, owner, goal, unit) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.metric_name, data.owner, data.goal ?? "", data.unit ?? ""]
    );
    return rows[0];
  },

  async updateMetric(id: string, data: Partial<{ metric_name: string; owner: string; goal: string; unit: string; active: boolean }>): Promise<ScorecardMetric | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) { fields.push(`${key} = $${idx}`); values.push(value); idx++; }
    }
    if (!fields.length) return null;
    values.push(id);
    const { rows } = await query(`UPDATE eos_scorecard_metrics SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    return rows[0] || null;
  },

  async deleteMetric(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM eos_scorecard_metrics WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },

  async addEntry(data: { metric_id: string; week_of: string; value: string; on_track?: boolean }): Promise<ScorecardEntry> {
    const { rows } = await query(
      `INSERT INTO eos_scorecard_entries (metric_id, week_of, value, on_track)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (metric_id, week_of) DO UPDATE SET value = $3, on_track = $4
       RETURNING *`,
      [data.metric_id, data.week_of, data.value, data.on_track ?? true]
    );
    return rows[0];
  },
};

// ── Issues (IDS + Internal) ────────────────────────────

export const issueService = {
  async list(category?: string, status?: string): Promise<EosIssue[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    if (category) { conditions.push(`category = $${idx++}`); values.push(category); }
    if (status) { conditions.push(`status = $${idx++}`); values.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT * FROM eos_issues ${where} ORDER BY priority ASC, updated_at DESC`,
      values
    );
    return rows;
  },

  async create(data: { title: string; description?: string; priority?: number; category?: string; owner?: string }): Promise<EosIssue> {
    const { rows } = await query(
      `INSERT INTO eos_issues (title, description, priority, category, owner) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.title, data.description ?? "", data.priority ?? 2, data.category ?? "ids", data.owner ?? null]
    );
    return rows[0];
  },

  async update(id: string, data: Partial<{ title: string; description: string; priority: number; status: string; category: string; owner: string; resolved_notes: string }>): Promise<EosIssue | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) { fields.push(`${key} = $${idx}`); values.push(value); idx++; }
    }
    if (!fields.length) return null;
    fields.push("updated_at = NOW()");
    values.push(id);
    const { rows } = await query(`UPDATE eos_issues SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    return rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM eos_issues WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },
};

// ── Meeting Notes ──────────────────────────────────────

export const meetingService = {
  async list(): Promise<MeetingNotes[]> {
    const { rows } = await query("SELECT * FROM eos_meeting_notes ORDER BY meeting_date DESC LIMIT 52");
    return rows;
  },

  async getById(id: string): Promise<MeetingNotes | null> {
    const { rows } = await query("SELECT * FROM eos_meeting_notes WHERE id = $1", [id]);
    return rows[0] || null;
  },

  async create(data: {
    meeting_date: string;
    meeting_type?: string;
    attendees?: string[];
    segue?: string;
    scorecard_review?: string;
    rock_review?: string;
    headlines?: string;
    todos?: string;
    ids_list?: string;
    conclusion?: string;
    created_by?: string;
  }): Promise<MeetingNotes> {
    const { rows } = await query(
      `INSERT INTO eos_meeting_notes (meeting_date, meeting_type, attendees, segue, scorecard_review, rock_review, headlines, todos, ids_list, conclusion, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        data.meeting_date,
        data.meeting_type ?? "L10",
        data.attendees ?? [],
        data.segue ?? "",
        data.scorecard_review ?? "",
        data.rock_review ?? "",
        data.headlines ?? "",
        data.todos ?? "",
        data.ids_list ?? "",
        data.conclusion ?? "",
        data.created_by ?? null,
      ]
    );
    return rows[0];
  },

  async update(id: string, data: Partial<{
    meeting_date: string;
    attendees: string[];
    segue: string;
    scorecard_review: string;
    rock_review: string;
    headlines: string;
    todos: string;
    ids_list: string;
    conclusion: string;
  }>): Promise<MeetingNotes | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) { fields.push(`${key} = $${idx}`); values.push(value); idx++; }
    }
    if (!fields.length) return null;
    fields.push("updated_at = NOW()");
    values.push(id);
    const { rows } = await query(`UPDATE eos_meeting_notes SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`, values);
    return rows[0] || null;
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM eos_meeting_notes WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },
};

// ── People Analyzer (admin only) ───────────────────────

export const peopleAnalyzerService = {
  async list(quarter?: string): Promise<PeopleAnalyzer[]> {
    const where = quarter ? "WHERE quarter = $1" : "";
    const params = quarter ? [quarter] : [];
    const { rows } = await query(`SELECT * FROM eos_people_analyzer ${where} ORDER BY team_member, quarter DESC`, params);
    return rows;
  },

  async upsert(data: {
    team_member: string;
    quarter: string;
    right_person?: boolean | null;
    right_seat?: boolean | null;
    core_values_scores?: Record<string, boolean | null>;
    gwo_get_it?: boolean | null;
    gwo_want_it?: boolean | null;
    gwo_capacity?: boolean | null;
    notes?: string;
    created_by?: string;
  }): Promise<PeopleAnalyzer> {
    const { rows } = await query(
      `INSERT INTO eos_people_analyzer (team_member, quarter, right_person, right_seat, core_values_scores, gwo_get_it, gwo_want_it, gwo_capacity, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (team_member, quarter) DO UPDATE SET
         right_person = COALESCE($3, eos_people_analyzer.right_person),
         right_seat = COALESCE($4, eos_people_analyzer.right_seat),
         core_values_scores = COALESCE($5, eos_people_analyzer.core_values_scores),
         gwo_get_it = COALESCE($6, eos_people_analyzer.gwo_get_it),
         gwo_want_it = COALESCE($7, eos_people_analyzer.gwo_want_it),
         gwo_capacity = COALESCE($8, eos_people_analyzer.gwo_capacity),
         notes = COALESCE($9, eos_people_analyzer.notes),
         updated_at = NOW()
       RETURNING *`,
      [
        data.team_member,
        data.quarter,
        data.right_person ?? null,
        data.right_seat ?? null,
        JSON.stringify(data.core_values_scores ?? {}),
        data.gwo_get_it ?? null,
        data.gwo_want_it ?? null,
        data.gwo_capacity ?? null,
        data.notes ?? "",
        data.created_by ?? null,
      ]
    );
    return rows[0];
  },

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query("DELETE FROM eos_people_analyzer WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },
};
