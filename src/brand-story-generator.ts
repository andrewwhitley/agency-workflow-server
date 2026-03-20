/**
 * ═══════════════════════════════════════════════════════════════
 *  Brand Story Generator
 *  AI-powered brand story generation using Brand Story framework.
 *  Generates 12 sections covering brand story, identity, messaging,
 *  and strategy — batched into 2 API calls for efficiency.
 * ═══════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import { query } from "./database.js";

const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-5-20250929";

// ── Section Definitions ─────────────────────────────────────

export const BRAND_STORY_SECTIONS = [
  { key: "heroSection", title: "Your Customer", framework: "Brand Story" },
  { key: "problemSection", title: "The Problem You Solve", framework: "Brand Story" },
  { key: "guideSection", title: "Why You (Your Authority)", framework: "Brand Story" },
  { key: "planSection", title: "Your Process", framework: "Brand Story" },
  { key: "ctaSection", title: "Calls to Action", framework: "Brand Story" },
  { key: "successSection", title: "The Transformation", framework: "Brand Story" },
  { key: "failureSection", title: "What's at Stake", framework: "Brand Story" },
  { key: "brandVoiceSection", title: "Brand Voice & Personality", framework: "Brand Identity" },
  { key: "visualIdentitySection", title: "Visual Identity", framework: "Brand Identity" },
  { key: "contentStrategySection", title: "Content Strategy", framework: "Thought Leadership" },
  { key: "messagingSection", title: "Core Messaging", framework: "Messaging" },
  { key: "implementationSection", title: "Implementation Roadmap", framework: "Strategy" },
] as const;

type SectionKey = (typeof BRAND_STORY_SECTIONS)[number]["key"];

// ── Section Instructions ────────────────────────────────────

const SECTION_INSTRUCTIONS: Record<SectionKey, string> = {
  heroSection:
    "Describe the ideal customer in vivid detail — who they are (demographics, psychographics, lifestyle), what they want (the one clear desire), how they describe their situation in their own words, and their identity (how they see themselves). Write this so anyone on the marketing team immediately understands who they're talking to.",

  problemSection:
    "Define all four layers of the problem:\n- The Root Cause: The underlying force, system, or condition causing the problem (not a person)\n- External Problem: The tangible, surface-level issue\n- Internal Problem: How it makes them FEEL (frustration, confusion, embarrassment)\n- Philosophical Problem: Why this situation is just WRONG — the \"should\" statement\nThis is the most important section. The root cause creates empathy. The internal problem drives action.",

  guideSection:
    "Show how the brand demonstrates:\n- Empathy: \"We understand what you're going through because...\" — specific empathy statements\n- Authority: Proof the brand can solve the problem — credentials, experience, results, testimonials, awards, number of customers served\nWrite 3-5 empathy statements and 3-5 authority proof points.",

  planSection:
    "Define:\n- The Process Plan: A clear 3-step process that makes working with the brand feel simple and safe\n- The Agreement Plan: Risk reversal elements — guarantees, promises, what the brand commits to\nName each step with a clear action verb. Make it feel effortless.",

  ctaSection:
    "Define:\n- Direct CTA: The primary action (e.g., \"Schedule Your Free Consultation\")\n- Transitional CTA: A softer entry point for people not ready to commit (e.g., \"Download Our Free Guide\")\nInclude 3-5 variations of each with context for when to use them.",

  successSection:
    "Paint a vivid picture of life AFTER working with this brand:\n- What does the customer's life look like? (specific, measurable outcomes)\n- How do they FEEL? (emotional transformation)\n- What can they now do that they couldn't before?\n- What do others notice about them?\nInclude a before/after contrast. Make the transformation feel real and desirable.",

  failureSection:
    "Define what's at risk if the customer doesn't act:\n- What gets worse over time?\n- What opportunities are they missing?\n- What's the emotional cost of inaction?\n- What's the financial/practical cost?\nBe honest but not fear-mongering. The goal is to create appropriate urgency.",

  brandVoiceSection:
    "Define the brand's personality and communication style:\n- Voice characteristics (3-5 adjectives that define how the brand sounds)\n- Tone guidelines for different contexts (social media, website, ads, email)\n- Language dos and don'ts (words to use, words to avoid)\n- Sample phrases that capture the brand voice\n- How the brand would introduce itself at a networking event",

  visualIdentitySection:
    "Define the visual brand guidelines:\n- Color palette recommendations (with reasoning for each color choice)\n- Typography suggestions (heading and body fonts that match the brand personality)\n- Photography/imagery style (what kinds of images represent the brand)\n- Logo usage guidelines\n- Overall visual mood (modern, classic, warm, clinical, etc.)",

  contentStrategySection:
    "Define the content approach based on thought leadership principles:\n- Top 10 questions customers ask (and the brand should answer publicly)\n- Content pillars (3-5 core topics the brand should own)\n- Content types that work best for this business (blog, video, social, email)\n- Pricing/cost transparency approach\n- Comparison content strategy (how to honestly compare with alternatives)\n- Content calendar themes by quarter",

  messagingSection:
    "Create ready-to-use messaging:\n- One-liner: A single sentence that explains what the brand does (problem, solution, result)\n- Elevator pitch: 30-second version\n- Tagline options: 3-5 tagline variations\n- Email subject line templates\n- Social media bio variations\n- Key phrases and talking points for sales conversations",

  implementationSection:
    "Create a 90-day implementation roadmap:\n- Week 1-2: Quick wins (immediate changes to website, social profiles, email signatures)\n- Week 3-4: Foundation (update all marketing materials with new messaging)\n- Month 2: Content launch (begin publishing thought leadership content)\n- Month 3: Optimization (review what's working, refine messaging)\nInclude specific, actionable tasks for each phase.",
};

// ── Intake Field Labels ─────────────────────────────────────

const INTAKE_FIELD_LABELS: Record<string, string> = {
  companyName: "Company Name",
  industry: "Industry",
  foundingStory: "Founding Story",
  businessGoals: "Business Goals",
  biggestChallenges: "Biggest Challenges",
  whatSuccessLooksLike: "What Success Looks Like",
  teamMembers: "Team Members",
  primaryServices: "Primary Services",
  mostProfitableService: "Most Profitable Service",
  mostRequestedService: "Most Requested Service",
  averageServicePrice: "Average Service Price",
  serviceSeasonality: "Service Seasonality",
  currentMarketingEfforts: "Current Marketing Efforts",
  whatsWorking: "What's Working",
  whatsNotWorking: "What's Not Working",
  brandPersonality: "Brand Personality",
  brandTone: "Brand Tone",
  brandColors: "Brand Colors",
  brandFonts: "Brand Fonts",
  logoDescription: "Logo Description",
  visualStyle: "Visual Style",
  dosAndDonts: "Dos and Don'ts",
  idealCustomerDescription: "Ideal Customer Description",
  customerAge: "Customer Age Range",
  customerGender: "Customer Gender",
  customerIncome: "Customer Income Level",
  customerLocation: "Customer Location",
  customerFrustrations: "Customer Frustrations",
  customerDesires: "Customer Desires",
  customerFeelsBefore: "How Customers Feel Before",
  customerFeelsAfter: "How Customers Feel After",
  biggestFrustration: "Biggest Customer Frustration (Root Cause)",
  practicalProblem: "Practical Day-to-Day Problem",
  emotionalProblem: "Emotional Impact of Problem",
  whyItMatters: "Why This Problem Matters Deeply",
  howYouHelp: "How You Help Solve It",
  whyTrustYou: "Why Customers Should Trust You",
  threeStepProcess: "Your 3-Step Process",
  directCTA: "Primary Call to Action",
  transitionalCTA: "Secondary/Softer Call to Action",
  successStory: "Customer Success Story",
  whatHappensIfTheyDontAct: "What Happens If They Don't Act",
  guarantees: "Guarantees & Risk Reversal",
  topQuestionsCustomersAsk: "Top Questions Customers Ask",
  willingToDiscussPricing: "Willing to Discuss Pricing Openly",
  willingToCompare: "Willing to Compare with Competitors",
  willingToAddressProblems: "Willing to Address Industry Problems",
  contentTopicsExcited: "Content Topics Excited About",
  expertiseAreas: "Areas of Expertise",
  preferredContentFormats: "Preferred Content Formats",
  testimonial1: "Testimonial 1",
  testimonial1Author: "Testimonial 1 Author",
  testimonial2: "Testimonial 2",
  testimonial2Author: "Testimonial 2 Author",
  testimonial3: "Testimonial 3",
  testimonial3Author: "Testimonial 3 Author",
};

// ── Column Mapping ──────────────────────────────────────────

const SECTION_KEY_TO_COLUMN: Record<SectionKey, string> = {
  heroSection: "hero_section",
  problemSection: "problem_section",
  guideSection: "guide_section",
  planSection: "plan_section",
  ctaSection: "cta_section",
  successSection: "success_section",
  failureSection: "failure_section",
  brandVoiceSection: "brand_voice_section",
  visualIdentitySection: "visual_identity_section",
  contentStrategySection: "content_strategy_section",
  messagingSection: "messaging_section",
  implementationSection: "implementation_section",
};

// ── Batch Definitions ───────────────────────────────────────

const BATCH_1_KEYS: SectionKey[] = [
  "heroSection",
  "problemSection",
  "guideSection",
  "planSection",
  "ctaSection",
  "successSection",
];

const BATCH_2_KEYS: SectionKey[] = [
  "failureSection",
  "brandVoiceSection",
  "visualIdentitySection",
  "contentStrategySection",
  "messagingSection",
  "implementationSection",
];

// ── System Prompts ──────────────────────────────────────────

const GENERATION_SYSTEM_PROMPT = `You are a world-class brand strategist who creates brand stories and content strategies for businesses. You produce brand stories that are specific, actionable, and emotionally resonant — never generic or templated.

Your output should be in markdown format with clear headers (###), bullet points, and **bold text** for emphasis. Write as if you're creating a professional document that will be used daily by a marketing team.

CRITICAL RULES:
- Be specific to THIS business. Use their actual company name, services, location, and customer details throughout.
- NEVER use placeholder text like "[Company Name]" or "[Service]" — always use the real information.
- If some information is missing, make intelligent inferences based on the industry, location, and business type. Write confidently.
- Each section should be rich and detailed (200-400 words).
- Write in a professional but accessible tone.`;

const RESEARCH_SYSTEM_PROMPT = `You are a business research analyst. Given a company name, website, and industry, provide a comprehensive profile based on your knowledge. Be specific and detailed. If you don't have specific information about this exact company, make reasonable inferences based on the industry, location, and business type. Always write as if you're confident in the information — this will be used to generate marketing materials.`;

// ── Helpers ─────────────────────────────────────────────────

interface ClientData {
  client: Record<string, unknown> | null;
  guidelines: Record<string, unknown> | null;
  competitors: Record<string, unknown>[];
  personas: Record<string, unknown>[];
  differentiators: Record<string, unknown>[];
  intakeData: Record<string, unknown> | null;
}

async function gatherClientData(clientId: number): Promise<ClientData> {
  const [clientRes, guidelinesRes, competitorsRes, personasRes, diffRes, storyRes] =
    await Promise.all([
      query(
        `SELECT company_name, industry, company_website, location, year_founded, number_of_employees
         FROM cm_clients WHERE id = $1`,
        [clientId]
      ),
      query(
        `SELECT tone, brand_voice, dos_and_donts, unique_selling_points, guarantees,
                competitive_advantages, brand_colors, target_audience_summary, demographics,
                psychographics, focus_topics, messaging_priorities, featured_testimonials
         FROM cm_content_guidelines WHERE client_id = $1`,
        [clientId]
      ),
      query(
        `SELECT company_name, url, usps, description
         FROM cm_competitors WHERE client_id = $1`,
        [clientId]
      ),
      query(
        `SELECT persona_name, description, pain_points, gains, buying_factors, needs_description
         FROM cm_buyer_personas WHERE client_id = $1`,
        [clientId]
      ),
      query(
        `SELECT category, title, description
         FROM cm_differentiators WHERE client_id = $1`,
        [clientId]
      ),
      query(
        `SELECT intake_data FROM cm_brand_story WHERE client_id = $1`,
        [clientId]
      ),
    ]);

  return {
    client: clientRes.rows[0] ?? null,
    guidelines: guidelinesRes.rows[0] ?? null,
    competitors: competitorsRes.rows,
    personas: personasRes.rows,
    differentiators: diffRes.rows,
    intakeData: storyRes.rows[0]?.intake_data ?? null,
  };
}

function isDataSparse(data: ClientData): boolean {
  const hasGuidelines = !!data.guidelines?.tone;
  const hasCompetitors = data.competitors.length > 0;
  const hasPersonas = data.personas.length > 0;
  const intakeFieldCount = data.intakeData ? Object.keys(data.intakeData).filter((k) => {
    const v = (data.intakeData as Record<string, unknown>)[k];
    return v !== null && v !== undefined && v !== "";
  }).length : 0;

  // Sparse if missing guidelines tone, no competitors, no personas, and fewer than 5 intake fields
  return !hasGuidelines && !hasCompetitors && !hasPersonas && intakeFieldCount < 5;
}

function buildContextBlock(data: ClientData): string {
  const parts: string[] = [];

  // Company info
  if (data.client) {
    const c = data.client;
    parts.push("## Company Information");
    if (c.company_name) parts.push(`- **Company Name**: ${c.company_name}`);
    if (c.industry) parts.push(`- **Industry**: ${c.industry}`);
    if (c.company_website) parts.push(`- **Website**: ${c.company_website}`);
    if (c.location) parts.push(`- **Location**: ${c.location}`);
    if (c.year_founded) parts.push(`- **Year Founded**: ${c.year_founded}`);
    if (c.number_of_employees) parts.push(`- **Employees**: ${c.number_of_employees}`);
  }

  // Content guidelines
  if (data.guidelines) {
    const g = data.guidelines;
    parts.push("\n## Brand & Content Guidelines");
    if (g.tone) parts.push(`- **Tone**: ${g.tone}`);
    if (g.brand_voice) parts.push(`- **Brand Voice**: ${g.brand_voice}`);
    if (g.dos_and_donts) parts.push(`- **Dos and Don'ts**: ${g.dos_and_donts}`);
    if (g.unique_selling_points) parts.push(`- **USPs**: ${g.unique_selling_points}`);
    if (g.guarantees) parts.push(`- **Guarantees**: ${g.guarantees}`);
    if (g.competitive_advantages) parts.push(`- **Competitive Advantages**: ${g.competitive_advantages}`);
    if (g.brand_colors) parts.push(`- **Brand Colors**: ${g.brand_colors}`);
    if (g.target_audience_summary) parts.push(`- **Target Audience**: ${g.target_audience_summary}`);
    if (g.demographics) parts.push(`- **Demographics**: ${g.demographics}`);
    if (g.psychographics) parts.push(`- **Psychographics**: ${g.psychographics}`);
    if (g.focus_topics) parts.push(`- **Focus Topics**: ${g.focus_topics}`);
    if (g.messaging_priorities) parts.push(`- **Messaging Priorities**: ${g.messaging_priorities}`);
    if (g.featured_testimonials) parts.push(`- **Testimonials**: ${g.featured_testimonials}`);
  }

  // Competitors
  if (data.competitors.length > 0) {
    parts.push("\n## Competitors");
    for (const comp of data.competitors) {
      parts.push(`- **${comp.company_name}**${comp.url ? ` (${comp.url})` : ""}`);
      if (comp.usps) parts.push(`  - USPs: ${comp.usps}`);
      if (comp.description) parts.push(`  - ${comp.description}`);
    }
  }

  // Buyer personas
  if (data.personas.length > 0) {
    parts.push("\n## Buyer Personas");
    for (const p of data.personas) {
      parts.push(`### ${p.persona_name}`);
      if (p.description) parts.push(`${p.description}`);
      if (p.pain_points) parts.push(`- **Pain Points**: ${p.pain_points}`);
      if (p.gains) parts.push(`- **Gains**: ${p.gains}`);
      if (p.buying_factors) parts.push(`- **Buying Factors**: ${p.buying_factors}`);
      if (p.needs_description) parts.push(`- **Goals/Desires**: ${p.needs_description}`);
    }
  }

  // Differentiators
  if (data.differentiators.length > 0) {
    parts.push("\n## Differentiators");
    for (const d of data.differentiators) {
      parts.push(`- **${d.title}** (${d.category}): ${d.description}`);
    }
  }

  // Intake data
  if (data.intakeData && typeof data.intakeData === "object") {
    const intake = data.intakeData as Record<string, unknown>;
    const filledFields = Object.entries(intake).filter(
      ([, v]) => v !== null && v !== undefined && v !== ""
    );
    if (filledFields.length > 0) {
      parts.push("\n## Client Intake / Onboarding Responses");
      for (const [key, value] of filledFields) {
        const label = INTAKE_FIELD_LABELS[key] || key;
        parts.push(`- **${label}**: ${value}`);
      }
    }
  }

  return parts.join("\n");
}

function buildBatchPrompt(
  sectionKeys: SectionKey[],
  context: string,
  priorSections?: Record<string, string>
): string {
  let prompt = `Here is everything we know about this business:\n\n${context}\n\n`;

  if (priorSections && Object.keys(priorSections).length > 0) {
    prompt += "Here are the brand story sections already generated (use these for consistency):\n\n";
    for (const [key, content] of Object.entries(priorSections)) {
      const def = BRAND_STORY_SECTIONS.find((s) => s.key === key);
      if (def) {
        prompt += `### ${def.title}\n${content}\n\n`;
      }
    }
  }

  prompt += "Now generate the following sections. Use the exact markers shown to separate each section.\n\n";

  for (const key of sectionKeys) {
    const def = BRAND_STORY_SECTIONS.find((s) => s.key === key)!;
    const instruction = SECTION_INSTRUCTIONS[key];
    prompt += `===SECTION:${key}===\n**${def.title}** (${def.framework})\n${instruction}\n\n`;
  }

  prompt += "Remember: Use ===SECTION:sectionKeyName=== markers before each section in your response.";
  return prompt;
}

function parseBatchResponse(text: string, sectionKeys: SectionKey[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (let i = 0; i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    const marker = `===SECTION:${key}===`;
    const startIdx = text.indexOf(marker);
    if (startIdx === -1) continue;

    const contentStart = startIdx + marker.length;

    // Find the next section marker or end of text
    let endIdx = text.length;
    for (let j = i + 1; j < sectionKeys.length; j++) {
      const nextMarker = `===SECTION:${sectionKeys[j]}===`;
      const nextIdx = text.indexOf(nextMarker, contentStart);
      if (nextIdx !== -1) {
        endIdx = nextIdx;
        break;
      }
    }

    result[key] = text.slice(contentStart, endIdx).trim();
  }

  return result;
}

async function callClaudeWithRetry(
  systemPrompt: string,
  userPrompt: string,
  maxRetries = 2
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock?.text ?? "";
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function runResearchStep(data: ClientData): Promise<string> {
  const companyName = (data.client?.company_name as string) ?? "Unknown Company";
  const website = (data.client?.company_website as string) ?? "";
  const industry = (data.client?.industry as string) ?? "";
  const location = (data.client?.location as string) ?? "";

  const prompt = `Research and provide a comprehensive business profile for:

**Company**: ${companyName}
**Website**: ${website}
**Industry**: ${industry}
**Location**: ${location}

Please provide detailed information covering:
1. What the company does and its core services/products
2. Target audience and ideal customer profile
3. Key differentiators and competitive advantages
4. Industry context and market positioning
5. Likely customer pain points and desires
6. Brand personality inferences based on the industry and type of business

Be thorough and specific. This profile will be used to generate comprehensive marketing materials.`;

  return callClaudeWithRetry(RESEARCH_SYSTEM_PROMPT, prompt);
}

function buildFullStoryMarkdown(sections: Record<string, string>): string {
  const parts: string[] = ["# Brand Story\n"];

  for (const def of BRAND_STORY_SECTIONS) {
    const content = sections[def.key];
    if (content) {
      parts.push(`## ${def.title}\n*${def.framework}*\n\n${content}\n`);
    }
  }

  return parts.join("\n");
}

// ── Main Functions ──────────────────────────────────────────

export async function generateBrandStory(
  clientId: number
): Promise<{ success: boolean }> {
  // 1. Gather all client data
  const data = await gatherClientData(clientId);

  if (!data.client) {
    throw new Error(`Client ${clientId} not found`);
  }

  let context = buildContextBlock(data);

  // 2. If data is sparse, run research step first
  if (isDataSparse(data)) {
    console.log(`[brand-story] Data sparse for client ${clientId}, running research step...`);
    const research = await runResearchStep(data);
    context += `\n\n## Research Analysis\n${research}`;
  }

  // 3. Generate batch 1 (core Brand Story sections)
  console.log(`[brand-story] Generating batch 1 for client ${clientId}...`);
  const batch1Prompt = buildBatchPrompt(BATCH_1_KEYS, context);
  const batch1Response = await callClaudeWithRetry(GENERATION_SYSTEM_PROMPT, batch1Prompt);
  const batch1Sections = parseBatchResponse(batch1Response, BATCH_1_KEYS);

  // 4. Generate batch 2 (identity + strategy), including batch 1 content for consistency
  console.log(`[brand-story] Generating batch 2 for client ${clientId}...`);
  const batch2Prompt = buildBatchPrompt(BATCH_2_KEYS, context, batch1Sections);
  const batch2Response = await callClaudeWithRetry(GENERATION_SYSTEM_PROMPT, batch2Prompt);
  const batch2Sections = parseBatchResponse(batch2Response, BATCH_2_KEYS);

  // 5. Merge all sections
  const allSections: Record<string, string> = { ...batch1Sections, ...batch2Sections };

  // 6. Build full markdown
  const fullStory = buildFullStoryMarkdown(allSections);

  // 7. Upsert to cm_brand_story
  const sectionColumns = BRAND_STORY_SECTIONS.map((s) => SECTION_KEY_TO_COLUMN[s.key]);
  const sectionValues = BRAND_STORY_SECTIONS.map((s) => {
    const content = allSections[s.key] ?? null;
    return content ? JSON.stringify({ content, generated: true, edited: false }) : null;
  });

  const columnList = sectionColumns.join(", ");
  const placeholders = sectionColumns.map((_, i) => `$${i + 2}`).join(", ");
  const updateClauses = sectionColumns.map((col, i) => `${col} = $${i + 2}`).join(", ");

  const paramIndex = sectionColumns.length + 2;
  const allParams = [
    clientId,
    ...sectionValues,
    fullStory,
    "generated",
  ];

  await query(
    `INSERT INTO cm_brand_story (client_id, ${columnList}, full_brand_story, status, generated_at)
     VALUES ($1, ${placeholders}, $${paramIndex}, $${paramIndex + 1}, NOW())
     ON CONFLICT (client_id) DO UPDATE SET
       ${updateClauses},
       full_brand_story = $${paramIndex},
       status = $${paramIndex + 1},
       generated_at = NOW()`,
    allParams
  );

  console.log(`[brand-story] Successfully generated brand story for client ${clientId}`);
  return { success: true };
}

export async function regenerateBrandStorySection(
  clientId: number,
  sectionKey: string,
  additionalContext?: string
): Promise<{ success: boolean; section: any }> {
  const validKey = BRAND_STORY_SECTIONS.find((s) => s.key === sectionKey);
  if (!validKey) {
    throw new Error(`Invalid section key: ${sectionKey}`);
  }

  const typedKey = sectionKey as SectionKey;

  // 1. Gather client data + existing sections
  const data = await gatherClientData(clientId);
  if (!data.client) {
    throw new Error(`Client ${clientId} not found`);
  }

  const context = buildContextBlock(data);

  // 2. Load existing sections for consistency
  const sectionColumns = BRAND_STORY_SECTIONS.map((s) => SECTION_KEY_TO_COLUMN[s.key]).join(", ");
  const existing = await query(
    `SELECT ${sectionColumns} FROM cm_brand_story WHERE client_id = $1`,
    [clientId]
  );

  const existingSections: Record<string, string> = {};
  if (existing.rows[0]) {
    for (const def of BRAND_STORY_SECTIONS) {
      if (def.key === sectionKey) continue;
      const col = SECTION_KEY_TO_COLUMN[def.key];
      const val = existing.rows[0][col];
      if (val?.content) {
        existingSections[def.key] = val.content;
      }
    }
  }

  // 3. Build single-section prompt
  let prompt = `Here is everything we know about this business:\n\n${context}\n\n`;

  if (Object.keys(existingSections).length > 0) {
    prompt += "Here are the other brand story sections (use these for consistency):\n\n";
    for (const [key, content] of Object.entries(existingSections)) {
      const def = BRAND_STORY_SECTIONS.find((s) => s.key === key);
      if (def) {
        prompt += `### ${def.title}\n${content}\n\n`;
      }
    }
  }

  if (additionalContext) {
    prompt += `\n**Additional context/instructions for this section**: ${additionalContext}\n\n`;
  }

  prompt += `Now regenerate ONLY the following section:\n\n`;
  prompt += `**${validKey.title}** (${validKey.framework})\n${SECTION_INSTRUCTIONS[typedKey]}\n\n`;
  prompt += `Write the section content directly — no markers needed.`;

  // 4. Generate
  const response = await callClaudeWithRetry(GENERATION_SYSTEM_PROMPT, prompt);
  const content = response.trim();

  // 5. Update the single section column
  const column = SECTION_KEY_TO_COLUMN[typedKey];
  const sectionData = JSON.stringify({ content, generated: true, edited: false });

  await query(
    `UPDATE cm_brand_story
     SET ${column} = $2, last_edited_at = NOW()
     WHERE client_id = $1`,
    [clientId, sectionData]
  );

  // 6. Rebuild full story markdown
  await rebuildFullStory(clientId);

  const section = { key: sectionKey, title: validKey.title, content, generated: true, edited: false };
  console.log(`[brand-story] Regenerated section "${sectionKey}" for client ${clientId}`);
  return { success: true, section };
}

export async function updateBrandStorySection(
  clientId: number,
  sectionKey: string,
  content: string
): Promise<{ success: boolean }> {
  const validKey = BRAND_STORY_SECTIONS.find((s) => s.key === sectionKey);
  if (!validKey) {
    throw new Error(`Invalid section key: ${sectionKey}`);
  }

  const typedKey = sectionKey as SectionKey;
  const column = SECTION_KEY_TO_COLUMN[typedKey];
  const sectionData = JSON.stringify({ content, generated: false, edited: true });

  await query(
    `UPDATE cm_brand_story
     SET ${column} = $2, last_edited_at = NOW()
     WHERE client_id = $1`,
    [clientId, sectionData]
  );

  // Rebuild full story markdown
  await rebuildFullStory(clientId);

  console.log(`[brand-story] Updated section "${sectionKey}" for client ${clientId}`);
  return { success: true };
}

// ── Internal Helpers ────────────────────────────────────────

async function rebuildFullStory(clientId: number): Promise<void> {
  const sectionColumns = BRAND_STORY_SECTIONS.map((s) => SECTION_KEY_TO_COLUMN[s.key]).join(", ");
  const result = await query(
    `SELECT ${sectionColumns} FROM cm_brand_story WHERE client_id = $1`,
    [clientId]
  );

  if (!result.rows[0]) return;

  const sections: Record<string, string> = {};
  for (const def of BRAND_STORY_SECTIONS) {
    const col = SECTION_KEY_TO_COLUMN[def.key];
    const val = result.rows[0][col];
    if (val?.content) {
      sections[def.key] = val.content;
    }
  }

  const fullStory = buildFullStoryMarkdown(sections);

  await query(
    `UPDATE cm_brand_story SET full_brand_story = $2 WHERE client_id = $1`,
    [clientId, fullStory]
  );
}
