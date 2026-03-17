#!/usr/bin/env node

/**
 * Seed script: imports client data from the Manus-generated seed-data.sql
 * into our PostgreSQL cm_* tables.
 *
 * Usage: node scripts/seed-client-data.mjs [path-to-seed-data.sql]
 *
 * Reads DATABASE_URL from .env or environment.
 * Only imports data for MySQL client IDs 300001 (Soleil) and 300002 (AI Marketing Team).
 * Uses SERIAL IDs — does not preserve original IDs.
 */

import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEED_FILE = process.argv[2]
  || resolve(__dirname, '../../ai-marketing-dashboard/seed-data.sql');

const ALLOWED_CLIENT_IDS = new Set([300001, 300002]);

// ---------------------------------------------------------------------------
// SQL parser helpers
// ---------------------------------------------------------------------------

/**
 * Parse a MySQL INSERT statement and return { table, columns, rows }.
 * Each row is an array of raw JS values (string | number | boolean | null).
 */
function parseInsert(line) {
  // Extract table name
  const tableMatch = line.match(/INSERT INTO `(\w+)`/);
  if (!tableMatch) return null;
  const table = tableMatch[1];

  // Extract column names
  const colMatch = line.match(/\((`[^)]+`)\)\s*VALUES/);
  if (!colMatch) return null;
  const columns = colMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));

  // Extract VALUES portion
  const valuesStart = line.indexOf('VALUES ');
  if (valuesStart === -1) return null;
  const valuesStr = line.slice(valuesStart + 7);

  // Parse each row tuple from VALUES (...), (...);
  const rows = [];
  let i = 0;

  while (i < valuesStr.length) {
    // Find opening paren
    const openParen = valuesStr.indexOf('(', i);
    if (openParen === -1) break;

    // Parse values inside parens, respecting quotes
    const values = [];
    let pos = openParen + 1;
    while (pos < valuesStr.length) {
      // Skip whitespace
      while (pos < valuesStr.length && valuesStr[pos] === ' ') pos++;

      if (valuesStr[pos] === ')') {
        pos++;
        break;
      }

      if (valuesStr[pos] === ',') {
        pos++;
        continue;
      }

      if (valuesStr.substring(pos, pos + 4) === 'NULL') {
        values.push(null);
        pos += 4;
      } else if (valuesStr[pos] === '\'') {
        // Quoted string — find end, handling escaped quotes
        let str = '';
        pos++; // skip opening quote
        while (pos < valuesStr.length) {
          if (valuesStr[pos] === '\\' && pos + 1 < valuesStr.length) {
            // escaped character
            const next = valuesStr[pos + 1];
            if (next === '\'') { str += '\''; pos += 2; }
            else if (next === '\\') { str += '\\'; pos += 2; }
            else if (next === 'n') { str += '\n'; pos += 2; }
            else if (next === 'r') { str += '\r'; pos += 2; }
            else if (next === 't') { str += '\t'; pos += 2; }
            else { str += next; pos += 2; }
          } else if (valuesStr[pos] === '\'') {
            // Check for doubled quote ''
            if (pos + 1 < valuesStr.length && valuesStr[pos + 1] === '\'') {
              str += '\'';
              pos += 2;
            } else {
              pos++; // skip closing quote
              break;
            }
          } else {
            str += valuesStr[pos];
            pos++;
          }
        }
        values.push(str);
      } else {
        // Numeric value
        let numStr = '';
        while (pos < valuesStr.length && valuesStr[pos] !== ',' && valuesStr[pos] !== ')') {
          numStr += valuesStr[pos];
          pos++;
        }
        numStr = numStr.trim();
        const num = Number(numStr);
        values.push(isNaN(num) ? numStr : num);
      }
    }

    rows.push(values);
    i = pos;
  }

  return { table, columns, rows };
}

/**
 * Convert camelCase to snake_case.
 */
