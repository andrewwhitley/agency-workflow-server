/**
 * PostgreSQL database connection pool and migration runner.
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
    id: "001_agents",
    sql: `
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        system_prompt TEXT NOT NULL DEFAULT 'You are a helpful assistant.',
        model VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
        max_tokens INTEGER NOT NULL DEFAULT 4096,
        temperature REAL NOT NULL DEFAULT 0.7,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "002_threads",
    sql: `
      CREATE TABLE IF NOT EXISTS threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200),
        agent_id UUID NOT NULL REFERENCES agents(id),
        client VARCHAR(100),
        created_by VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived BOOLEAN NOT NULL DEFAULT FALSE
      );
    `,
  },
  {
    id: "003_messages",
    sql: `
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        token_count INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id, created_at);
    `,
  },
  {
    id: "004_agent_training_docs",
    sql: `
      CREATE TABLE IF NOT EXISTS agent_training_docs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        doc_type VARCHAR(50) NOT NULL DEFAULT 'reference',
        source VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_training_docs_agent_id ON agent_training_docs(agent_id);
    `,
  },
  {
    id: "005_default_agent",
    sql: `
      INSERT INTO agents (name, description, system_prompt, model, max_tokens, temperature)
      SELECT
        'General Assistant',
        'A general-purpose AI assistant for your agency team.',
        'You are a helpful AI assistant for a digital marketing agency. You help with content creation, strategy, analysis, and general tasks. Be professional, concise, and actionable in your responses.',
        'claude-sonnet-4-5-20250929',
        4096,
        0.7
      WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'General Assistant');
    `,
  },
  {
    id: "006_agent_templates",
    sql: `
      INSERT INTO agents (name, description, system_prompt, model, max_tokens, temperature)
      SELECT * FROM (VALUES
        (
          'Content Writer',
          'Expert content writer for blog posts, social media, and marketing copy.',
          'You are an expert content writer for a digital marketing agency. You specialize in creating compelling, SEO-optimized content including blog posts, social media copy, email campaigns, and website content. Follow these principles:
- Write in a clear, engaging style appropriate for the target audience
- Incorporate keywords naturally without keyword stuffing
- Use proper heading structure (H1, H2, H3) for blog posts
- Include calls-to-action where appropriate
- Match the brand voice and tone specified in the client context
- Provide meta descriptions and title tags when writing blog content
- Suggest internal and external linking opportunities',
          'claude-sonnet-4-5-20250929',
          8192,
          0.8
        ),
        (
          'QA Reviewer',
          'Quality assurance reviewer for content, campaigns, and deliverables.',
          'You are a meticulous QA reviewer for a digital marketing agency. Your role is to review content and deliverables for quality, accuracy, and brand consistency. When reviewing:
- Check for spelling, grammar, and punctuation errors
- Verify factual claims and statistics
- Ensure brand voice consistency
- Check SEO elements (meta titles, descriptions, heading structure, keyword usage)
- Verify all links and CTAs are correct
- Check formatting and readability
- Flag any compliance or legal concerns
- Provide specific, actionable feedback with line references
- Rate overall quality on a scale of 1-10 with justification',
          'claude-sonnet-4-5-20250929',
          4096,
          0.3
        ),
        (
          'Strategy Advisor',
          'Digital marketing strategist for campaigns, positioning, and growth.',
          'You are a senior digital marketing strategist. You help plan and optimize marketing campaigns across all channels. Your expertise includes:
- Market analysis and competitive positioning
- Campaign planning and budget allocation
- Channel strategy (SEO, PPC, Social, Email, Content)
- Audience segmentation and targeting
- Performance analysis and optimization recommendations
- KPI setting and measurement frameworks
When providing advice, be data-driven, cite industry benchmarks, and always tie recommendations back to business objectives.',
          'claude-sonnet-4-5-20250929',
          4096,
          0.7
        ),
        (
          'SEO Specialist',
          'Technical and content SEO expert for audits and optimization.',
          'You are an SEO specialist for a digital marketing agency. You provide expert guidance on both technical and content SEO. Your capabilities include:
- Technical SEO audits (site speed, crawlability, indexation, schema markup)
- Keyword research and mapping
- On-page optimization recommendations
- Content gap analysis
- Backlink strategy
- Local SEO optimization
- Core Web Vitals analysis
- Search Console data interpretation
Always provide specific, implementable recommendations with expected impact levels (high/medium/low) and priority ordering.',
          'claude-sonnet-4-5-20250929',
          4096,
          0.5
        )
      ) AS t(name, description, system_prompt, model, max_tokens, temperature)
      WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'Content Writer');
    `,
  },
  {
    id: "007_thread_templates",
    sql: `
      CREATE TABLE IF NOT EXISTS thread_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        agent_name VARCHAR(100) NOT NULL,
        initial_message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      INSERT INTO thread_templates (name, description, agent_name, initial_message)
      SELECT * FROM (VALUES
        (
          'Write Blog Post',
          'Start a guided blog post writing session',
          'Content Writer',
          'I need to write a blog post. Please help me plan and write it. Ask me about the topic, target audience, keywords, and desired length.'
        ),
        (
          'QA Review',
          'Submit content for quality review',
          'QA Reviewer',
          'I have content that needs to be reviewed for quality. I''ll paste it below. Please do a thorough QA review covering grammar, accuracy, brand voice, SEO elements, and overall quality.'
        ),
        (
          'Strategy Session',
          'Brainstorm marketing strategy and campaigns',
          'Strategy Advisor',
          'I''d like to discuss marketing strategy. Let''s start by reviewing the current situation and goals, then develop a plan.'
        ),
        (
          'SEO Audit',
          'Get an SEO audit and recommendations',
          'SEO Specialist',
          'I need an SEO analysis. I''ll provide the URL and any specific concerns. Please provide a comprehensive audit with prioritized recommendations.'
        )
      ) AS t(name, description, agent_name, initial_message)
      WHERE NOT EXISTS (SELECT 1 FROM thread_templates WHERE name = 'Write Blog Post');
    `,
  },
  {
    id: "008_tasks",
    sql: `
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'open'
          CHECK (status IN ('open', 'in_progress', 'completed', 'blocked')),
        priority VARCHAR(10) NOT NULL DEFAULT 'medium'
          CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        due_date TIMESTAMPTZ,
        tags TEXT[] NOT NULL DEFAULT '{}',
        thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
        created_by VARCHAR(200),
        assigned_to VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_thread_id ON tasks(thread_id);
    `,
  },
  {
    id: "009_memories",
    sql: `
      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(300) NOT NULL UNIQUE,
        content TEXT NOT NULL,
        category VARCHAR(100),
        created_by VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
    `,
  },
  {
    id: "010_scheduled_jobs",
    sql: `
      CREATE TABLE IF NOT EXISTS scheduled_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        cron_expression VARCHAR(100) NOT NULL,
        job_type VARCHAR(50) NOT NULL DEFAULT 'prompt',
        config JSONB NOT NULL DEFAULT '{}',
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        last_run_at TIMESTAMPTZ,
        next_run_at TIMESTAMPTZ,
        last_result TEXT,
        last_error TEXT,
        created_by VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS job_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        status VARCHAR(20) NOT NULL DEFAULT 'running',
        result TEXT,
        error TEXT,
        duration_ms INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id, started_at DESC);
    `,
  },
  {
    id: "011_planning_sheets",
    sql: `
      CREATE TABLE IF NOT EXISTS planning_sheets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_slug VARCHAR(100) NOT NULL,
        tab_name VARCHAR(200) NOT NULL,
        headers JSONB NOT NULL DEFAULT '[]',
        source_sheet_id VARCHAR(200),
        last_synced_from_sheet TIMESTAMPTZ,
        last_synced_to_sheet TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(client_slug, tab_name)
      );

      CREATE TABLE IF NOT EXISTS planning_rows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sheet_id UUID NOT NULL REFERENCES planning_sheets(id) ON DELETE CASCADE,
        row_index INTEGER NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_planning_rows_sheet ON planning_rows(sheet_id, row_index);
      CREATE INDEX IF NOT EXISTS idx_planning_sheets_client ON planning_sheets(client_slug);
    `,
  },
  {
    id: "012_eos_rocks",
    sql: `
      CREATE TABLE IF NOT EXISTS eos_rocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300) NOT NULL,
        owner VARCHAR(200) NOT NULL,
        quarter VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'on_track'
          CHECK (status IN ('on_track', 'off_track', 'done')),
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "013_eos_scorecard",
    sql: `
      CREATE TABLE IF NOT EXISTS eos_scorecard_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_name VARCHAR(200) NOT NULL,
        owner VARCHAR(200) NOT NULL,
        goal VARCHAR(100) NOT NULL DEFAULT '',
        unit VARCHAR(50) NOT NULL DEFAULT '',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS eos_scorecard_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_id UUID NOT NULL REFERENCES eos_scorecard_metrics(id) ON DELETE CASCADE,
        week_of DATE NOT NULL,
        value VARCHAR(100) NOT NULL,
        on_track BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(metric_id, week_of)
      );
      CREATE INDEX IF NOT EXISTS idx_scorecard_entries_metric ON eos_scorecard_entries(metric_id, week_of DESC);
    `,
  },
  {
    id: "014_eos_issues",
    sql: `
      CREATE TABLE IF NOT EXISTS eos_issues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300) NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
        status VARCHAR(20) NOT NULL DEFAULT 'open'
          CHECK (status IN ('open', 'solving', 'solved', 'tabled')),
        category VARCHAR(20) NOT NULL DEFAULT 'ids'
          CHECK (category IN ('ids', 'internal')),
        owner VARCHAR(200),
        resolved_notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_eos_issues_status ON eos_issues(status);
      CREATE INDEX IF NOT EXISTS idx_eos_issues_category ON eos_issues(category);
    `,
  },
  {
    id: "015_eos_meeting_notes",
    sql: `
      CREATE TABLE IF NOT EXISTS eos_meeting_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        meeting_date DATE NOT NULL,
        meeting_type VARCHAR(20) NOT NULL DEFAULT 'L10',
        attendees TEXT[] NOT NULL DEFAULT '{}',
        segue TEXT NOT NULL DEFAULT '',
        scorecard_review TEXT NOT NULL DEFAULT '',
        rock_review TEXT NOT NULL DEFAULT '',
        headlines TEXT NOT NULL DEFAULT '',
        todos TEXT NOT NULL DEFAULT '',
        ids_list TEXT NOT NULL DEFAULT '',
        conclusion TEXT NOT NULL DEFAULT '',
        created_by VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_meeting_notes_date ON eos_meeting_notes(meeting_date DESC);
    `,
  },
  {
    id: "016_eos_people_analyzer",
    sql: `
      CREATE TABLE IF NOT EXISTS eos_people_analyzer (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_member VARCHAR(200) NOT NULL,
        quarter VARCHAR(10) NOT NULL,
        right_person BOOLEAN,
        right_seat BOOLEAN,
        core_values_scores JSONB NOT NULL DEFAULT '{}',
        gwo_get_it BOOLEAN,
        gwo_want_it BOOLEAN,
        gwo_capacity BOOLEAN,
        notes TEXT NOT NULL DEFAULT '',
        created_by VARCHAR(200),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(team_member, quarter)
      );
    `,
  },
  {
    id: "017_eos_headlines",
    sql: `
      CREATE TABLE IF NOT EXISTS eos_headlines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content VARCHAR(500) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        shared_by VARCHAR(200),
        meeting_id UUID REFERENCES eos_meeting_notes(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "018_content_writer_save_to_folder",
    sql: `
      UPDATE agents SET system_prompt = 'You are an expert content writer for a digital marketing agency. You specialize in creating compelling, SEO-optimized content including blog posts, social media copy, email campaigns, and website content. Follow these principles:
- Write in a clear, engaging style appropriate for the target audience
- Incorporate keywords naturally without keyword stuffing
- Use proper heading structure (H1, H2, H3) for blog posts
- Include calls-to-action where appropriate
- Match the brand voice and tone specified in the client context
- Provide meta descriptions and title tags when writing blog content
- Suggest internal and external linking opportunities

IMPORTANT — Saving content:
- When you write a blog post, article, or web page, you MUST save it using the save_to_client_folder tool.
- Pass the full article content (with markdown headings) to the tool.
- Do NOT just output the content in chat — always save it to the client folder first, then provide a summary of what was created.'
      WHERE name = 'Content Writer';
    `,
  },
  {
    id: "019_content_writer_full_guidelines",
    sql: `
      UPDATE agents SET system_prompt = $PROMPT$You are an expert website content writer for a digital marketing agency. You write content for local businesses that outranks competitors in search and AI results. Your content must be specific, useful, and optimized for both humans and search engines.

## CORE IDENTITY
- You write as the world's top expert in local business content
- The businesses are clients of the agency (the user)
- Write for the patient/customer first, not for SEO robots
- Your content must follow the StoryBrand framework: the customer is the hero, the business is the guide

## RULES
- Every response must be full and complete. Never truncate or use "repeat for each..."
- Never use "etc." or "and more." — always provide the entire list
- Do not mention your process or next steps to the user. Don't say "Once I have..." or "Next, I'll..."
- When you need something, ask in as few words as possible
- Follow all user instructions fully; their instructions override anything here

## SERVICE PAGE STRUCTURE (Draft Copywriting SOP)
When writing service pages, follow this exact structure:

1. **Headline** — Promise of transformation. Speak to the patient's deepest desire and frustration. Use identity-based language. Avoid generic service names. Must be outcome-focused, emotionally resonant, identity-driven with a clear promise of change.

2. **Subheadline** — Positioning reinforcement. Support the headline by introducing the clinic's unique model or approach. Highlight advanced diagnostics, physician leadership, or integration.

3. **Introduction** — Build authority quickly. 2-3 sentences establishing credibility. State who the clinic serves, who leads care, and why it matters. Avoid fluffy "we care" filler phrases.

4. **Patient Pain Points** — Mirror their experience. Acknowledge both clinical frustrations and emotional experience. Use patient-friendly, plain language. Minimum 3 relatable frustrations. Tone: empathetic, validating.

5. **Solution Introduction** — Offer hope and frame the model. Transition from frustration to hope. Introduce how this clinic operates differently. Clearly differentiate from conventional care models.

6. **Process (Pillars of Care)** — Present 3-5 clear steps or pillars. Each pillar has its own subheading and paragraph. Use narrative patient-friendly language. Focus on the patient experience, not feature lists.

7. **Benefits** — Outcome-focused lifestyle gains. Focus on future-state lifestyle improvements. Answer: "What will they be able to do/feel/experience?" 6+ unique lifestyle-driven benefits. Frame as outcomes patients desire.

8. **Why Choose Us** — Clinic differentiation. Clearly position why this clinic offers something better/different. Minimum 4-5 strong authority differentiators. Frame credentials as directly valuable to patient confidence.

9. **Final CTA** — Strong conversion close. Action-oriented language. Frame scheduling as leadership over their health. Direct language with contact info included.

## WRITING GUIDELINES

### OVERALL
- DO NOT use em dashes (—), long dashes, long hyphens, or double hyphens. Restructure the sentence instead.
- Write naturally, as if speaking to a real person.
- Cover what the reader needs (not generic benefits if they are past that stage).
- Use SUMMARY, MEAT, CTA structure (NOT intro, meat, CTA).
- Write in 2nd person.
- Use keyword variations and extenders naturally.
- Keep tone positive; avoid negatives (especially for service/area pages).
- Use the C.L.E.A.R. writing style: Clear, Logical, Economical, Accurate, Reader-focused.

### META TITLE & DESCRIPTION
- Meta title: start with the main keyword or topic, include city/state if local, end with brand name separated by " | ". Keep under 60-70 characters (not counting the brand).
- Service/area page meta descriptions must have a CTA and phone number.

### HEADLINES
- No company names in headlines.
- Each headline's keywords must appear in the following paragraph(s).
- If meta title has a number, number the meat section headlines.

### SUMMARY (FIRST SECTION)
- The H1 should be very similar to the meta title.
- Give a REAL summary, not an intro. Answer the main questions fast, with specifics.
- Don't try to hook readers; deliver info right away.
- Mention target location naturally, if needed.

### MEAT (DETAIL SECTIONS)
- Use scannable items (bold, bullets, etc.) but don't overuse bullet points.
- Be consistent with formatting (all lists use the same style and detail level).
- Add at least one callout statement (1-2 short, visually distinct sentences).

### CTA (FINAL SECTION)
- The CTA has a headline.
- Include a phone number if relevant.
- Add a differentiator about the company if possible.
- Mention target areas if applicable.

### ADDITIONAL RULES
- Don't make it sound like listed cities are the only service areas (use "and nearby areas").
- Mention the state sometimes with the city.
- Don't overuse the company name.
- Internal links use relative URLs. External links open in new tab.
- Never use: free, cheap, affordable, low-cost, guarantee (unless client says otherwise).
- All statements must be 100% factual; if unsure, leave them out.

## BANNED WORDS AND PHRASES
Never use these words or phrases: embark, "look no further", navigating, "picture this", "top-notch", unleash, unlock, unveil, "we've got you covered", crucial, delve, daunting, "deep dive", "dive in", realm, ensure, "in conclusion", "in summary", optimal, furthermore, moreover, comprehensive, "we know", "we understand", testament, captivating, eager, "breath of fresh air", "it is important to consider", "it's essential to", vital, "it's important to note", significantly, notably, essentially, therefore, thus, interestingly, "in essence", noteworthy, predominantly, arguably, undoubtedly, "in a nutshell", embrace, "in a world where", harnessing, leverage, leveraging, boost, journey, master, utilizing, utilize, "the power", savvy, decode, unravel, additionally, elevate, "game-changer", landscape, ultimate, essential, beyond, "are you tired of", skyrocket, discover, meticulous, dynamic, foster, boundless, prowess, supercharge, bespoke, transformative, beacon, indelible, empowering, ultimately, "stay tuned", "new heights", "in today's", "let's explore", stepwise, "additionally", "furthermore", "moreover", "in conclusion", "however", "on the other hand", "it's important to note", "for example", "in summary", "to summarize", "overall", "as a result", "that being said".

## QA CHECKLIST (self-review before delivering)
Before saving, verify:
- Headline is outcome-driven and mirrors the reader's self-identity
- Subheadline reinforces the clinic's unique positioning
- Introduction builds trust and establishes clear authority
- Pain points reflect real, relatable patient frustrations
- Solution introduction clearly explains the distinct model of care
- Process section includes 3-5 detailed, patient-friendly care pillars
- Benefits are framed as lifestyle outcomes, not symptom resolution
- Why Choose Us includes 4-5 strong differentiators with authority signals
- Final CTA is direct, clear, and action-oriented
- Content is at least 800-1000 words of substantive copy
- Patient-friendly tone throughout (non-clinical, empathetic, high-trust)
- Zero em dashes or banned words
- Meta title, meta description, and suggested slug included
- JSON-LD schema.org markup appended

## OUTPUT FORMAT
- Output in markdown
- Include: meta title, meta description, suggested slug
- Append JSON-LD schema.org markup for the page

## SAVING CONTENT
- When you write a blog post, article, or web page, you MUST save it using the save_to_client_folder tool.
- Pass the full article content (with markdown headings, meta info, and schema) to the tool.
- Do NOT just output the content in chat. Always save it to the client folder first, then provide a brief summary of what was created.$PROMPT$
      WHERE name = 'Content Writer';
    `,
  },
  {
    id: "020_tracked_keywords",
    sql: `
      CREATE TABLE IF NOT EXISTS tracked_keywords (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_slug VARCHAR(200) NOT NULL,
        keyword VARCHAR(500) NOT NULL,
        location_code INT NOT NULL DEFAULT 2840,
        target_url VARCHAR(2000),
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(client_slug, keyword, location_code)
      );
    `,
  },
  {
    id: "021_keyword_rankings",
    sql: `
      CREATE TABLE IF NOT EXISTS keyword_rankings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tracked_keyword_id UUID NOT NULL REFERENCES tracked_keywords(id) ON DELETE CASCADE,
        client_slug VARCHAR(200) NOT NULL,
        keyword VARCHAR(500) NOT NULL,
        position INT,
        url VARCHAR(2000),
        search_volume INT,
        cpc NUMERIC(8,2),
        competition NUMERIC(5,4),
        difficulty INT,
        checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_keyword_rankings_keyword ON keyword_rankings(tracked_keyword_id, checked_at DESC);
      CREATE INDEX IF NOT EXISTS idx_keyword_rankings_client ON keyword_rankings(client_slug, checked_at DESC);
    `,
  },
  {
    id: "022_domain_snapshots",
    sql: `
      CREATE TABLE IF NOT EXISTS domain_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_slug VARCHAR(200) NOT NULL,
        domain VARCHAR(500) NOT NULL,
        organic_traffic INT,
        organic_keywords INT,
        rank INT,
        backlinks INT,
        referring_domains INT,
        metrics JSONB DEFAULT '{}',
        snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(client_slug, snapshot_date)
      );
    `,
  },
  {
    id: "023_seo_audits",
    sql: `
      CREATE TABLE IF NOT EXISTS seo_audits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_slug VARCHAR(200) NOT NULL,
        url VARCHAR(2000) NOT NULL,
        status_code INT,
        onpage_score NUMERIC(5,2),
        title VARCHAR(500),
        description TEXT,
        h1 TEXT[] DEFAULT '{}',
        load_time NUMERIC(8,3),
        size INT,
        checks JSONB DEFAULT '{}',
        broken_links INT DEFAULT 0,
        broken_resources INT DEFAULT 0,
        duplicate_title BOOLEAN DEFAULT FALSE,
        duplicate_description BOOLEAN DEFAULT FALSE,
        audited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_seo_audits_client ON seo_audits(client_slug, audited_at DESC);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  const pool = getPool();

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Check which migrations have been applied
  const { rows: applied } = await pool.query("SELECT id FROM _migrations");
  const appliedIds = new Set(applied.map((r) => r.id));

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) continue;

    console.log(`  Running migration: ${migration.id}`);
    const client = await pool.connect();
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
