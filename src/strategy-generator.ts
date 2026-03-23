/**
 * ═══════════════════════════════════════════════════════════════
 *  Strategy Generator
 *  AI-powered generation of content pillars, customer journey maps,
 *  12-month content plans, and 90-day sprint plans.
 * ═══════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import { query } from "./database.js";

const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-5-20250929";

// ── Gather all client context ────────────────────────────

async function gatherStrategyContext(clientId: number): Promise<string> {
  const [clientRes, servicesRes, guidelinesRes, personasRes, diffRes, competitorsRes, storyRes] =
    await Promise.all([
      query("SELECT * FROM cm_clients WHERE id = $1", [clientId]),
      query("SELECT service_name, category, tier, description FROM cm_services WHERE client_id = $1 ORDER BY tier, category", [clientId]),
      query("SELECT * FROM cm_content_guidelines WHERE client_id = $1", [clientId]),
      query("SELECT * FROM cm_buyer_personas WHERE client_id = $1", [clientId]),
      query("SELECT * FROM cm_differentiators WHERE client_id = $1", [clientId]),
      query("SELECT * FROM cm_competitors WHERE client_id = $1", [clientId]),
      query("SELECT hero_section, problem_section, guide_section FROM cm_brand_story WHERE client_id = $1", [clientId]),
    ]);

  const client = clientRes.rows[0];
  if (!client) throw new Error(`Client ${clientId} not found`);

  const parts: string[] = [];

  parts.push(`## Company: ${client.company_name}`);
  if (client.industry) parts.push(`Industry: ${client.industry}`);
  if (client.company_website) parts.push(`Website: ${client.company_website}`);
  if (client.location) parts.push(`Location: ${client.location}`);

  if (servicesRes.rows.length > 0) {
    parts.push("\n## Services");
    for (const s of servicesRes.rows) {
      parts.push(`- [${s.tier?.toUpperCase() || "PRIMARY"}] ${s.service_name} (${s.category}): ${s.description || ""}`);
    }
  }

  if (guidelinesRes.rows[0]) {
    const g = guidelinesRes.rows[0];
    parts.push("\n## Brand Guidelines");
    if (g.brand_voice) parts.push(`Brand Voice: ${g.brand_voice}`);
    if (g.tone) parts.push(`Tone: ${g.tone}`);
    if (g.unique_selling_points) parts.push(`USPs: ${g.unique_selling_points}`);
    if (g.target_audience_summary) parts.push(`Target Audience: ${g.target_audience_summary}`);
    if (g.focus_topics) parts.push(`Focus Topics: ${g.focus_topics}`);
    if (g.seo_keywords) parts.push(`SEO Keywords: ${g.seo_keywords}`);
    if (g.content_themes) parts.push(`Content Themes: ${g.content_themes}`);
  }

  if (personasRes.rows.length > 0) {
    parts.push("\n## Buyer Personas");
    for (const p of personasRes.rows) {
      parts.push(`### ${p.persona_name}`);
      if (p.pain_points) parts.push(`Pain Points: ${p.pain_points}`);
      if (p.needs_description) parts.push(`Needs: ${p.needs_description}`);
      if (p.buying_factors) parts.push(`Buying Factors: ${p.buying_factors}`);
    }
  }

  if (diffRes.rows.length > 0) {
    parts.push("\n## Differentiators");
    for (const d of diffRes.rows) {
      parts.push(`- ${d.title} (${d.category}): ${d.description}`);
    }
  }

  if (competitorsRes.rows.length > 0) {
    parts.push("\n## Competitors");
    for (const c of competitorsRes.rows) {
      parts.push(`- ${c.company_name}${c.url ? ` (${c.url})` : ""}${c.usps ? `: ${c.usps}` : ""}`);
    }
  }

  if (storyRes.rows[0]) {
    parts.push("\n## Brand Story Highlights");
    const s = storyRes.rows[0];
    if (s.hero_section?.content) parts.push(`Customer: ${s.hero_section.content.substring(0, 300)}`);
    if (s.problem_section?.content) parts.push(`Problem: ${s.problem_section.content.substring(0, 300)}`);
    if (s.guide_section?.content) parts.push(`Authority: ${s.guide_section.content.substring(0, 300)}`);
  }

  return parts.join("\n");
}

async function callClaude(system: string, prompt: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  return text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
}

// ── Content Pillars ──────────────────────────────────────

export async function generateContentPillars(clientId: number): Promise<Record<string, unknown>> {
  const context = await gatherStrategyContext(clientId);

  const result = await callClaude(
    "You are a content strategist. Return ONLY valid JSON.",
    `Based on this business profile, create a content pillar strategy.

Return JSON with this structure:
{
  "pillars": [
    {
      "name": "Pillar name (e.g., 'Hormone Health & Balance')",
      "description": "Why this pillar matters for this business",
      "targetPersona": "Which buyer persona this primarily serves",
      "topics": [
        {
          "title": "Blog/content topic title",
          "type": "blog|video|social|email|guide",
          "targetKeyword": "primary keyword to target",
          "searchIntent": "informational|commercial|transactional",
          "priority": "high|medium|low",
          "brief": "2-3 sentence content brief"
        }
      ]
    }
  ]
}

Create 4-5 pillars with 8-12 topics each. Be specific to THIS business — use their actual services, location, and differentiators. Topics should be realistic content pieces their team would create.

BUSINESS PROFILE:
${context}`
  );

  const pillars = JSON.parse(result);

  await query(
    `INSERT INTO cm_strategy (client_id, content_pillars, generated_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (client_id) DO UPDATE SET content_pillars = $2, generated_at = NOW(), updated_at = NOW()`,
    [clientId, JSON.stringify(pillars)]
  );

  return pillars;
}

// ── Customer Journey Map ─────────────────────────────────

export async function generateCustomerJourney(clientId: number): Promise<Record<string, unknown>> {
  const context = await gatherStrategyContext(clientId);

  const result = await callClaude(
    "You are a customer experience strategist. Return ONLY valid JSON.",
    `Based on this business profile, map the complete customer journey.

Return JSON with this structure:
{
  "stages": [
    {
      "name": "Awareness|Consideration|Decision|Onboarding|Retention|Advocacy",
      "customerMindset": "What the customer is thinking/feeling at this stage",
      "questions": ["Questions they're asking"],
      "touchpoints": [
        {
          "channel": "Google Search|Social Media|Website|Email|Phone|In-Person|Review Sites",
          "action": "What happens at this touchpoint",
          "content": "What content/messaging they need",
          "gap": "What's missing or could be improved (null if good)"
        }
      ],
      "kpis": ["How to measure success at this stage"],
      "opportunities": ["Specific improvements for this business"]
    }
  ]
}

Be specific to THIS business. Reference their actual services, location, and customer types. Identify real gaps based on their current marketing setup.

BUSINESS PROFILE:
${context}`
  );

  const journey = JSON.parse(result);

  await query(
    `INSERT INTO cm_strategy (client_id, customer_journey, generated_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (client_id) DO UPDATE SET customer_journey = $2, updated_at = NOW()`,
    [clientId, JSON.stringify(journey)]
  );

  return journey;
}

// ── 12-Month Content Plan ────────────────────────────────

export async function generateContentPlan(clientId: number): Promise<Record<string, unknown>> {
  const context = await gatherStrategyContext(clientId);

  // Also load content pillars if they exist
  const stratRes = await query("SELECT content_pillars FROM cm_strategy WHERE client_id = $1", [clientId]);
  const pillars = stratRes.rows[0]?.content_pillars;

  const result = await callClaude(
    "You are a marketing director creating an annual content plan. Return ONLY valid JSON.",
    `Based on this business profile${pillars ? " and existing content pillars" : ""}, create a 12-month content plan.

Return JSON with this structure:
{
  "quarters": [
    {
      "quarter": "Q1",
      "theme": "Quarterly theme (e.g., 'New Year Wellness Reset')",
      "goals": ["2-3 measurable goals for this quarter"],
      "months": [
        {
          "month": "January",
          "focus": "Monthly focus area",
          "content": [
            {
              "title": "Content piece title",
              "type": "blog|social_series|email_sequence|video|guide|landing_page|gbp_post",
              "channel": "Website|Instagram|Facebook|Email|Google Business|YouTube",
              "pillar": "Which content pillar this belongs to",
              "brief": "1-2 sentence description",
              "cta": "Primary call to action"
            }
          ],
          "campaigns": [
            {
              "name": "Campaign name (e.g., 'January Detox Special')",
              "type": "promotion|awareness|educational|seasonal",
              "channels": ["channels to run on"],
              "budget": "suggested budget range"
            }
          ]
        }
      ]
    }
  ],
  "annualKPIs": {
    "organicTraffic": "Target growth %",
    "newPatients": "Target monthly average",
    "reviewVelocity": "Target reviews per month",
    "socialGrowth": "Target follower growth %",
    "emailList": "Target list size"
  }
}

Be specific. Use their actual services, seasonal patterns, and location. Each month should have 4-6 content pieces across channels. Include seasonal and holiday tie-ins relevant to their industry.

BUSINESS PROFILE:
${context}
${pillars ? `\nCONTENT PILLARS:\n${JSON.stringify(pillars, null, 2)}` : ""}`
  );

  const plan = JSON.parse(result);

  await query(
    `INSERT INTO cm_strategy (client_id, content_plan_12mo, generated_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (client_id) DO UPDATE SET content_plan_12mo = $2, updated_at = NOW()`,
    [clientId, JSON.stringify(plan)]
  );

  return plan;
}

// ── 90-Day Sprint Plan ───────────────────────────────────

export async function generateSprintPlan(clientId: number): Promise<Record<string, unknown>> {
  const context = await gatherStrategyContext(clientId);

  const result = await callClaude(
    "You are a marketing project manager creating an implementation sprint. Return ONLY valid JSON.",
    `Based on this business profile, create a 90-day implementation sprint plan. This is the first 3 months of working with this client — what gets done, week by week.

Return JSON with this structure:
{
  "weeks": [
    {
      "week": 1,
      "phase": "Foundation|Launch|Optimization|Growth",
      "theme": "Week focus (e.g., 'Audit & Quick Wins')",
      "tasks": [
        {
          "task": "Specific deliverable or action",
          "owner": "agency|client|both",
          "category": "seo|content|social|ads|website|reputation|strategy",
          "priority": "critical|high|medium",
          "deliverable": "What gets delivered/completed"
        }
      ]
    }
  ],
  "milestones": [
    {
      "week": 2,
      "milestone": "Description of milestone",
      "metric": "How to verify it's complete"
    }
  ]
}

Be actionable and specific. Week 1-2 should be audits and quick wins. Week 3-4 should be foundation work. Month 2 should be launches. Month 3 should be optimization. Reference their actual services and current state.

BUSINESS PROFILE:
${context}`
  );

  const sprint = JSON.parse(result);

  await query(
    `INSERT INTO cm_strategy (client_id, sprint_plan_90day, generated_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (client_id) DO UPDATE SET sprint_plan_90day = $2, updated_at = NOW()`,
    [clientId, JSON.stringify(sprint)]
  );

  return sprint;
}