function camelToSnake(str) {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Clean a MySQL date string — the seed file wraps dates in extra quotes like '"2026-01-31T00:07:47.000Z"'
 */
function cleanDateValue(val) {
  if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
    return val.slice(1, -1);
  }
  return val;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Client Data Seed Script ===');
  console.log(`Reading seed file: ${SEED_FILE}`);

  const sql = readFileSync(SEED_FILE, 'utf-8');
  const lines = sql.split('\n').filter(l => l.startsWith('INSERT INTO'));

  console.log(`Found ${lines.length} INSERT statements`);

  // Parse all inserts grouped by table
  const tableData = {};
  for (const line of lines) {
    const parsed = parseInsert(line);
    if (!parsed) continue;
    if (!tableData[parsed.table]) tableData[parsed.table] = { columns: parsed.columns, rows: [] };
    tableData[parsed.table].rows.push(...parsed.rows);
  }

  console.log('Tables found:', Object.keys(tableData).join(', '));

  // Connect to PostgreSQL
  const connStr = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString: connStr,
    ssl: connStr?.includes('railway.internal') ? undefined : { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');

    // -----------------------------------------------------------------------
    // 1. Insert clients → get new IDs
    // -----------------------------------------------------------------------
    console.log('\n--- Inserting clients ---');
    const clientsData = tableData['clients'];
    if (!clientsData) throw new Error('No clients table found in seed data');

    // Map old client ID → new client ID
    const clientIdMap = {};

    for (const row of clientsData.rows) {
      const rowObj = {};
      clientsData.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

      const oldId = rowObj.id;
      if (!ALLOWED_CLIENT_IDS.has(oldId)) continue;

      // Map columns to snake_case, skip 'id'
      const pgCols = [];
      const pgVals = [];
      const pgPlaceholders = [];
      let paramIdx = 1;

      for (const col of clientsData.columns) {
        if (col === 'id') continue;
        if (col === 'createdBy') continue; // skip FK to users table

        const snakeCol = camelToSnake(col);
        let val = rowObj[col];

        // Clean dates
        if (col === 'createdAt' || col === 'updatedAt') {
          val = cleanDateValue(val);
        }

        // Convert MySQL booleans (0/1) to actual booleans
        if (['isLocalServiceArea', 'displayAddress', 'telemedicineOffered'].includes(col)) {
          val = val === 1 || val === true;
        }

        pgCols.push(snakeCol);
        pgVals.push(val);
        pgPlaceholders.push(`$${paramIdx++}`);
      }

      const insertSql = `INSERT INTO cm_clients (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
      const result = await client.query(insertSql, pgVals);
      const newId = result.rows[0].id;
      clientIdMap[oldId] = newId;
      console.log(`  Client "${rowObj.companyName}" (old ID ${oldId}) → new ID ${newId}`);
    }

    // -----------------------------------------------------------------------
    // Helper to insert child records with client_id FK
    // -----------------------------------------------------------------------
    async function insertChildRecords(mysqlTable, pgTable, extraSkipCols = [], boolCols = [], dateCols = ['createdAt', 'updatedAt']) {
      console.log(`\n--- Inserting ${pgTable} ---`);
      const data = tableData[mysqlTable];
      if (!data) { console.log(`  No data for ${mysqlTable}, skipping`); return {}; }

      const idMap = {}; // old ID → new ID (for tables that need FK tracking)
      let count = 0;

      for (const row of data.rows) {
        const rowObj = {};
        data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

        // Filter: only rows for our clients
        const oldClientId = rowObj.clientId;
        if (oldClientId !== undefined && !ALLOWED_CLIENT_IDS.has(oldClientId)) continue;

        const pgCols = [];
        const pgVals = [];
        const pgPlaceholders = [];
        let paramIdx = 1;

        for (const col of data.columns) {
          if (col === 'id') continue;
          if (extraSkipCols.includes(col)) continue;

          let val = rowObj[col];
          let snakeCol = camelToSnake(col);

          // Remap client_id to new ID
          if (col === 'clientId') {
            snakeCol = 'client_id';
            val = clientIdMap[val];
            if (val === undefined) continue; // skip if client not mapped
          }

          // Clean dates
          if (dateCols.includes(col)) {
            val = cleanDateValue(val);
          }

          // Convert booleans
          if (boolCols.includes(col)) {
            val = val === 1 || val === true;
          }

          pgCols.push(snakeCol);
          pgVals.push(val);
          pgPlaceholders.push(`$${paramIdx++}`);
        }

        if (pgCols.length === 0) continue;

        const insertSql = `INSERT INTO ${pgTable} (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
        const result = await client.query(insertSql, pgVals);
        const newId = result.rows[0].id;
        idMap[rowObj.id] = newId;
        count++;
      }

      console.log(`  Inserted ${count} rows`);
      return idMap;
    }

    // -----------------------------------------------------------------------
    // 2. Contacts
    // -----------------------------------------------------------------------
    // Note: contacts in seed file are for old client IDs (90006), not 300001/300002.
    // We skip those per the instructions. But let's check if any exist for our clients.
    await insertChildRecords('contacts', 'cm_contacts', ['createdBy'], ['isPrimary', 'shouldAttribute']);

    // -----------------------------------------------------------------------
    // 3. Team Members
    // -----------------------------------------------------------------------
    await insertChildRecords('teamMembers', 'cm_team_members', ['createdBy'], ['useForAttribution']);

    // -----------------------------------------------------------------------
    // 4. Addresses
    // -----------------------------------------------------------------------
    await insertChildRecords('addresses', 'cm_addresses', ['createdBy'], ['isPrimary']);

    // -----------------------------------------------------------------------
    // 5. Client Services
    // -----------------------------------------------------------------------
    await insertChildRecords('clientServices', 'cm_services', ['createdBy'], ['offered']);

    // -----------------------------------------------------------------------
    // 6. Service Areas
    // -----------------------------------------------------------------------
    await insertChildRecords('serviceAreas', 'cm_service_areas', ['createdBy'], []);

    // -----------------------------------------------------------------------
    // 7. Competitors
    // -----------------------------------------------------------------------
    await insertChildRecords('competitors', 'cm_competitors', ['createdBy'], []);

    // -----------------------------------------------------------------------
    // 8. Differentiators
    // -----------------------------------------------------------------------
    await insertChildRecords('differentiators', 'cm_differentiators', ['createdBy'], []);

    // -----------------------------------------------------------------------
    // 9. Buyer Personas
    // -----------------------------------------------------------------------
    await insertChildRecords('buyerPersonas', 'cm_buyer_personas', ['createdBy'], []);

    // -----------------------------------------------------------------------
    // 10. Important Links
    // -----------------------------------------------------------------------
    await insertChildRecords('importantLinks', 'cm_important_links', ['createdBy'], []);

    // -----------------------------------------------------------------------
    // 11. Logins/Accounts (none for 300001/300002 but check anyway)
    // -----------------------------------------------------------------------
    await insertChildRecords('loginsAccounts', 'cm_logins', ['createdBy'], []);

    // -----------------------------------------------------------------------
    // 12. Content Guidelines
    // -----------------------------------------------------------------------
    await insertChildRecords('contentGuidelines', 'cm_content_guidelines', ['createdBy'], ['useStockPhotography']);

    // -----------------------------------------------------------------------
    // 13. Marketing Plan (none for 300001/300002 but check anyway)
    // -----------------------------------------------------------------------
    await insertChildRecords('marketingPlan', 'cm_marketing_plan', ['createdBy'], ['isIncluded'],
      ['createdAt', 'updatedAt', 'completionTarget']);

    // -----------------------------------------------------------------------
    // 14. Brand Story
    // -----------------------------------------------------------------------
    {
      console.log('\n--- Inserting cm_brand_story ---');
      const data = tableData['brandStory'];
      if (!data) {
        console.log('  No brand story data, skipping');
      } else {
        let count = 0;
        for (const row of data.rows) {
          const rowObj = {};
          data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

          if (!ALLOWED_CLIENT_IDS.has(rowObj.clientId)) continue;

          const pgCols = [];
          const pgVals = [];
          const pgPlaceholders = [];
          let paramIdx = 1;

          for (const col of data.columns) {
            if (col === 'id') continue;
            if (col === 'lastEditedBy') continue; // FK to users
            if (col === 'shareToken') continue; // regenerate on our side if needed

            let val = rowObj[col];
            let snakeCol = camelToSnake(col);

            if (col === 'clientId') {
              snakeCol = 'client_id';
              val = clientIdMap[val];
              if (val === undefined) continue;
            }

            // JSON sections — parse if string
            const jsonCols = ['heroSection', 'problemSection', 'guideSection', 'planSection',
              'ctaSection', 'successSection', 'failureSection', 'brandVoiceSection',
              'visualIdentitySection', 'contentStrategySection', 'messagingSection',
              'implementationSection'];
            if (jsonCols.includes(col) && typeof val === 'string') {
              // Store as-is — PostgreSQL JSONB will handle the JSON string
              try {
                JSON.parse(val); // validate
              } catch {
                val = JSON.stringify({ content: val });
              }
            }

            // Clean dates
            if (['createdAt', 'updatedAt', 'generatedAt', 'lastEditedAt'].includes(col)) {
              val = cleanDateValue(val);
            }

            pgCols.push(snakeCol);
            pgVals.push(val);
            pgPlaceholders.push(`$${paramIdx++}`);
          }

          const insertSql = `INSERT INTO cm_brand_story (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
          await client.query(insertSql, pgVals);
          count++;
        }
        console.log(`  Inserted ${count} rows`);
      }
    }

    // -----------------------------------------------------------------------
    // 15. Campaigns (these have their own IDs that deliverables reference)
    // -----------------------------------------------------------------------
    let campaignIdMap = {};
    {
      console.log('\n--- Inserting cm_campaigns ---');
      const data = tableData['campaigns'];
      if (!data) {
        console.log('  No campaigns data, skipping');
      } else {
        let count = 0;
        for (const row of data.rows) {
          const rowObj = {};
          data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

          if (!ALLOWED_CLIENT_IDS.has(rowObj.clientId)) continue;

          const pgCols = [];
          const pgVals = [];
          const pgPlaceholders = [];
          let paramIdx = 1;

          for (const col of data.columns) {
            if (col === 'id') continue;
            if (col === 'createdBy') continue;

            let val = rowObj[col];
            let snakeCol = camelToSnake(col);

            if (col === 'clientId') {
              snakeCol = 'client_id';
              val = clientIdMap[val];
              if (val === undefined) continue;
            }

            if (['createdAt', 'updatedAt', 'startDate', 'endDate'].includes(col)) {
              val = cleanDateValue(val);
            }

            pgCols.push(snakeCol);
            pgVals.push(val);
            pgPlaceholders.push(`$${paramIdx++}`);
          }

          const insertSql = `INSERT INTO cm_campaigns (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
          const result = await client.query(insertSql, pgVals);
          campaignIdMap[rowObj.id] = result.rows[0].id;
          count++;
        }
        console.log(`  Inserted ${count} rows`);
      }
    }

    // -----------------------------------------------------------------------
    // 16. Campaign Deliverables
    // -----------------------------------------------------------------------
    {
      console.log('\n--- Inserting cm_campaign_deliverables ---');
      const data = tableData['campaignDeliverables'];
      if (!data) {
        console.log('  No campaign deliverables data, skipping');
      } else {
        let count = 0;
        for (const row of data.rows) {
          const rowObj = {};
          data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

          // Check if client_id maps to one of our clients
          if (!ALLOWED_CLIENT_IDS.has(rowObj.clientId)) continue;

          const pgCols = [];
          const pgVals = [];
          const pgPlaceholders = [];
          let paramIdx = 1;

          for (const col of data.columns) {
            if (col === 'id') continue;
            if (col === 'createdBy') continue;

            let val = rowObj[col];
            let snakeCol = camelToSnake(col);

            if (col === 'clientId') {
              snakeCol = 'client_id';
              val = clientIdMap[val];
              if (val === undefined) continue;
            }

            if (col === 'campaignId') {
              snakeCol = 'campaign_id';
              val = campaignIdMap[val];
              if (val === undefined) {
                console.log(`  Skipping deliverable — campaign ID ${rowObj.campaignId} not found`);
                break;
              }
            }

            if (['createdAt', 'updatedAt', 'dueDate', 'completedAt'].includes(col)) {
              val = cleanDateValue(val);
            }

            pgCols.push(snakeCol);
            pgVals.push(val);
            pgPlaceholders.push(`$${paramIdx++}`);
          }

          if (pgCols.length === 0) continue;

          const insertSql = `INSERT INTO cm_campaign_deliverables (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
          await client.query(insertSql, pgVals);
          count++;
        }
        console.log(`  Inserted ${count} rows`);
      }
    }

    // -----------------------------------------------------------------------
    // 17. Traffic Light Departments (global, not per-client)
    // -----------------------------------------------------------------------
    let deptIdMap = {};
    {
      console.log('\n--- Inserting cm_tl_departments ---');
      const data = tableData['tlDepartments'];
      if (!data) {
        console.log('  No departments data, skipping');
      } else {
        let count = 0;
        for (const row of data.rows) {
          const rowObj = {};
          data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

          const pgCols = [];
          const pgVals = [];
          const pgPlaceholders = [];
          let paramIdx = 1;

          for (const col of data.columns) {
            if (col === 'id') continue;

            let val = rowObj[col];
            let snakeCol = camelToSnake(col);

            if (['createdAt', 'updatedAt'].includes(col)) {
              val = cleanDateValue(val);
            }
            if (col === 'isActive') {
              val = val === 1 || val === true;
            }

            pgCols.push(snakeCol);
            pgVals.push(val);
            pgPlaceholders.push(`$${paramIdx++}`);
          }

          // Check if department already exists by name (idempotent)
          const existingResult = await client.query(
            'SELECT id FROM cm_tl_departments WHERE name = $1', [rowObj.name]
          );
          let newId;
          if (existingResult.rows.length > 0) {
            newId = existingResult.rows[0].id;
            console.log(`  Department "${rowObj.name}" already exists (ID ${newId}), skipping insert`);
          } else {
            const insertSql = `INSERT INTO cm_tl_departments (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
            const result = await client.query(insertSql, pgVals);
            newId = result.rows[0].id;
            count++;
          }
          deptIdMap[rowObj.id] = newId;
        }
        console.log(`  Inserted ${count} rows`);
      }
    }

    // -----------------------------------------------------------------------
    // 18. Traffic Light Metrics (per-department)
    // -----------------------------------------------------------------------
    let metricIdMap = {};
    {
      console.log('\n--- Inserting cm_tl_metrics ---');
      const data = tableData['tlMetrics'];
      if (!data) {
        console.log('  No metrics data, skipping');
      } else {
        let count = 0;
        for (const row of data.rows) {
          const rowObj = {};
          data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

          const pgCols = [];
          const pgVals = [];
          const pgPlaceholders = [];
          let paramIdx = 1;

          for (const col of data.columns) {
            if (col === 'id') continue;

            let val = rowObj[col];
            let snakeCol = camelToSnake(col);

            if (col === 'departmentId') {
              snakeCol = 'department_id';
              val = deptIdMap[val];
              if (val === undefined) {
                console.log(`  Skipping metric — department ID ${rowObj.departmentId} not mapped`);
                break;
              }
            }

            if (['createdAt', 'updatedAt'].includes(col)) {
              val = cleanDateValue(val);
            }
            if (col === 'isActive') {
              val = val === 1 || val === true;
            }

            pgCols.push(snakeCol);
            pgVals.push(val);
            pgPlaceholders.push(`$${paramIdx++}`);
          }

          if (pgCols.length === 0) continue;

          // Check if metric already exists
          const existingResult = await client.query(
            'SELECT id FROM cm_tl_metrics WHERE department_id = $1 AND name = $2',
            [deptIdMap[rowObj.departmentId], rowObj.name]
          );
          let newId;
          if (existingResult.rows.length > 0) {
            newId = existingResult.rows[0].id;
            console.log(`  Metric "${rowObj.name}" already exists (ID ${newId}), skipping`);
          } else {
            const insertSql = `INSERT INTO cm_tl_metrics (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
            const result = await client.query(insertSql, pgVals);
            newId = result.rows[0].id;
            count++;
          }
          metricIdMap[rowObj.id] = newId;
        }
        console.log(`  Inserted ${count} rows`);
      }
    }

    // -----------------------------------------------------------------------
    // 19. Traffic Light Health Entries (per-client per-department)
    // -----------------------------------------------------------------------
    {
      console.log('\n--- Inserting cm_tl_health_entries ---');
      const data = tableData['tlHealthEntries'];
      if (!data) {
        console.log('  No health entries data, skipping');
      } else {
        let count = 0;
        for (const row of data.rows) {
          const rowObj = {};
          data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

          if (!ALLOWED_CLIENT_IDS.has(rowObj.clientId)) continue;

          const pgCols = [];
          const pgVals = [];
          const pgPlaceholders = [];
          let paramIdx = 1;

          for (const col of data.columns) {
            if (col === 'id') continue;
            if (col === 'updatedById') continue; // FK to users

            let val = rowObj[col];
            let snakeCol = camelToSnake(col);

            if (col === 'clientId') {
              snakeCol = 'client_id';
              val = clientIdMap[val];
              if (val === undefined) continue;
            }

            if (col === 'departmentId') {
              snakeCol = 'department_id';
              val = deptIdMap[val];
              if (val === undefined) {
                console.log(`  Skipping health entry — department ID ${rowObj.departmentId} not mapped`);
                break;
              }
            }

            if (['createdAt', 'updatedAt'].includes(col)) {
              val = cleanDateValue(val);
            }

            // metricValues is JSON
            if (col === 'metricValues' && typeof val === 'string') {
              try { JSON.parse(val); } catch { val = null; }
            }

            pgCols.push(snakeCol);
            pgVals.push(val);
            pgPlaceholders.push(`$${paramIdx++}`);
          }

          if (pgCols.length === 0) continue;

          // Use ON CONFLICT for the unique constraint
          const insertSql = `INSERT INTO cm_tl_health_entries (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')})
            ON CONFLICT (client_id, department_id, week_of) DO NOTHING
            RETURNING id`;
          const result = await client.query(insertSql, pgVals);
          if (result.rows.length > 0) count++;
        }
        console.log(`  Inserted ${count} rows`);
      }
    }

    // -----------------------------------------------------------------------
    // 20. Traffic Light Playbooks (per-department, global)
    // -----------------------------------------------------------------------
    {
      console.log('\n--- Inserting cm_tl_playbooks ---');
      const data = tableData['tlPlaybooks'];
      if (!data) {
        console.log('  No playbooks data, skipping');
      } else {
        let count = 0;
        for (const row of data.rows) {
          const rowObj = {};
          data.columns.forEach((col, idx) => { rowObj[col] = row[idx]; });

          const pgCols = [];
          const pgVals = [];
          const pgPlaceholders = [];
          let paramIdx = 1;

          for (const col of data.columns) {
            if (col === 'id') continue;

            let val = rowObj[col];
            let snakeCol = camelToSnake(col);

            if (col === 'departmentId') {
              snakeCol = 'department_id';
              val = deptIdMap[val];
              if (val === undefined) {
                console.log(`  Skipping playbook — department ID ${rowObj.departmentId} not mapped`);
                break;
              }
            }

            if (['createdAt', 'updatedAt'].includes(col)) {
              val = cleanDateValue(val);
            }

            pgCols.push(snakeCol);
            pgVals.push(val);
            pgPlaceholders.push(`$${paramIdx++}`);
          }

          if (pgCols.length === 0) continue;

          // Check if playbook already exists for this department
          const existingResult = await client.query(
            'SELECT id FROM cm_tl_playbooks WHERE department_id = $1',
            [deptIdMap[rowObj.departmentId]]
          );
          if (existingResult.rows.length > 0) {
            console.log(`  Playbook for department ${rowObj.departmentId} already exists, skipping`);
          } else {
            const insertSql = `INSERT INTO cm_tl_playbooks (${pgCols.join(', ')}) VALUES (${pgPlaceholders.join(', ')}) RETURNING id`;
            await client.query(insertSql, pgVals);
            count++;
          }
        }
        console.log(`  Inserted ${count} rows`);
      }
    }

    // -----------------------------------------------------------------------
    // Done
    // -----------------------------------------------------------------------
    console.log('\n=== Seed complete! ===');
    console.log('Client ID mapping:', clientIdMap);

    client.release();
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
