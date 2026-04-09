/**
 * PostgreSQL database connection pool and migration runner.
 */

import pg from "pg";

const { Pool, types } = pg;

// Return timestamps as ISO strings instead of Date objects.
// Without this, dates serialize as {} through JSON.stringify in some contexts.
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP
types.setTypeParser(1184, (val: string) => val); // TIMESTAMPTZ

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
  {
    id: "024_client_management_tables",
    sql: `
      -- Core client profiles
      CREATE TABLE IF NOT EXISTS cm_clients (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        company_name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255),
        dba_name VARCHAR(255),
        industry VARCHAR(100),
        location VARCHAR(255),
        domain VARCHAR(500),
        is_local_service_area BOOLEAN DEFAULT FALSE,
        display_address BOOLEAN DEFAULT TRUE,
        company_phone VARCHAR(50),
        main_phone VARCHAR(50),
        sms_phone VARCHAR(50),
        toll_free_phone VARCHAR(50),
        fax_phone VARCHAR(50),
        company_email VARCHAR(320),
        primary_email VARCHAR(320),
        inquiry_emails TEXT,
        employment_email VARCHAR(320),
        company_website VARCHAR(500),
        date_founded VARCHAR(20),
        year_founded INT,
        ein VARCHAR(50),
        business_type VARCHAR(100),
        number_of_customers INT,
        desired_new_clients INT,
        avg_client_lifetime_value NUMERIC(15,2),
        number_of_employees INT,
        estimated_annual_revenue NUMERIC(15,2),
        target_revenue NUMERIC(15,2),
        current_marketing_spend NUMERIC(15,2),
        current_ads_spend NUMERIC(15,2),
        crm_system VARCHAR(100),
        business_hours TEXT,
        holiday_hours TEXT,
        domain_registrar VARCHAR(100),
        google_drive_link VARCHAR(1000),
        color_scheme TEXT,
        design_inspiration_urls TEXT,
        ads_marketing_budget VARCHAR(255),
        ads_recruiting_budget VARCHAR(255),
        target_google_ads_conv_rate NUMERIC(5,2),
        target_google_ads_cpa NUMERIC(10,2),
        target_bing_ads_conv_rate NUMERIC(5,2),
        target_bing_ads_cpa NUMERIC(10,2),
        target_facebook_ads_cpa NUMERIC(10,2),
        time_zone VARCHAR(100),
        payment_types_accepted TEXT,
        combined_years_experience INT,
        business_facts TEXT,
        affiliations_associations TEXT,
        certifications_trainings TEXT,
        community_involvement TEXT,
        languages_spoken TEXT,
        service_seasonality TEXT,
        telemedicine_offered BOOLEAN DEFAULT FALSE,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','pending')),
        created_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Client contacts
      CREATE TABLE IF NOT EXISTS cm_contacts (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(100),
        email VARCHAR(320),
        phone VARCHAR(50),
        phone_type VARCHAR(50),
        notes TEXT,
        is_primary BOOLEAN DEFAULT FALSE,
        should_attribute BOOLEAN DEFAULT FALSE,
        linktree_url VARCHAR(500),
        wordpress_email VARCHAR(320),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Client addresses
      CREATE TABLE IF NOT EXISTS cm_addresses (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        label VARCHAR(100) NOT NULL,
        street_address VARCHAR(500),
        city VARCHAR(100),
        state VARCHAR(50),
        postal_code VARCHAR(20),
        location_type VARCHAR(20) NOT NULL DEFAULT 'Main' CHECK (location_type IN ('Main','Satellite','Home','Other')),
        notes TEXT,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Client services
      CREATE TABLE IF NOT EXISTS cm_services (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        category VARCHAR(255) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        offered BOOLEAN DEFAULT TRUE,
        price NUMERIC(10,2),
        duration VARCHAR(100),
        description TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Service areas
      CREATE TABLE IF NOT EXISTS cm_service_areas (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        target_cities TEXT,
        target_counties TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Team members (client's team, not agency team)
      CREATE TABLE IF NOT EXISTS cm_team_members (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(255),
        email VARCHAR(320),
        phone VARCHAR(50),
        photo_url VARCHAR(500),
        linkedin_url VARCHAR(500),
        facebook_url VARCHAR(500),
        instagram_url VARCHAR(500),
        other_profiles TEXT,
        bio TEXT,
        use_for_attribution BOOLEAN DEFAULT FALSE,
        preferred_contact_method VARCHAR(100),
        contact_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Competitors
      CREATE TABLE IF NOT EXISTS cm_competitors (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        rank INT,
        company_name VARCHAR(255) NOT NULL,
        url VARCHAR(500),
        usps TEXT,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Differentiators
      CREATE TABLE IF NOT EXISTS cm_differentiators (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Buyer personas
      CREATE TABLE IF NOT EXISTS cm_buyer_personas (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        persona_name VARCHAR(255) NOT NULL,
        age INT,
        gender VARCHAR(50),
        location VARCHAR(255),
        family_status VARCHAR(100),
        education_level VARCHAR(100),
        occupation VARCHAR(255),
        income_level VARCHAR(100),
        communication_channels TEXT,
        needs_description TEXT,
        pain_points TEXT,
        gains TEXT,
        buying_factors TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Important links (GBP, social, review sites)
      CREATE TABLE IF NOT EXISTS cm_important_links (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        link_type VARCHAR(100) NOT NULL,
        url VARCHAR(1000) NOT NULL,
        label VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Login/account credentials
      CREATE TABLE IF NOT EXISTS cm_logins (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        platform VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        login_url VARCHAR(1000),
        notes TEXT,
        access_level VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Content guidelines (brand voice, USPs, etc.)
      CREATE TABLE IF NOT EXISTS cm_content_guidelines (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE UNIQUE,
        brand_voice TEXT,
        tone VARCHAR(255),
        writing_style VARCHAR(100),
        dos_and_donts TEXT,
        approved_terminology TEXT,
        restrictions TEXT,
        unique_selling_points TEXT,
        guarantees TEXT,
        competitive_advantages TEXT,
        brand_colors VARCHAR(500),
        fonts VARCHAR(500),
        logo_guidelines TEXT,
        design_inspiration TEXT,
        target_audience_summary TEXT,
        demographics TEXT,
        psychographics TEXT,
        focus_topics TEXT,
        seo_keywords TEXT,
        content_themes TEXT,
        messaging_priorities TEXT,
        featured_testimonials TEXT,
        success_stories TEXT,
        social_proof_notes TEXT,
        ad_copy_guidelines TEXT,
        preferred_ctas TEXT,
        targeting_preferences TEXT,
        promotions TEXT,
        observed_holidays TEXT,
        holiday_content_notes TEXT,
        brand_story TEXT,
        content_purpose VARCHAR(100),
        user_action_strategy TEXT,
        existing_collateral TEXT,
        use_stock_photography BOOLEAN DEFAULT TRUE,
        image_source_notes TEXT,
        marketing_guide TEXT,
        writing_style_guide TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Brand story (StoryBrand 7-part framework)
      CREATE TABLE IF NOT EXISTS cm_brand_story (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','reviewed','approved')),
        hero_section JSONB,
        problem_section JSONB,
        guide_section JSONB,
        plan_section JSONB,
        cta_section JSONB,
        success_section JSONB,
        failure_section JSONB,
        brand_voice_section JSONB,
        visual_identity_section JSONB,
        content_strategy_section JSONB,
        messaging_section JSONB,
        implementation_section JSONB,
        full_brand_story TEXT,
        generated_at TIMESTAMPTZ,
        last_edited_at TIMESTAMPTZ,
        last_edited_by INT,
        share_token VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Campaigns
      CREATE TABLE IF NOT EXISTS cm_campaigns (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        campaign_name VARCHAR(255) NOT NULL,
        campaign_type VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','paused','completed','archived')),
        platforms TEXT,
        duration_type VARCHAR(20) DEFAULT 'ongoing' CHECK (duration_type IN ('ongoing','short_term')),
        services_promoted TEXT,
        usps TEXT,
        demographics_gender TEXT,
        demographics_age VARCHAR(100),
        demographics_location TEXT,
        demographics_interests TEXT,
        demographics_languages VARCHAR(255),
        audience_targeting TEXT,
        target_demographics TEXT,
        geo_targeting TEXT,
        ad_types TEXT,
        creative_style VARCHAR(100),
        ctas TEXT,
        budget NUMERIC(10,2),
        daily_budget NUMERIC(10,2),
        total_budget NUMERIC(10,2),
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        expected_outcomes TEXT,
        ad_copy_variations TEXT,
        landing_pages TEXT,
        notes TEXT,
        ad_accounts_setup VARCHAR(20) CHECK (ad_accounts_setup IN ('yes','no','partial')),
        monthly_budget_per_network TEXT,
        optimization_goals TEXT,
        lead_close_rate NUMERIC(5,2),
        cta_types TEXT,
        lead_form_types TEXT,
        qualifying_questions TEXT,
        offers TEXT,
        unique_differentiators TEXT,
        created_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Campaign deliverables
      CREATE TABLE IF NOT EXISTS cm_campaign_deliverables (
        id SERIAL PRIMARY KEY,
        campaign_id INT NOT NULL REFERENCES cm_campaigns(id) ON DELETE CASCADE,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        deliverable_type VARCHAR(50) NOT NULL DEFAULT 'other',
        status VARCHAR(20) NOT NULL DEFAULT 'not_started',
        priority VARCHAR(10) NOT NULL DEFAULT 'medium',
        description TEXT,
        assigned_to VARCHAR(255),
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        notes TEXT,
        sort_order INT DEFAULT 0,
        created_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cm_cd_campaign ON cm_campaign_deliverables(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_cm_cd_client ON cm_campaign_deliverables(client_id);

      -- Marketing plan items
      CREATE TABLE IF NOT EXISTS cm_marketing_plan (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        item VARCHAR(255) NOT NULL,
        is_included BOOLEAN DEFAULT FALSE,
        quantity INT,
        notes TEXT,
        completion_target TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Traffic light departments
      CREATE TABLE IF NOT EXISTS cm_tl_departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        color VARCHAR(50),
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Traffic light metrics
      CREATE TABLE IF NOT EXISTS cm_tl_metrics (
        id SERIAL PRIMARY KEY,
        department_id INT NOT NULL REFERENCES cm_tl_departments(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        metric_type VARCHAR(20) DEFAULT 'core_performance',
        unit VARCHAR(100),
        green_label VARCHAR(500),
        yellow_label VARCHAR(500),
        red_label VARCHAR(500),
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Traffic light health entries (weekly per-client per-department)
      CREATE TABLE IF NOT EXISTS cm_tl_health_entries (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        department_id INT NOT NULL REFERENCES cm_tl_departments(id) ON DELETE CASCADE,
        week_of VARCHAR(20) NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'green' CHECK (status IN ('green','yellow','red','na')),
        notes TEXT,
        metric_values JSONB,
        updated_by_name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cm_tl_health ON cm_tl_health_entries(client_id, department_id, week_of);

      -- Traffic light playbooks
      CREATE TABLE IF NOT EXISTS cm_tl_playbooks (
        id SERIAL PRIMARY KEY,
        department_id INT NOT NULL REFERENCES cm_tl_departments(id) ON DELETE CASCADE,
        yellow_actions TEXT,
        yellow_timeframe VARCHAR(100),
        red_actions TEXT,
        red_timeframe VARCHAR(100),
        escalation_contacts TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Traffic light action log
      CREATE TABLE IF NOT EXISTS cm_tl_action_log (
        id SERIAL PRIMARY KEY,
        health_entry_id INT NOT NULL REFERENCES cm_tl_health_entries(id) ON DELETE CASCADE,
        client_id INT NOT NULL,
        department_id INT NOT NULL REFERENCES cm_tl_departments(id),
        action TEXT NOT NULL,
        action_type VARCHAR(30) DEFAULT 'other',
        completed_by_name VARCHAR(255),
        completed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cm_tl_action_client ON cm_tl_action_log(client_id);

      -- Agency team (internal)
      CREATE TABLE IF NOT EXISTS cm_agency_team (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        role VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        primary_accountability TEXT,
        core_responsibilities TEXT,
        key_interfaces TEXT,
        success_looks_like TEXT,
        start_date TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'active',
        avatar_url VARCHAR(500),
        bio TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Activity log
      CREATE TABLE IF NOT EXISTS cm_activity_log (
        id SERIAL PRIMARY KEY,
        user_name VARCHAR(255),
        action VARCHAR(20) NOT NULL CHECK (action IN ('create','update','delete')),
        entity_type VARCHAR(100) NOT NULL,
        entity_id INT NOT NULL,
        entity_name VARCHAR(255),
        changes JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "025_tl_health_unique_constraint",
    sql: `
      ALTER TABLE cm_tl_health_entries
        ADD CONSTRAINT cm_tl_health_unique_entry UNIQUE (client_id, department_id, week_of);
    `,
  },
  {
    id: "026_enrichment",
    sql: `
      CREATE TABLE IF NOT EXISTS enrichment_prospects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_sheet_id TEXT NOT NULL,
        source_tab TEXT NOT NULL DEFAULT 'Sheet1',
        source_row INTEGER NOT NULL,
        -- Coldlytics original data
        company_name TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        address TEXT DEFAULT '',
        city TEXT DEFAULT '',
        state TEXT DEFAULT '',
        zip TEXT DEFAULT '',
        country TEXT DEFAULT '',
        industry TEXT DEFAULT '',
        sub_industry TEXT DEFAULT '',
        employee_count TEXT DEFAULT '',
        revenue_range TEXT DEFAULT '',
        contact_name TEXT DEFAULT '',
        contact_title TEXT DEFAULT '',
        contact_email TEXT DEFAULT '',
        contact_phone TEXT DEFAULT '',
        contact_linkedin TEXT DEFAULT '',
        gmb_link TEXT DEFAULT '',
        facebook_url TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        -- Derived
        domain TEXT,
        specialty TEXT,
        enrichment_status TEXT NOT NULL DEFAULT 'pending',
        enrichment_error TEXT,
        -- Size qualifiers
        provider_count INTEGER,
        location_count INTEGER,
        estimated_revenue TEXT,
        total_staff INTEGER,
        -- Pillar 1: Website
        website_platform TEXT,
        website_quality_score REAL,
        website_load_time REAL,
        website_mobile_friendly BOOLEAN,
        website_status TEXT,
        onpage_score REAL,
        -- Pillar 2: SEO
        top_services JSONB,
        organic_traffic INTEGER,
        organic_keywords INTEGER,
        domain_rank INTEGER,
        page1_rankings JSONB,
        ranked_keywords_sample JSONB,
        -- Pillar 3: Ads
        has_fb_pixel BOOLEAN,
        has_google_pixel BOOLEAN,
        has_other_ad_networks JSONB,
        -- Pillar 4: AI/Automation
        has_chatbot BOOLEAN,
        chatbot_provider TEXT,
        crm_platform TEXT,
        has_booking_widget BOOLEAN,
        booking_provider TEXT,
        has_lead_capture BOOLEAN,
        lead_capture_types JSONB,
        -- Additional signals
        gbp_rating REAL,
        gbp_review_count INTEGER,
        social_active JSONB,
        competitor_count INTEGER,
        contact_quality TEXT,
        -- Scoring
        pillar_scores JSONB,
        total_score INTEGER,
        qualification_tier TEXT,
        sales_angles JSONB,
        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (source_sheet_id, source_tab, source_row)
      );

      CREATE INDEX IF NOT EXISTS idx_enrichment_status ON enrichment_prospects (enrichment_status);
      CREATE INDEX IF NOT EXISTS idx_enrichment_tier ON enrichment_prospects (qualification_tier);
      CREATE INDEX IF NOT EXISTS idx_enrichment_domain ON enrichment_prospects (domain);
      CREATE INDEX IF NOT EXISTS idx_enrichment_score ON enrichment_prospects (total_score DESC);

      CREATE TABLE IF NOT EXISTS enrichment_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status TEXT NOT NULL DEFAULT 'running',
        total_prospects INTEGER NOT NULL DEFAULT 0,
        processed INTEGER NOT NULL DEFAULT 0,
        succeeded INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        skipped INTEGER NOT NULL DEFAULT 0,
        estimated_cost REAL NOT NULL DEFAULT 0,
        actual_cost REAL NOT NULL DEFAULT 0,
        batch_size INTEGER NOT NULL DEFAULT 10,
        concurrency INTEGER NOT NULL DEFAULT 2,
        cost_cap REAL NOT NULL DEFAULT 50,
        dry_run BOOLEAN NOT NULL DEFAULT false,
        error TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );
    `,
  },
  {
    id: "027_expand_services",
    sql: `
      ALTER TABLE cm_services
        ADD COLUMN IF NOT EXISTS description_long TEXT,
        ADD COLUMN IF NOT EXISTS ideal_patient_profile TEXT,
        ADD COLUMN IF NOT EXISTS good_fit_criteria TEXT,
        ADD COLUMN IF NOT EXISTS not_good_fit_criteria TEXT,
        ADD COLUMN IF NOT EXISTS target_age_range VARCHAR(100),
        ADD COLUMN IF NOT EXISTS target_gender VARCHAR(100),
        ADD COLUMN IF NOT EXISTS target_conditions TEXT,
        ADD COLUMN IF NOT EXISTS target_interests TEXT,
        ADD COLUMN IF NOT EXISTS service_area_cities TEXT,
        ADD COLUMN IF NOT EXISTS differentiators TEXT,
        ADD COLUMN IF NOT EXISTS expected_outcomes TEXT,
        ADD COLUMN IF NOT EXISTS common_concerns TEXT,
        ADD COLUMN IF NOT EXISTS parent_service_id INT REFERENCES cm_services(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_cm_services_parent ON cm_services(parent_service_id);
    `,
  },
  {
    id: "028_marketing_guides",
    sql: `
      CREATE TABLE IF NOT EXISTS guide_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        parent_id INT REFERENCES guide_categories(id) ON DELETE SET NULL,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS marketing_guides (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        category_id INT REFERENCES guide_categories(id) ON DELETE SET NULL,
        content TEXT NOT NULL DEFAULT '',
        description TEXT,
        tags TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        created_by VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_guides_status ON marketing_guides(status);
      CREATE INDEX IF NOT EXISTS idx_guides_category ON marketing_guides(category_id);
    `,
  },
  {
    id: "029_client_info_redesign",
    sql: `
      -- Phone numbers sub-table
      CREATE TABLE IF NOT EXISTS cm_phone_numbers (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        label VARCHAR(100) NOT NULL DEFAULT 'Main',
        phone_number VARCHAR(50) NOT NULL,
        is_sms_capable BOOLEAN DEFAULT FALSE,
        is_primary BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Email addresses sub-table
      CREATE TABLE IF NOT EXISTS cm_email_addresses (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        label VARCHAR(100) NOT NULL DEFAULT 'General',
        email_address VARCHAR(320) NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- New columns on cm_clients
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS founded_month INT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS business_hours_structured JSONB;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS payment_types JSONB;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS number_of_customers_period VARCHAR(10) DEFAULT 'monthly';
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS desired_new_clients_period VARCHAR(10) DEFAULT 'monthly';
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS estimated_annual_revenue_period VARCHAR(10) DEFAULT 'annual';
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS target_revenue_period VARCHAR(10) DEFAULT 'annual';
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS current_marketing_spend_period VARCHAR(10) DEFAULT 'monthly';
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS current_ads_spend_period VARCHAR(10) DEFAULT 'monthly';

      -- New columns on cm_team_members
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS specialties TEXT;
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS credentials TEXT;
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS services_offered TEXT;
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS gravatar_email VARCHAR(320);
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS tiktok_url VARCHAR(500);
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS twitter_url VARCHAR(500);
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS youtube_url VARCHAR(500);
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS education TEXT;
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS years_experience INT;
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS professional_memberships TEXT;
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS languages_spoken VARCHAR(500);
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS accepting_new_patients BOOLEAN DEFAULT TRUE;

      -- New columns on cm_contacts
      ALTER TABLE cm_contacts ADD COLUMN IF NOT EXISTS marketing_role VARCHAR(255);
      ALTER TABLE cm_contacts ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(100);
      ALTER TABLE cm_contacts ADD COLUMN IF NOT EXISTS response_time VARCHAR(100);
      ALTER TABLE cm_contacts ADD COLUMN IF NOT EXISTS approval_authority BOOLEAN DEFAULT FALSE;
      ALTER TABLE cm_contacts ADD COLUMN IF NOT EXISTS gravatar_email VARCHAR(320);

      -- Data migration: copy flat phone/email into sub-tables
      INSERT INTO cm_phone_numbers (client_id, label, phone_number, is_primary)
        SELECT id, 'Main', company_phone, TRUE FROM cm_clients WHERE company_phone IS NOT NULL AND company_phone != ''
        ON CONFLICT DO NOTHING;
      INSERT INTO cm_phone_numbers (client_id, label, phone_number, is_sms_capable)
        SELECT id, 'SMS', sms_phone, TRUE FROM cm_clients WHERE sms_phone IS NOT NULL AND sms_phone != ''
        ON CONFLICT DO NOTHING;
      INSERT INTO cm_phone_numbers (client_id, label, phone_number)
        SELECT id, 'Toll-Free', toll_free_phone FROM cm_clients WHERE toll_free_phone IS NOT NULL AND toll_free_phone != ''
        ON CONFLICT DO NOTHING;
      INSERT INTO cm_phone_numbers (client_id, label, phone_number)
        SELECT id, 'Fax', fax_phone FROM cm_clients WHERE fax_phone IS NOT NULL AND fax_phone != ''
        ON CONFLICT DO NOTHING;

      INSERT INTO cm_email_addresses (client_id, label, email_address, is_primary)
        SELECT id, 'General', company_email, TRUE FROM cm_clients WHERE company_email IS NOT NULL AND company_email != ''
        ON CONFLICT DO NOTHING;
      INSERT INTO cm_email_addresses (client_id, label, email_address)
        SELECT id, 'Inquiries', inquiry_emails FROM cm_clients WHERE inquiry_emails IS NOT NULL AND inquiry_emails != ''
        ON CONFLICT DO NOTHING;
      INSERT INTO cm_email_addresses (client_id, label, email_address)
        SELECT id, 'Employment', employment_email FROM cm_clients WHERE employment_email IS NOT NULL AND employment_email != ''
        ON CONFLICT DO NOTHING;
    `,
  },
  {
    id: "031_marketing_plan_deliverables",
    sql: `
      ALTER TABLE cm_marketing_plan ADD COLUMN IF NOT EXISTS deliverables TEXT;
    `,
  },
  {
    id: "030_fix_sms_phone_label",
    sql: `
      UPDATE cm_phone_numbers SET label = 'Main' WHERE label = 'SMS';
    `,
  },
  {
    id: "032_fix_enrichment_email_mapping",
    sql: `
      UPDATE enrichment_prospects
      SET contact_email = email, email = ''
      WHERE contact_email = '' AND email != '';
    `,
  },
  {
    id: "033_enrichment_provider_details",
    sql: `
      ALTER TABLE enrichment_prospects ADD COLUMN IF NOT EXISTS provider_details JSONB;
    `,
  },
  {
    id: "034_intake_data",
    sql: `
      ALTER TABLE cm_brand_story ADD COLUMN IF NOT EXISTS intake_data JSONB;
      ALTER TABLE cm_brand_story ADD COLUMN IF NOT EXISTS intake_submitted_at TIMESTAMPTZ;
    `,
  },
  {
    id: "036_brandscript",
    sql: `
      ALTER TABLE cm_brand_story ADD COLUMN IF NOT EXISTS brandscript JSONB;
      ALTER TABLE cm_brand_story ADD COLUMN IF NOT EXISTS brandscript_generated_at TIMESTAMPTZ;
    `,
  },
  {
    id: "037_cleanup_bad_marketing_plan",
    sql: `
      -- Delete marketing plan items where item is NULL, empty, or equals the category (bad import data)
      DELETE FROM cm_marketing_plan
      WHERE item IS NULL OR item = '' OR item = category;
    `,
  },
  {
    id: "039_fix_completion_target_type",
    sql: `
      -- completion_target was TIMESTAMPTZ but users enter free text like "Ongoing" or "02/28/2025"
      ALTER TABLE cm_marketing_plan ALTER COLUMN completion_target TYPE TEXT USING completion_target::TEXT;
    `,
  },
  {
    id: "040_marketing_plan_details",
    sql: `
      ALTER TABLE cm_marketing_plan ADD COLUMN IF NOT EXISTS details JSONB;
    `,
  },
  {
    id: "044_strategy_outputs",
    sql: `
      CREATE TABLE IF NOT EXISTS cm_strategy (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE UNIQUE,
        content_pillars JSONB,
        customer_journey JSONB,
        content_plan_12mo JSONB,
        sprint_plan_90day JSONB,
        generated_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "042_brand_story_unique_client",
    sql: `
      -- brand_story_generator uses ON CONFLICT (client_id) but no unique constraint exists
      CREATE UNIQUE INDEX IF NOT EXISTS cm_brand_story_client_id_unique ON cm_brand_story (client_id);
    `,
  },
  {
    id: "043_service_tiers_and_providers",
    sql: `
      ALTER TABLE cm_services ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'primary';
      ALTER TABLE cm_services ADD COLUMN IF NOT EXISTS provider_ids JSONB DEFAULT '[]';
    `,
  },
  {
    id: "041_widen_content_guideline_cols",
    sql: `
      ALTER TABLE cm_content_guidelines ALTER COLUMN writing_style TYPE TEXT;
      ALTER TABLE cm_content_guidelines ALTER COLUMN content_purpose TYPE TEXT;
      ALTER TABLE cm_content_guidelines ALTER COLUMN tone TYPE TEXT;
    `,
  },
  {
    id: "038_cleanup_bad_marketing_plan_v2",
    sql: `
      -- Nuke ALL marketing plan items that don't match our known template items
      -- These were created by a bad AI import. Users can re-seed the template.
      DELETE FROM cm_marketing_plan
      WHERE LOWER(TRIM(item)) NOT IN (
        'new build', 'hosting & maintenance',
        'social account setup & optimization', 'social posts per week', 'networks',
        '# of services / towns included in plan', 'business listing management',
        'standard blog posts (1000+ words)', 'long-form blog posts (2000+ words)',
        'media releases for long-form blog posts',
        'google ppc', 'google retargeting', 'google lsas', 'facebook ads', 'facebook retargeting',
        'review monitoring / reporting', 'review funnel / landing pages',
        'email signature snippet', 'review request management', 'review responses',
        'negative review disputation',
        'full access to system & automations', 'ai chat bot'
      );
    `,
  },
  {
    id: "035_source_tracking",
    sql: `
      -- Source tracking: JSONB for flat tables, VARCHAR for sub-entity rows
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS field_sources JSONB DEFAULT '{}';
      ALTER TABLE cm_content_guidelines ADD COLUMN IF NOT EXISTS field_sources JSONB DEFAULT '{}';

      ALTER TABLE cm_contacts ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
      ALTER TABLE cm_buyer_personas ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
      ALTER TABLE cm_competitors ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
      ALTER TABLE cm_differentiators ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
      ALTER TABLE cm_team_members ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
      ALTER TABLE cm_services ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
      ALTER TABLE cm_important_links ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
    `,
  },
  {
    id: "046_service_category_order",
    sql: `
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS service_category_order JSONB DEFAULT '[]';
    `,
  },
  {
    id: "045_enrichment_gbp_completeness",
    sql: `
      ALTER TABLE enrichment_prospects ADD COLUMN IF NOT EXISTS gbp_category TEXT;
      ALTER TABLE enrichment_prospects ADD COLUMN IF NOT EXISTS gbp_has_hours BOOLEAN;
      ALTER TABLE enrichment_prospects ADD COLUMN IF NOT EXISTS gbp_has_website_link BOOLEAN;
    `,
  },
  {
    id: "047_seed_traffic_light_departments",
    sql: `
      -- Seed default departments (skip if any already exist)
      INSERT INTO cm_tl_departments (name, description, icon, color, sort_order, is_active)
      SELECT * FROM (VALUES
        ('Media Buying',    'Google Ads, Meta Ads — campaign performance, spend efficiency, ROAS',        'megaphone',  '#EF4444', 1, TRUE),
        ('SEO',             'Organic search rankings, keyword tracking, technical health, content gaps',  'search',     '#22C55E', 2, TRUE),
        ('Content',         'Blog posts, website copy, social media content, brand voice consistency',    'pen-tool',   '#8B5CF6', 3, TRUE),
        ('Web Development', 'Site speed, uptime, technical maintenance, Divi/WordPress health',           'code',       '#3B82F6', 4, TRUE),
        ('Social Media',    'Social engagement, posting consistency, audience growth, community management', 'share-2',  '#EC4899', 5, TRUE),
        ('Automations',     'GHL workflows, AI chat/voice agents, email sequences, funnel performance',  'zap',        '#F59E0B', 6, TRUE),
        ('Billing',         'Invoice status, payment collection, contract renewals, account standing',    'credit-card','#6B7280', 7, TRUE)
      ) AS v(name, description, icon, color, sort_order, is_active)
      WHERE NOT EXISTS (SELECT 1 FROM cm_tl_departments LIMIT 1);

      -- Seed metrics for Media Buying
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, m.name, m.description, m.metric_type, m.green_label, m.yellow_label, m.red_label, m.sort_order
      FROM cm_tl_departments d
      CROSS JOIN (VALUES
        ('ROAS',             'Return on ad spend',                    'core_performance', 'Above target ROAS',      'Within 20% of target',       'Below 50% of target or declining', 1),
        ('Cost Per Lead',    'Average cost to acquire a lead',        'core_performance', 'At or below target CPL', 'CPL rising but manageable',  'CPL 2x+ above target',             2),
        ('Ad Spend Pacing',  'Monthly budget utilization',            'leading',          'On pace (90-110%)',       'Over/under pacing (80-120%)', 'Severely off pace (<80% or >120%)',3)
      ) AS m(name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      WHERE d.name = 'Media Buying'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_metrics WHERE department_id = d.id LIMIT 1);

      -- Seed metrics for SEO
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, m.name, m.description, m.metric_type, m.green_label, m.yellow_label, m.red_label, m.sort_order
      FROM cm_tl_departments d
      CROSS JOIN (VALUES
        ('Keyword Rankings',   'Target keyword position changes',      'core_performance', 'Rankings stable/improving', 'Some rankings dropped',         'Major ranking losses',              1),
        ('Organic Traffic',    'Organic sessions trend',               'core_performance', 'Traffic growing or stable',  'Traffic flat or slight decline', 'Significant traffic drop (>15%)',   2),
        ('Technical Health',   'Site audit score and issues',          'leading',          'Score >90, no critical issues', 'Score 70-90, minor issues',  'Score <70 or critical issues',      3)
      ) AS m(name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      WHERE d.name = 'SEO'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_metrics WHERE department_id = d.id LIMIT 1);

      -- Seed metrics for Content
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, m.name, m.description, m.metric_type, m.green_label, m.yellow_label, m.red_label, m.sort_order
      FROM cm_tl_departments d
      CROSS JOIN (VALUES
        ('Content Output',     'Articles/posts published vs plan',     'core_performance', 'On schedule',               'Slightly behind',               'Significantly behind schedule',     1),
        ('Content Quality',    'Brand voice consistency, engagement',  'core_performance', 'High quality, on brand',    'Minor revisions needed',        'Major quality issues',              2)
      ) AS m(name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      WHERE d.name = 'Content'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_metrics WHERE department_id = d.id LIMIT 1);

      -- Seed metrics for Web Development
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, m.name, m.description, m.metric_type, m.green_label, m.yellow_label, m.red_label, m.sort_order
      FROM cm_tl_departments d
      CROSS JOIN (VALUES
        ('Site Speed',         'Core Web Vitals / page load time',     'core_performance', 'All CWV passing',           'Some CWV marginal',             'CWV failing, slow load',            1),
        ('Uptime',             'Site availability',                    'leading',          '99.9%+ uptime',             'Minor downtime incidents',      'Significant downtime or outage',    2)
      ) AS m(name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      WHERE d.name = 'Web Development'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_metrics WHERE department_id = d.id LIMIT 1);

      -- Seed playbooks for Media Buying
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id,
        'Review creative performance and audience targeting' || E'\\n' || 'Check for audience fatigue or ad disapprovals' || E'\\n' || 'Schedule optimization review with team',
        'Within 48 hours',
        'Full campaign audit — pause underperformers' || E'\\n' || 'Client strategy call to realign goals/budget' || E'\\n' || 'Leadership review of account',
        'Within 24 hours',
        'Media Director, Account Manager'
      FROM cm_tl_departments d
      WHERE d.name = 'Media Buying'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_playbooks WHERE department_id = d.id);

      -- Seed playbooks for SEO
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id,
        'Review ranking drops and identify causes' || E'\\n' || 'Check for algorithm updates or technical issues' || E'\\n' || 'Prioritize content updates for affected keywords',
        'Within 1 week',
        'Full technical audit and ranking analysis' || E'\\n' || 'Emergency content/link building plan' || E'\\n' || 'Client notification with action plan',
        'Within 48 hours',
        'SEO Lead, Account Manager'
      FROM cm_tl_departments d
      WHERE d.name = 'SEO'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_playbooks WHERE department_id = d.id);
    `,
  },
  {
    id: "048_refine_traffic_light_departments",
    sql: `
      -- Remove Billing department (managed externally)
      DELETE FROM cm_tl_departments WHERE name = 'Billing';

      -- Add Customer Success department (relationship health — the #1 retention signal from SFA traffic light workshop)
      INSERT INTO cm_tl_departments (name, description, icon, color, sort_order, is_active)
      SELECT 'Customer Success', 'Client relationship health — communication, satisfaction (NPS), call engagement, overall vibe', 'heart', '#10B981', 7, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM cm_tl_departments WHERE name = 'Customer Success');

      -- Seed metrics for Social Media
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, m.name, m.description, m.metric_type, m.green_label, m.yellow_label, m.red_label, m.sort_order
      FROM cm_tl_departments d
      CROSS JOIN (VALUES
        ('Posting Consistency', 'Posts published vs scheduled plan',  'core_performance', 'All posts on schedule',     'Slightly behind schedule',      'Significantly behind or missed',    1),
        ('Engagement Rate',     'Likes, comments, shares per post',  'core_performance', 'Above industry benchmark',  'At or slightly below benchmark', 'Well below benchmark, declining',   2),
        ('Audience Growth',     'Follower/subscriber growth trend',  'leading',          'Steady growth',             'Flat or minimal growth',        'Declining followers',               3)
      ) AS m(name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      WHERE d.name = 'Social Media'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_metrics WHERE department_id = d.id LIMIT 1);

      -- Seed metrics for Automations
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, m.name, m.description, m.metric_type, m.green_label, m.yellow_label, m.red_label, m.sort_order
      FROM cm_tl_departments d
      CROSS JOIN (VALUES
        ('Workflow Health',     'GHL automations running without errors', 'core_performance', 'All workflows active, no errors', 'Minor issues, some skipped steps', 'Workflows broken or disabled',  1),
        ('AI Agent Performance','Chat/voice agent resolution and engagement', 'core_performance', 'High resolution rate, positive feedback', 'Some unresolved, mixed feedback', 'Low resolution, complaints', 2),
        ('Funnel Conversion',  'Lead-to-appointment or lead-to-sale rate', 'leading',         'Conversion at or above target', 'Conversion slightly below target', 'Conversion significantly below',  3)
      ) AS m(name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      WHERE d.name = 'Automations'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_metrics WHERE department_id = d.id LIMIT 1);

      -- Seed metrics for Customer Success (relationship health signals from the traffic light workshop)
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, m.name, m.description, m.metric_type, m.green_label, m.yellow_label, m.red_label, m.sort_order
      FROM cm_tl_departments d
      CROSS JOIN (VALUES
        ('NPS / Satisfaction',  'Client happiness score (NPS survey or call feedback)',  'core_performance', 'Purple/Green — happy, would refer', 'Okay — average, room to improve', 'Not good — dissatisfied, at risk',     1),
        ('Communication',       'Recency and quality of client contact',                'leading',          'Regular contact, responsive',       'Slow responses, missed calls',     'Gone dark or hostile tone',            2),
        ('Call Engagement',     'Showing up for calls, booking reviews',                'friction',         'Books and attends calls',           'Misses some, slow to reschedule',  'Avoids calls, no engagement',          3)
      ) AS m(name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      WHERE d.name = 'Customer Success'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_metrics WHERE department_id = d.id LIMIT 1);

      -- Seed playbooks for Content
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id,
        'Review content calendar and identify bottlenecks' || E'\\n' || 'Check brand voice alignment on recent pieces' || E'\\n' || 'Prioritize overdue deliverables',
        'Within 1 week',
        'Emergency content catch-up plan' || E'\\n' || 'Client call to reset expectations and timeline' || E'\\n' || 'Reassign resources if needed',
        'Within 48 hours',
        'Content Lead, Account Manager'
      FROM cm_tl_departments d
      WHERE d.name = 'Content'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_playbooks WHERE department_id = d.id);

      -- Seed playbooks for Web Development
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id,
        'Run speed audit and identify slow pages' || E'\\n' || 'Check for plugin conflicts or update issues' || E'\\n' || 'Review hosting performance metrics',
        'Within 1 week',
        'Emergency site fix — downtime or critical errors' || E'\\n' || 'Client notification with status and ETA' || E'\\n' || 'Escalate to hosting provider if needed',
        'Within 4 hours',
        'Web Dev Lead, Account Manager'
      FROM cm_tl_departments d
      WHERE d.name = 'Web Development'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_playbooks WHERE department_id = d.id);

      -- Seed playbooks for Social Media
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id,
        'Review posting schedule and catch up on missed posts' || E'\\n' || 'Audit recent engagement and adjust strategy' || E'\\n' || 'Check content quality and brand alignment',
        'Within 1 week',
        'Full social audit — content, audience, competitors' || E'\\n' || 'Client strategy call to realign social goals' || E'\\n' || 'Develop recovery content plan',
        'Within 48 hours',
        'Social Media Lead, Account Manager'
      FROM cm_tl_departments d
      WHERE d.name = 'Social Media'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_playbooks WHERE department_id = d.id);

      -- Seed playbooks for Automations
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id,
        'Review GHL workflow logs for errors or skipped steps' || E'\\n' || 'Check AI agent conversation quality' || E'\\n' || 'Audit funnel conversion drop-off points',
        'Within 1 week',
        'Emergency workflow repair — disable broken automations' || E'\\n' || 'Manual follow-up on leads stuck in pipeline' || E'\\n' || 'Client notification with remediation plan',
        'Within 24 hours',
        'Automations Lead, Account Manager'
      FROM cm_tl_departments d
      WHERE d.name = 'Automations'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_playbooks WHERE department_id = d.id);

      -- Seed playbooks for Customer Success (pivot options from the traffic light workshop)
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id,
        'Proactive check-in call — ask how things are going' || E'\\n' || 'Review recent deliverables and results together' || E'\\n' || 'Send NPS survey if not recently collected',
        'Within 48 hours',
        'Immediate escalation call — team lead or director' || E'\\n' || 'Full account review across all departments' || E'\\n' || 'Build recovery game plan with specific action items and timeline',
        'Within 24 hours',
        'CSM Director, Agency Owner'
      FROM cm_tl_departments d
      WHERE d.name = 'Customer Success'
      AND NOT EXISTS (SELECT 1 FROM cm_tl_playbooks WHERE department_id = d.id);
    `,
  },
  {
    id: "049_per_client_departments",
    sql: `
      -- Per-client department configuration: which departments are tracked for each client
      -- If no rows exist for a client, ALL active departments apply (backward compatible)
      CREATE TABLE IF NOT EXISTS cm_tl_client_departments (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        department_id INT NOT NULL REFERENCES cm_tl_departments(id) ON DELETE CASCADE,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(client_id, department_id)
      );
      CREATE INDEX IF NOT EXISTS idx_cm_tl_client_dept ON cm_tl_client_departments(client_id);
    `,
  },
  {
    id: "051_ensure_all_departments",
    sql: `
      -- Ensure all 7 departments exist (fixes partial seeding from 047/048 if departments pre-existed)
      INSERT INTO cm_tl_departments (name, description, icon, color, sort_order, is_active)
      SELECT v.name, v.description, v.icon, v.color, v.sort_order, TRUE
      FROM (VALUES
        ('Media Buying',      'Google Ads, Meta Ads — campaign performance, spend efficiency, ROAS',        'megaphone',  '#EF4444', 1),
        ('SEO',               'Organic search rankings, keyword tracking, technical health, content gaps',  'search',     '#22C55E', 2),
        ('Content',           'Blog posts, website copy, social media content, brand voice consistency',    'pen-tool',   '#8B5CF6', 3),
        ('Web Development',   'Site speed, uptime, technical maintenance, Divi/WordPress health',           'code',       '#3B82F6', 4),
        ('Social Media',      'Social engagement, posting consistency, audience growth, community management', 'share-2', '#EC4899', 5),
        ('Automations',       'GHL workflows, AI chat/voice agents, email sequences, funnel performance',  'zap',        '#F59E0B', 6),
        ('Customer Success',  'Client relationship health — communication, satisfaction (NPS), call engagement, overall vibe', 'heart', '#10B981', 7)
      ) AS v(name, description, icon, color, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM cm_tl_departments d WHERE d.name = v.name);

      -- Remove Billing if it exists (managed externally)
      DELETE FROM cm_tl_departments WHERE name = 'Billing';

      -- Seed metrics for any departments that don't have them yet
      INSERT INTO cm_tl_metrics (department_id, name, description, metric_type, green_label, yellow_label, red_label, sort_order)
      SELECT d.id, v.name, v.description, v.metric_type, v.green_label, v.yellow_label, v.red_label, v.sort_order
      FROM cm_tl_departments d
      JOIN (VALUES
        ('Media Buying',     'ROAS',                 'Return on ad spend',                    'core_performance', 'Above target ROAS',           'Within 20% of target',            'Below 50% of target or declining', 1),
        ('Media Buying',     'Cost Per Lead',        'Average cost to acquire a lead',        'core_performance', 'At or below target CPL',      'CPL rising but manageable',       'CPL 2x+ above target',             2),
        ('Media Buying',     'Ad Spend Pacing',      'Monthly budget utilization',            'leading',          'On pace (90-110%)',            'Over/under pacing (80-120%)',     'Severely off pace',                 3),
        ('SEO',              'Keyword Rankings',     'Target keyword position changes',       'core_performance', 'Rankings stable/improving',    'Some rankings dropped',           'Major ranking losses',              1),
        ('SEO',              'Organic Traffic',      'Organic sessions trend',                'core_performance', 'Traffic growing or stable',    'Traffic flat or slight decline',   'Significant traffic drop (>15%)',   2),
        ('SEO',              'Technical Health',     'Site audit score and issues',           'leading',          'Score >90, no critical issues','Score 70-90, minor issues',       'Score <70 or critical issues',      3),
        ('Content',          'Content Output',       'Articles/posts published vs plan',      'core_performance', 'On schedule',                  'Slightly behind',                 'Significantly behind schedule',     1),
        ('Content',          'Content Quality',      'Brand voice consistency, engagement',   'core_performance', 'High quality, on brand',       'Minor revisions needed',          'Major quality issues',              2),
        ('Web Development',  'Site Speed',           'Core Web Vitals / page load time',      'core_performance', 'All CWV passing',              'Some CWV marginal',               'CWV failing, slow load',            1),
        ('Web Development',  'Uptime',              'Site availability',                     'leading',          '99.9%+ uptime',                'Minor downtime incidents',        'Significant downtime or outage',    2),
        ('Social Media',     'Posting Consistency',  'Posts published vs scheduled plan',     'core_performance', 'All posts on schedule',        'Slightly behind schedule',        'Significantly behind or missed',    1),
        ('Social Media',     'Engagement Rate',      'Likes, comments, shares per post',     'core_performance', 'Above industry benchmark',     'At or slightly below benchmark',  'Well below benchmark, declining',   2),
        ('Social Media',     'Audience Growth',      'Follower/subscriber growth trend',      'leading',          'Steady growth',                'Flat or minimal growth',          'Declining followers',               3),
        ('Automations',      'Workflow Health',      'GHL automations running without errors','core_performance', 'All workflows active',         'Minor issues, some skipped',      'Workflows broken or disabled',      1),
        ('Automations',      'AI Agent Performance', 'Chat/voice agent resolution',          'core_performance', 'High resolution rate',         'Some unresolved, mixed feedback', 'Low resolution, complaints',        2),
        ('Automations',      'Funnel Conversion',    'Lead-to-appointment rate',             'leading',          'Conversion at or above target','Slightly below target',           'Significantly below',               3),
        ('Customer Success', 'NPS / Satisfaction',   'Client happiness score',               'core_performance', 'Purple/Green — happy',         'Okay — room to improve',          'Not good — dissatisfied, at risk',  1),
        ('Customer Success', 'Communication',        'Recency and quality of contact',       'leading',          'Regular contact, responsive',  'Slow responses, missed calls',    'Gone dark or hostile tone',         2),
        ('Customer Success', 'Call Engagement',      'Showing up for calls',                 'friction',         'Books and attends calls',      'Misses some, slow to reschedule', 'Avoids calls, no engagement',       3)
      ) AS v(dept_name, name, description, metric_type, green_label, yellow_label, red_label, sort_order) ON d.name = v.dept_name
      WHERE NOT EXISTS (SELECT 1 FROM cm_tl_metrics m WHERE m.department_id = d.id AND m.name = v.name);

      -- Seed playbooks for departments that don't have them yet
      INSERT INTO cm_tl_playbooks (department_id, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts)
      SELECT d.id, v.yellow_actions, v.yellow_timeframe, v.red_actions, v.red_timeframe, v.escalation_contacts
      FROM cm_tl_departments d
      JOIN (VALUES
        ('Media Buying',     'Review creative performance and audience targeting
Check for audience fatigue or ad disapprovals
Schedule optimization review with team', 'Within 48 hours', 'Full campaign audit — pause underperformers
Client strategy call to realign goals/budget
Leadership review of account', 'Within 24 hours', 'Media Director, Account Manager'),
        ('SEO',              'Review ranking drops and identify causes
Check for algorithm updates or technical issues
Prioritize content updates for affected keywords', 'Within 1 week', 'Full technical audit and ranking analysis
Emergency content/link building plan
Client notification with action plan', 'Within 48 hours', 'SEO Lead, Account Manager'),
        ('Content',          'Review content calendar and identify bottlenecks
Check brand voice alignment on recent pieces
Prioritize overdue deliverables', 'Within 1 week', 'Emergency content catch-up plan
Client call to reset expectations and timeline
Reassign resources if needed', 'Within 48 hours', 'Content Lead, Account Manager'),
        ('Web Development',  'Run speed audit and identify slow pages
Check for plugin conflicts or update issues
Review hosting performance metrics', 'Within 1 week', 'Emergency site fix — downtime or critical errors
Client notification with status and ETA
Escalate to hosting provider if needed', 'Within 4 hours', 'Web Dev Lead, Account Manager'),
        ('Social Media',     'Review posting schedule and catch up on missed posts
Audit recent engagement and adjust strategy
Check content quality and brand alignment', 'Within 1 week', 'Full social audit — content, audience, competitors
Client strategy call to realign social goals
Develop recovery content plan', 'Within 48 hours', 'Social Media Lead, Account Manager'),
        ('Automations',      'Review GHL workflow logs for errors or skipped steps
Check AI agent conversation quality
Audit funnel conversion drop-off points', 'Within 1 week', 'Emergency workflow repair — disable broken automations
Manual follow-up on leads stuck in pipeline
Client notification with remediation plan', 'Within 24 hours', 'Automations Lead, Account Manager'),
        ('Customer Success',  'Proactive check-in call — ask how things are going
Review recent deliverables and results together
Send NPS survey if not recently collected', 'Within 48 hours', 'Immediate escalation call — team lead or director
Full account review across all departments
Build recovery game plan with specific action items and timeline', 'Within 24 hours', 'CSM Director, Agency Owner')
      ) AS v(dept_name, yellow_actions, yellow_timeframe, red_actions, red_timeframe, escalation_contacts) ON d.name = v.dept_name
      WHERE NOT EXISTS (SELECT 1 FROM cm_tl_playbooks p WHERE p.department_id = d.id);
    `,
  },
  {
    id: "053_intake_field_completeness",
    sql: `
      -- ─── Pillar 1: Foundation gaps ─────────────────────────
      -- Mission, values, slogans, founding story
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS mission_statement TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS core_values TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS slogans_mottos TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS company_background TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS founding_inspiration TEXT;

      -- Google Business Profile fields
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS gbp_url VARCHAR(2000);
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS gbp_review_link VARCHAR(2000);
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS gbp_location_id VARCHAR(255);

      -- Logins / access (per Andrew: store Drive link, not actual creds)
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS logins_drive_link VARCHAR(2000);
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS access_checklist JSONB DEFAULT '{}';

      -- Social media URLs (single JSONB to avoid sub-table sprawl)
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
      -- Expected keys: facebook, instagram, linkedin, twitter, youtube, tiktok, pinterest, other
      -- social_media_guidelines: text instructions for content team
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS social_media_guidelines TEXT;

      -- Multi-location support: keep existing 'location' field for backward compat,
      -- add JSONB array for multi-location agencies
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS additional_locations JSONB DEFAULT '[]';

      -- ─── Pillar 2: Discovery gaps ─────────────────────────
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS notable_mentions TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS awards_recognitions TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS quality_assurance_process TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS what_makes_us_unique TEXT;

      -- Demographics breakdown (currently only on content_guidelines)
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS demographics_gender TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS demographics_age TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS demographics_location TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS demographics_income TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS demographics_education TEXT;
      ALTER TABLE cm_clients ADD COLUMN IF NOT EXISTS demographics_pain_points TEXT;

      -- Testimonials as their own table (don't duplicate the cluttered content_guidelines.featured_testimonials)
      CREATE TABLE IF NOT EXISTS cm_testimonials (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        author VARCHAR(255),
        author_title VARCHAR(255),
        testimonial_text TEXT NOT NULL,
        link VARCHAR(2000),
        rating INT,
        sort_order INT DEFAULT 0,
        is_featured BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cm_testimonials_client ON cm_testimonials(client_id);

      -- ─── Pillar 3: Brand Strategy gaps (Endless Customers / Big 5) ─────
      -- These will be sections in cm_brand_story (JSONB columns), but we need
      -- to add them to the schema first
      ALTER TABLE cm_brand_story ADD COLUMN IF NOT EXISTS big_five_section JSONB;
      ALTER TABLE cm_brand_story ADD COLUMN IF NOT EXISTS endless_customers_section JSONB;
      ALTER TABLE cm_brand_story ADD COLUMN IF NOT EXISTS taya_questions JSONB;

      -- ─── Pillar 4: Marketing Execution gaps ─────────────────────
      -- Ads management config
      CREATE TABLE IF NOT EXISTS cm_ads_config (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE UNIQUE,
        platforms JSONB DEFAULT '[]',
        services_focus TEXT,
        unique_capabilities TEXT,
        accounts_setup BOOLEAN DEFAULT FALSE,
        access_granted JSONB DEFAULT '{}',
        budget_per_network JSONB DEFAULT '{}',
        optimization_goal VARCHAR(255),
        expected_close_rate NUMERIC(5,2),
        appointment_handler VARCHAR(255),
        value_per_client NUMERIC(10,2),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Database reactivation offers
      CREATE TABLE IF NOT EXISTS cm_reactivation_offers (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        offer_name VARCHAR(255),
        offer_description TEXT,
        dates_active TEXT,
        target_segment TEXT,
        delivery_method VARCHAR(50),
        message_copy TEXT,
        landing_page_url VARCHAR(2000),
        notes TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cm_reactivation_offers_client ON cm_reactivation_offers(client_id);

      -- Appointment calendar setup
      CREATE TABLE IF NOT EXISTS cm_appointment_types (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        purpose TEXT,
        assigned_user VARCHAR(255),
        hours_available TEXT,
        meeting_length VARCHAR(100),
        min_schedule_notice VARCHAR(100),
        date_range VARCHAR(100),
        buffer_time VARCHAR(100),
        reminders_automations TEXT,
        notes TEXT,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cm_appointment_types_client ON cm_appointment_types(client_id);

      -- AI bot training config
      CREATE TABLE IF NOT EXISTS cm_ai_bot_config (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE UNIQUE,
        bot_name VARCHAR(255),
        role TEXT,
        purpose TEXT,
        primary_tasks TEXT,
        rules TEXT,
        difficult_topics_handling TEXT,
        pricing_response TEXT,
        conversation_flow TEXT,
        appointment_info_needed TEXT,
        common_problems TEXT,
        user_demographics TEXT,
        languages VARCHAR(255),
        employment_inquiries TEXT,
        solicitor_handling TEXT,
        meta_ai_disabled BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: "052_local_heatmaps_and_gbp",
    sql: `
      -- Add local pack position to keyword_rankings (for GBP map pack tracking)
      ALTER TABLE keyword_rankings ADD COLUMN IF NOT EXISTS local_pack_position INT;
      ALTER TABLE keyword_rankings ADD COLUMN IF NOT EXISTS local_pack_url VARCHAR(2000);

      -- Local heatmap scans — one per (client, keyword, scan_date)
      CREATE TABLE IF NOT EXISTS local_heatmap_scans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_slug VARCHAR(200) NOT NULL,
        keyword VARCHAR(500) NOT NULL,
        center_lat NUMERIC(10,7) NOT NULL,
        center_lng NUMERIC(10,7) NOT NULL,
        grid_size INT NOT NULL DEFAULT 5,
        radius_miles NUMERIC(5,2) NOT NULL DEFAULT 1.0,
        business_name VARCHAR(500),
        scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cost_estimate NUMERIC(10,4),
        notes TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_local_heatmap_client ON local_heatmap_scans(client_slug, scanned_at DESC);

      -- Individual grid points within a scan
      CREATE TABLE IF NOT EXISTS local_heatmap_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scan_id UUID NOT NULL REFERENCES local_heatmap_scans(id) ON DELETE CASCADE,
        grid_row INT NOT NULL,
        grid_col INT NOT NULL,
        latitude NUMERIC(10,7) NOT NULL,
        longitude NUMERIC(10,7) NOT NULL,
        position INT,
        business_found BOOLEAN DEFAULT FALSE,
        top_competitor VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_local_heatmap_points_scan ON local_heatmap_points(scan_id);

      -- Add scheduling fields to tracked_keywords
      ALTER TABLE tracked_keywords ADD COLUMN IF NOT EXISTS check_frequency VARCHAR(20) DEFAULT 'weekly';
      ALTER TABLE tracked_keywords ADD COLUMN IF NOT EXISTS track_local_pack BOOLEAN DEFAULT FALSE;
      ALTER TABLE tracked_keywords ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
      ALTER TABLE tracked_keywords ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
    `,
  },
  {
    id: "050_per_client_metric_overrides",
    sql: `
      -- Per-client metric threshold overrides
      -- If no override exists for a client+metric, the global metric thresholds apply
      CREATE TABLE IF NOT EXISTS cm_tl_client_metrics (
        id SERIAL PRIMARY KEY,
        client_id INT NOT NULL REFERENCES cm_clients(id) ON DELETE CASCADE,
        metric_id INT NOT NULL REFERENCES cm_tl_metrics(id) ON DELETE CASCADE,
        green_label VARCHAR(500),
        yellow_label VARCHAR(500),
        red_label VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(client_id, metric_id)
      );
      CREATE INDEX IF NOT EXISTS idx_cm_tl_client_metrics ON cm_tl_client_metrics(client_id);
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
