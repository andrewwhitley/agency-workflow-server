/**
 * PostgreSQL database connection pool and health-specific migrations.
 */

import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query(text: string, params?: unknown[]): Promise<pg.QueryResult> {
  return getPool().query(text, params);
}

// ── Migrations ────────────────────────────────────────────────

interface Migration {
  id: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    id: "001_family_members",
    sql: `
      CREATE TABLE IF NOT EXISTS family_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        date_of_birth DATE,
        sex VARCHAR(20) CHECK (sex IN ('male', 'female', 'other')),
        role VARCHAR(50) CHECK (role IN ('adult', 'child')),
        avatar_color VARCHAR(7) DEFAULT '#10b981',
        height_inches DECIMAL,
        weight_lbs DECIMAL,
        blood_type VARCHAR(10) DEFAULT '',
        allergies TEXT[] NOT NULL DEFAULT '{}',
        conditions TEXT[] NOT NULL DEFAULT '{}',
        medications TEXT[] NOT NULL DEFAULT '{}',
        primary_doctor VARCHAR(255) DEFAULT '',
        pharmacy_name VARCHAR(255) DEFAULT '',
        pharmacy_phone VARCHAR(50) DEFAULT '',
        insurance_provider VARCHAR(255) DEFAULT '',
        insurance_policy VARCHAR(100) DEFAULT '',
        insurance_group VARCHAR(100) DEFAULT '',
        emergency_contact_name VARCHAR(255) DEFAULT '',
        emergency_contact_phone VARCHAR(50) DEFAULT '',
        address TEXT DEFAULT '',
        health_goals TEXT[] NOT NULL DEFAULT '{}',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_family_members_email ON family_members(account_email);
    `,
  },
  {
    id: "002_lab_results",
    sql: `
      CREATE TABLE IF NOT EXISTS lab_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
        test_date DATE NOT NULL,
        lab_name VARCHAR(255) DEFAULT '',
        test_type VARCHAR(255) DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_lab_results_member ON lab_results(family_member_id, test_date DESC);
    `,
  },
  {
    id: "003_lab_markers",
    sql: `
      CREATE TABLE IF NOT EXISTS lab_markers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lab_result_id UUID NOT NULL REFERENCES lab_results(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        value DECIMAL NOT NULL,
        unit VARCHAR(50) DEFAULT '',
        conventional_low DECIMAL,
        conventional_high DECIMAL,
        optimal_low DECIMAL,
        optimal_high DECIMAL,
        category VARCHAR(100) DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_lab_markers_result ON lab_markers(lab_result_id);
      CREATE INDEX IF NOT EXISTS idx_lab_markers_name ON lab_markers(name);
    `,
  },
  {
    id: "004_symptoms",
    sql: `
      CREATE TABLE IF NOT EXISTS symptoms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
        logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
        symptom VARCHAR(255) NOT NULL,
        severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 10),
        body_system VARCHAR(100) DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_symptoms_member ON symptoms(family_member_id, logged_date DESC);
    `,
  },
  {
    id: "005_protocols",
    sql: `
      CREATE TABLE IF NOT EXISTS protocols (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'supplement',
        description TEXT DEFAULT '',
        dosage VARCHAR(255) DEFAULT '',
        frequency VARCHAR(255) DEFAULT '',
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'paused', 'completed', 'discontinued')),
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_protocols_member ON protocols(family_member_id);
    `,
  },
  {
    id: "006_diet_log",
    sql: `
      CREATE TABLE IF NOT EXISTS diet_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
        logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
        meal_type VARCHAR(50) DEFAULT 'meal',
        description TEXT NOT NULL,
        tags TEXT[] NOT NULL DEFAULT '{}',
        reactions TEXT DEFAULT '',
        energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_diet_member ON diet_log(family_member_id, logged_date DESC);
    `,
  },
  {
    id: "007_wellness_chat",
    sql: `
      CREATE TABLE IF NOT EXISTS wellness_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
        account_email VARCHAR(255) NOT NULL,
        title VARCHAR(255) DEFAULT 'New Conversation',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_wellness_conv_member ON wellness_conversations(family_member_id);

      CREATE TABLE IF NOT EXISTS wellness_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES wellness_conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_wellness_msg_conv ON wellness_messages(conversation_id, created_at);

      CREATE TABLE IF NOT EXISTS wellness_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
        key VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        category VARCHAR(100) DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(family_member_id, key)
      );
      CREATE INDEX IF NOT EXISTS idx_wellness_memory_member ON wellness_memory(family_member_id);
    `,
  },
  {
    id: "008_knowledge_documents",
    sql: `
      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_email VARCHAR(255) NOT NULL,
        title VARCHAR(500) NOT NULL,
        filename VARCHAR(500) DEFAULT '',
        content TEXT NOT NULL,
        content_preview TEXT DEFAULT '',
        doc_type VARCHAR(50) DEFAULT 'reference',
        category VARCHAR(100) DEFAULT '',
        page_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_email ON knowledge_documents(account_email);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const p = getPool();

  await p.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows: applied } = await p.query("SELECT id FROM _migrations");
  const appliedIds = new Set(applied.map((r) => r.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) continue;

    console.log(`  Running migration: ${migration.id}`);
    const client = await p.connect();
    try {
      await client.query("BEGIN");
      await client.query(migration.sql);
      await client.query("INSERT INTO _migrations (id) VALUES ($1)", [migration.id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${migration.id} failed: ${err}`);
    } finally {
      client.release();
    }
  }
}
