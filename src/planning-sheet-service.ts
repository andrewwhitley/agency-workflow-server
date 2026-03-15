/**
 * Planning Sheet Service — PostgreSQL-backed planning data with Google Sheets sync.
 *
 * The database is the primary source of truth. Google Sheets serves as a backup
 * that can be imported from (initial load) and synced back to (on-demand or scheduled).
 */

import { query } from "./database.js";
import { loadClientConfig, listClients } from "./workbook-service.js";
import type { GoogleDriveService } from "./google-drive.js";

// ── Tab name mapping ──────────────────────────────────

const TAB_ALIASES: Record<string, string> = {
  tracking: "New Content Tracking",
  sitemap: "Topical Sitemap",
  deliverables: "Deliverables",
};

export function resolveTabName(tab: string): string {
  return TAB_ALIASES[tab] || tab;
}

export function tabSlug(tabName: string): string {
  for (const [slug, name] of Object.entries(TAB_ALIASES)) {
    if (name === tabName) return slug;
  }
  return tabName.toLowerCase().replace(/\s+/g, "-");
}

// ── Types ─────────────────────────────────────────────

export interface PlanningSheet {
  id: string;
  client_slug: string;
  tab_name: string;
  headers: string[];
  source_sheet_id: string | null;
  last_synced_from_sheet: string | null;
  last_synced_to_sheet: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanningRow {
  id: string;
  sheet_id: string;
  row_index: number;
  data: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ── Read ──────────────────────────────────────────────

export async function getSheet(clientSlug: string, tabName: string): Promise<PlanningSheet | null> {
  const { rows } = await query(
    "SELECT * FROM planning_sheets WHERE client_slug = $1 AND tab_name = $2",
    [clientSlug, tabName]
  );
  return rows[0] || null;
}

export async function getRows(sheetId: string): Promise<PlanningRow[]> {
  const { rows } = await query(
    "SELECT * FROM planning_rows WHERE sheet_id = $1 ORDER BY row_index",
    [sheetId]
  );
  return rows;
}

export async function getRow(rowId: string): Promise<PlanningRow | null> {
  const { rows } = await query("SELECT * FROM planning_rows WHERE id = $1", [rowId]);
  return rows[0] || null;
}

/**
 * Get sheet + rows in the format the dashboard expects: { headers, rows, lastSynced }
 */
export async function getSheetData(clientSlug: string, tab: string) {
  const tabName = resolveTabName(tab);
  const sheet = await getSheet(clientSlug, tabName);
  if (!sheet) return null;

  const rows = await getRows(sheet.id);
  return {
    headers: sheet.headers,
    rows: rows.map((r) => ({ ...r.data, _id: r.id, _index: r.row_index })),
    lastSyncedFromSheet: sheet.last_synced_from_sheet,
    lastSyncedToSheet: sheet.last_synced_to_sheet,
    sourceSheetId: sheet.source_sheet_id,
    sheetDbId: sheet.id,
  };
}

// ── Import (Sheet → DB) ──────────────────────────────

export async function importSheetTab(
  clientSlug: string,
  tabName: string,
  driveService: GoogleDriveService
): Promise<{ imported: number }> {
  const config = loadClientConfig(clientSlug);
  if (!config?.planningSheetId) throw new Error(`No planningSheetId for client ${clientSlug}`);

  const sheetRange = `'${tabName}'`;
  const data = await driveService.readGoogleSheet(config.planningSheetId, sheetRange);

  if (!data.values?.length) return { imported: 0 };

  const headers = data.values[0].map((h) => h.trim());
  const dataRows = data.values.slice(1).filter((row) => row.some((c) => c?.trim()));

  // Upsert sheet metadata
  const { rows: sheetRows } = await query(
    `INSERT INTO planning_sheets (client_slug, tab_name, headers, source_sheet_id, last_synced_from_sheet)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (client_slug, tab_name)
     DO UPDATE SET headers = $3, source_sheet_id = $4, last_synced_from_sheet = NOW(), updated_at = NOW()
     RETURNING id`,
    [clientSlug, tabName, JSON.stringify(headers), config.planningSheetId]
  );
  const sheetId = sheetRows[0].id;

  // Replace all rows in a transaction-like sequence
  await query("DELETE FROM planning_rows WHERE sheet_id = $1", [sheetId]);

  if (dataRows.length > 0) {
    // Build bulk insert
    const valuePlaceholders: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (let i = 0; i < dataRows.length; i++) {
      const rowData: Record<string, string> = {};
      headers.forEach((h, j) => { rowData[h] = dataRows[i][j] || ""; });
      valuePlaceholders.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
      params.push(sheetId, i, JSON.stringify(rowData));
      idx += 3;
    }
    await query(
      `INSERT INTO planning_rows (sheet_id, row_index, data) VALUES ${valuePlaceholders.join(", ")}`,
      params
    );
  }

  return { imported: dataRows.length };
}

export async function importAllTabs(
  clientSlug: string,
  driveService: GoogleDriveService
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  for (const [slug, tabName] of Object.entries(TAB_ALIASES)) {
    try {
      const { imported } = await importSheetTab(clientSlug, tabName, driveService);
      results[slug] = imported;
    } catch (err) {
      console.error(`Import failed for ${clientSlug}/${tabName}:`, err);
      results[slug] = -1;
    }
  }
  return results;
}

export async function importAllClients(
  driveService: GoogleDriveService
): Promise<Record<string, Record<string, number>>> {
  const results: Record<string, Record<string, number>> = {};
  const clients = listClients();
  for (const client of clients) {
    const config = loadClientConfig(client.slug);
    if (!config?.planningSheetId) continue;
    results[client.slug] = await importAllTabs(client.slug, driveService);
  }
  return results;
}

// ── Write (CRUD) ──────────────────────────────────────

export async function updateRow(
  rowId: string,
  data: Record<string, string>
): Promise<PlanningRow | null> {
  // Merge provided fields into existing data
  const existing = await getRow(rowId);
  if (!existing) return null;

  const merged = { ...existing.data, ...data };
  const { rows } = await query(
    "UPDATE planning_rows SET data = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [JSON.stringify(merged), rowId]
  );

  // Touch the parent sheet's updated_at
  if (rows[0]) {
    await query("UPDATE planning_sheets SET updated_at = NOW() WHERE id = $1", [rows[0].sheet_id]);
  }

  return rows[0] || null;
}

export async function createRow(
  clientSlug: string,
  tab: string,
  data: Record<string, string>
): Promise<PlanningRow | null> {
  const tabName = resolveTabName(tab);
  const sheet = await getSheet(clientSlug, tabName);
  if (!sheet) return null;

  // Get next row_index
  const { rows: maxRows } = await query(
    "SELECT COALESCE(MAX(row_index), -1) + 1 AS next_index FROM planning_rows WHERE sheet_id = $1",
    [sheet.id]
  );
  const nextIndex = maxRows[0].next_index;

  const { rows } = await query(
    "INSERT INTO planning_rows (sheet_id, row_index, data) VALUES ($1, $2, $3) RETURNING *",
    [sheet.id, nextIndex, JSON.stringify(data)]
  );

  await query("UPDATE planning_sheets SET updated_at = NOW() WHERE id = $1", [sheet.id]);

  return rows[0] || null;
}

export async function deleteRow(rowId: string): Promise<boolean> {
  const row = await getRow(rowId);
  if (!row) return false;

  await query("DELETE FROM planning_rows WHERE id = $1", [rowId]);
  await query("UPDATE planning_sheets SET updated_at = NOW() WHERE id = $1", [row.sheet_id]);
  return true;
}

// ── Sync-back (DB → Sheet) ───────────────────────────

export async function syncBackToSheet(
  clientSlug: string,
  tab: string,
  driveService: GoogleDriveService
): Promise<{ synced: number }> {
  const tabName = resolveTabName(tab);
  const sheet = await getSheet(clientSlug, tabName);
  if (!sheet) throw new Error(`No planning sheet data for ${clientSlug}/${tabName}`);
  if (!sheet.source_sheet_id) throw new Error(`No source_sheet_id for ${clientSlug}/${tabName}`);

  const rows = await getRows(sheet.id);

  // Build 2D array: [headers, ...rows]
  const headers = sheet.headers;
  const values: string[][] = [headers];
  for (const row of rows) {
    values.push(headers.map((h) => row.data[h] || ""));
  }

  await driveService.writeGoogleSheetTab(sheet.source_sheet_id, tabName, values);

  await query(
    "UPDATE planning_sheets SET last_synced_to_sheet = NOW(), updated_at = NOW() WHERE id = $1",
    [sheet.id]
  );

  return { synced: rows.length };
}

export async function syncAllTabs(
  clientSlug: string,
  driveService: GoogleDriveService
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  for (const [slug, tabName] of Object.entries(TAB_ALIASES)) {
    try {
      const sheet = await getSheet(clientSlug, tabName);
      if (!sheet) { results[slug] = 0; continue; }
      const { synced } = await syncBackToSheet(clientSlug, slug, driveService);
      results[slug] = synced;
    } catch (err) {
      console.error(`Sync-back failed for ${clientSlug}/${tabName}:`, err);
      results[slug] = -1;
    }
  }
  return results;
}
