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

// For website fetching in research step
async function fetchWebsiteText(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url.startsWith("http") ? url : `https://${url}`, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BrandStoryBot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return "";
    const html = await res.text();
    // Strip tags, scripts, styles — keep just visible text
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15_000); // Cap at ~15k chars to fit in prompt
  } catch {
    return "";
  }
}

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
  // ─── Endless Customers (Marcus Sheridan) — added 2026-04-09 ───
  { key: "bigFiveSection", title: "The Big 5 Content Topics", framework: "Endless Customers" },
  { key: "tayaQuestionsSection", title: "They Ask, You Answer Questions", framework: "Endless Customers" },
  { key: "endlessCustomersSection", title: "Buyer Trust Framework", framework: "Endless Customers" },
] as const;

type SectionKey = (typeof BRAND_STORY_SECTIONS)[number]["key"];

// ── Section Instructions ────────────────────────────────────

const SECTION_INSTRUCTIONS: Record<SectionKey, string> = {
  heroSection:
    `Describe the ideal customer. This section has two parts:

### The Customer Profile
A rich 1-2 paragraph description: who they are (demographics, psychographics, lifestyle), what they want (the one clear desire), how they describe their situation in their own words, and their identity (how they see themselves). Write this so anyone on the marketing team immediately understands who they're talking to.

### Hero Aspirational Identity
Then list 8-10 bullet points starting with "To..." that capture what this customer aspires to become or experience. These should be emotionally specific and quotable — the kind of lines that could go directly on a website or ad. Example: "To be known, not managed" or "To feel like their investment is finally paying off." Each one should be a complete thought in a single line.`,

  problemSection:
    `Define all four layers of the problem. Use a mix of brief explanatory context and punchy bullet points.

### Root Cause
1-2 sentences on the underlying force, system, or condition causing the problem (not a person).

### External Problems
5-8 bullet points — tangible, surface-level issues. Each one a complete, scannable line. Example: "A system that prioritizes volume over outcomes."

### Internal Problems
5-8 bullet points — how the problem makes them FEEL. Frustration, confusion, embarrassment, loneliness. Example: "An instinct that something's off — even if everything looks fine on paper."

### Philosophical Truths
5-8 standalone quotable lines — why this situation is fundamentally WRONG. These should be bold, conviction-driven statements that could stand alone as ad copy or social media posts. Example: "You deserve expertise that reflects your ambition." or "Settling isn't a strategy — it's surrender."

This is the most important section. The root cause creates empathy. The internal problem drives action. The philosophical truths give the brand a moral backbone.`,

  guideSection:
    `Show how the brand demonstrates empathy and authority. Two clear subsections:

### Empathy
3-5 specific empathy statements that show deep understanding of the customer's world. Start with phrases like "We understand..." or "We've seen..." — statements that make the customer feel truly known. Brief paragraph intro, then bullet points.

### Authority
3-5 authority proof points. Focus on verifiable facts: years of experience, specialization depth, team qualifications, process quality, niche expertise, industry knowledge. Authority comes from demonstrated commitment to the craft and deep understanding of the customer's world — not outcome promises.

Then include a short "Competency Statement" — a 2-3 sentence block that captures the team's story and why they do this work. This should feel human, not corporate.`,

  planSection:
    `Define a clear, simple process that makes working with the brand feel safe and easy.

### The Process (3 Steps)
Format each step as:
**Step 1: [Action Verb + Noun]** — One sentence explaining what happens and why it matters.

Name each step with a clear, confident action verb. The goal is to make the entire engagement feel effortless and inevitable.

### The Agreement
What the brand commits to — risk reversal elements, guarantees, promises about the level of service, attention, and quality the customer will receive. Focus on process commitments (what you WILL do), not outcome promises (what will happen as a result).`,

  ctaSection:
    `Define calls to action — both direct and transitional.

### Direct CTA
The primary action. Write 3-5 variations with context for when to use each (website hero, email, social, conversation). Each should be specific and confident.

### Transitional CTA
A softer entry point for people not ready to commit. Be creative and specific to this business — not just "Download Our Guide" but something that provides genuine value and qualifies interest. Think: quizzes, assessments, checklists, comparison tools, video series. Write 3-5 variations with context.`,

  successSection:
    `Paint the picture of life AFTER working with this brand. Two formats:

### The Transformation (narrative)
1-2 paragraphs describing the qualitative change — what their life, business, or health looks like now. Focus on feeling, confidence, freedom, clarity, and capability. No fabricated numbers.

### Success Statements
8-10 bullet points — each a standalone, emotionally resonant outcome. Example: "The clarity and confidence of knowing exactly where things stand" or "A relationship that finally feels like a partnership." These should be usable directly in marketing materials.

### From → To
5-8 transformation pairs that capture the journey in shorthand. Format: "From [before state] to [after state]." Example: "From overwhelmed to in control" or "From scattered efforts to a clear strategy." These are powerful for ads, social media, and landing pages.`,

  failureSection:
    `Define what's at risk if the customer doesn't act. Two formats:

### The Cost of Inaction (narrative)
2-3 paragraphs describing what happens when nothing changes. Focus on emotional weight, lost momentum, competitive erosion, continued frustration, and wasted effort. Be honest but not fear-mongering. The goal is appropriate urgency through consequence, not scare tactics.

IMPORTANT: Do NOT use specific dollar amounts, revenue projections, or fabricated statistics. Describe consequences qualitatively — lost time, falling behind, continued frustration, wasted resources on approaches that don't work.

### Failure Statements
8-10 bullet points — each a concise, honest consequence of inaction. Example: "Staying stuck in a cycle that was never built for you" or "Losing ground to competitors who invested sooner." Each should be a complete thought in one line.`,

  brandVoiceSection:
    `Define the brand's personality and communication style.

### Voice Characteristics
3-5 adjectives that define how the brand sounds, each with a one-sentence explanation of what it means in practice.

### Tone by Context
Brief guidelines for how tone shifts across channels: website, social media, email, ads, sales conversations, customer support. Not different voices — the same voice at different volumes.

### Language Dos and Don'ts
Two columns. Dos: words, phrases, and approaches to use. Don'ts: words, phrases, and approaches to avoid. Be specific — give actual examples of each.
IMPORTANT: Only recommend using numbers that are verifiable facts (years of experience, team size, geographic reach). Do NOT recommend unverifiable performance claims — these create liability and erode trust.

### Sample Phrases
5-8 phrases that capture the brand voice — ready to use in copy. And a brief "networking introduction" — how the brand would introduce itself in 2-3 sentences at a professional event.`,

  visualIdentitySection:
    `Define the visual brand guidelines:
- Color palette recommendations (with hex codes and reasoning for each color choice)
- Typography suggestions (heading and body fonts that match the brand personality)
- Photography/imagery style (what kinds of images represent the brand)
- Logo usage guidelines
- Overall visual mood (modern, classic, warm, clinical, etc.)`,

  contentStrategySection:
    `Define the content approach based on thought leadership principles:
- Top 10 questions customers ask (and the brand should answer publicly)
- Content pillars (3-5 core topics the brand should own)
- Content types that work best for this business (blog, video, social, email)
- Pricing/cost transparency approach
- Comparison content strategy (how to honestly compare with alternatives)
- Content calendar themes by quarter`,

  messagingSection:
    `Create ready-to-use messaging blocks:

### One-Liner
A single sentence that explains what the brand does: problem → solution → result.

### Elevator Pitch
A 30-second version (3-4 sentences).

### Taglines
3-5 tagline variations — short, punchy, memorable.

### Copy Snippets
Ready-to-use blocks for common needs:
- **Solution statement**: 2-3 sentences describing what the brand offers (not features — the model/approach)
- **Uniqueness statement**: 2-3 sentences on what sets them apart
- **Empathy statement**: 1-2 sentences that show understanding
- **Competency statement**: 2-3 sentences on why they're qualified

### Social & Email
- Social media bio variations (Twitter/X, LinkedIn, Instagram)
- Email subject line templates for different purposes (intro, follow-up, value-add)
- Key phrases for sales conversations

IMPORTANT: No unverifiable performance claims. Messaging should convey expertise and transformation through specificity about the service and understanding of the customer, not promises about outcomes.`,

  implementationSection:
    `Create a 90-day implementation roadmap:
- Week 1-2: Quick wins (immediate changes to website, social profiles, email signatures)
- Week 3-4: Foundation (update all marketing materials with new messaging)
- Month 2: Content launch (begin publishing thought leadership content)
- Month 3: Optimization (review what's working, refine messaging)
Include specific, actionable tasks for each phase.`,

  // ─── Endless Customers / They Ask You Answer (Marcus Sheridan) ───

  bigFiveSection:
    `Generate The Big 5 content topics from Marcus Sheridan's "They Ask, You Answer" framework. These are the 5 categories of content that buyers search for most when making a purchase decision. For each category, generate 5-10 specific article titles tailored to THIS business and their actual services. Be specific and use the client's real services and target customer terminology.

### 1. Cost & Pricing
Articles that address what things cost — even if pricing is variable. Buyers search for cost information constantly; if you don't answer, your competitors will. Generate 5-10 article titles like:
- "How much does [service] cost in [year]? A complete breakdown"
- "[Service] pricing: what affects the cost"
- "Is [service] worth the investment? A cost-benefit analysis"

### 2. Problems & Risks
Articles that honestly discuss the problems, downsides, side effects, or risks of your services or industry. This builds enormous trust because buyers expect you to hide bad news. Generate 5-10 article titles like:
- "Common problems with [service] (and how to avoid them)"
- "When [service] is NOT the right choice"
- "[Service] side effects: what you need to know"

### 3. Comparisons
Articles that compare your service/approach to alternatives, including direct competitors. Buyers do this research anyway — be the source. Generate 5-10 article titles like:
- "[Your service] vs [alternative]: which is right for you?"
- "[Brand] vs [competitor type]: an honest comparison"
- "Comparing [service] options: what to look for"

### 4. Reviews & Best-of Lists
Aggregated, honest reviews. "Best [service] in [city]," "Top providers for [service type]," etc. These also do well in AI search. Generate 5-10 article titles like:
- "Best [service] providers in [client's city/region]"
- "Top [service type] companies reviewed"
- "Reviews of [common product/method]"

### 5. Best of / Best in Class
"Best of" content that positions the buyer as smart for choosing well. Generate 5-10 article titles like:
- "The best [service] for [specific situation]"
- "Best [service] for [target customer type]"
- "What makes the best [service]?"

CRITICAL: Tailor every title to THIS client's specific services and customer base. Avoid generic placeholder titles. Use their real service names. Each topic should be a real article they could write next month.`,

  tayaQuestionsSection:
    `List the most important questions this client's prospects search for and ask, organized by buyer journey stage. Pull from the intake "topQuestionsCustomersAsk" field if available, but expand significantly with industry knowledge.

### Awareness Stage Questions
What questions do prospects ask BEFORE they know they need this service? List 8-12 questions. Example: "Why am I always tired even when I sleep 8 hours?"

### Consideration Stage Questions
What do prospects ask once they know they need help and are evaluating options? List 8-12 questions. Example: "What's the difference between functional medicine and traditional medicine?"

### Decision Stage Questions
What do prospects ask right before they pick a provider? List 8-12 questions. Example: "How long does it take to see results with [service]?" or "Does insurance cover [service]?"

### Post-Purchase / Retention Questions
What do customers ask after they've started? List 5-10 questions. These build loyalty and referrals.

For each question, briefly note the SEARCH INTENT (informational/commercial/transactional) so the content team knows whether to write a blog, comparison, or sales page.

These questions become the foundation for content planning, FAQ pages, sales call objection handling, and AI chat training.`,

  endlessCustomersSection:
    `Define the trust-building strategy from Marcus Sheridan's "Endless Customers" framework. This positions the brand to win in the AI search era where buyers trust brands that are most transparent and helpful.

### Self-Selection Strategy
Help prospects qualify themselves IN or OUT before they ever talk to sales. Be specific:
- Who is the IDEAL fit (3-5 specific characteristics)
- Who is NOT a fit (3-5 specific disqualifiers — be brave about saying no)
- The "honest sales" approach: how to invite the wrong fits to leave gracefully

### Pricing Transparency Plan
Where the brand currently stands on price transparency, and where they should go. Specific recommendations like:
- Add a "Pricing" page with starting points or ranges
- Address pricing in the first sales call openly
- Create a cost calculator or "Investment Guide"

### Video Selling Strategy
Marcus emphasizes that video closes the trust gap fastest. Recommend 5-10 specific videos this brand should create:
- 80% pricing video, About-us videos, Product/service walkthroughs, Bio/team videos, Customer journey videos

### "Insourcing" Content Production
The recommendation: don't outsource content creation entirely. The agency's job is to teach the client's TEAM to create content (especially video) because authenticity wins. Outline how this brand should structure their internal content production.

### Trust Acceleration KPIs
What to measure: pages viewed before sales contact, time on pricing page, video completion rates, sales-cycle length reduction, % of leads that come pre-qualified.

This is the "fractional CMO" play: positioning the agency as a strategic partner that teaches the client's team to be world-class at trust-building, not just a vendor that produces marketing assets.`,
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
  bigFiveSection: "big_five_section",
  tayaQuestionsSection: "taya_questions",
  endlessCustomersSection: "endless_customers_section",
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

const BATCH_3_KEYS: SectionKey[] = [
  "bigFiveSection",
  "tayaQuestionsSection",
  "endlessCustomersSection",
];

// ── System Prompts ──────────────────────────────────────────

const GENERATION_SYSTEM_PROMPT = `You are a world-class brand strategist who creates brand stories and content strategies for businesses. You produce brand stories that are specific, actionable, and emotionally resonant — never generic or templated.

Your output should be in markdown format with clear headers (###), bullet points, and **bold text** for emphasis. Write as if you're creating a professional document that will be used daily by a marketing team.

CRITICAL RULES:
- Be specific to THIS business. Use their actual company name, services, and customer details throughout.
- NEVER use placeholder text like "[Company Name]" or "[Service]" — always use the real information.
- **LOCATION vs SERVICE AREA**: Pay close attention to whether the business is a "local service area" business or not. If the data says "Headquartered in" with a note about not being their target market, do NOT write as if they target that geographic area. Focus on their actual service areas and target customers. Many businesses are based in one place but serve clients nationally or in other regions.
- **LOCAL SERVICE AREA businesses**: When marked as local service area, DO use their location as part of the marketing strategy — local SEO, community presence, and geographic targeting are appropriate.
- Focus on the client's actual PRIMARY services and the specific niche they serve. Do not broaden their target audience to adjacent industries unless the data explicitly supports it.
- **NO UNVERIFIABLE NUMBERS OR PROMISES**: Do NOT invent specific statistics, dollar amounts, percentages, or performance metrics (e.g. "20-40 leads per month", "$800,000-$2,500,000 annually", "triple your bookings", "3X patient inquiries"). Only use numbers that are verifiable facts about the business (years of experience, number of locations, service areas). Avoid specific ROI claims, revenue projections, cost comparisons, or performance guarantees — these are unverifiable and create legal/ethical liability. Instead, describe outcomes qualitatively: "consistent qualified inquiries", "page one visibility", "predictable patient flow". The brand story should inspire confidence through expertise and empathy, not fabricated metrics.
- If some information is missing, make intelligent inferences based on the industry and business type. Write confidently.
- Each section should be rich and detailed (250-500 words). Follow the structural format requested in each section's instructions — use the mix of narrative paragraphs and bullet points as specified.
- Write in a professional but accessible tone.`;

const RESEARCH_SYSTEM_PROMPT = `You are a business research analyst. Given a company name, website, and industry, provide a comprehensive profile based on your knowledge. Be specific and detailed. If you don't have specific information about this exact company, make reasonable inferences based on the industry and business type. Always write as if you're confident in the information — this will be used to generate marketing materials.

IMPORTANT: The business location is where they are headquartered. Unless explicitly stated as a local service area business, do NOT assume they only serve that geographic area. Many businesses serve clients nationally or in specific regions far from their headquarters. Focus your analysis on the industry and customer type, not the geographic location.`;

// ── Helpers ─────────────────────────────────────────────────

interface ClientData {
  client: Record<string, unknown> | null;
  guidelines: Record<string, unknown> | null;
  competitors: Record<string, unknown>[];
  personas: Record<string, unknown>[];
  differentiators: Record<string, unknown>[];
  intakeData: Record<string, unknown> | null;
  services: Record<string, unknown>[];
  serviceAreas: Record<string, unknown>[];
}

async function gatherClientData(clientId: number): Promise<ClientData> {
  const [clientRes, guidelinesRes, competitorsRes, personasRes, diffRes, storyRes, servicesRes, serviceAreasRes] =
    await Promise.all([
      query(
        `SELECT company_name, industry, company_website, location, year_founded, number_of_employees,
                is_local_service_area, business_type, combined_years_experience, business_facts
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
        `SELECT persona_name, pain_points, gains, buying_factors, needs_description
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
      query(
        `SELECT service_name, category, tier, description, description_long, ideal_patient_profile,
                target_conditions, differentiators, expected_outcomes
         FROM cm_services WHERE client_id = $1 AND offered = true ORDER BY tier, sort_order`,
        [clientId]
      ),
      query(
        `SELECT target_cities, target_counties, notes FROM cm_service_areas WHERE client_id = $1`,
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
    services: servicesRes.rows,
    serviceAreas: serviceAreasRes.rows,
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

// ── Confidence scoring ──────────────────────────────────────
// Each section gets a 0-100 score based on what data signals were available
// during generation. Higher score = more grounded in real client data.

function val(x: unknown): boolean {
  if (x === null || x === undefined) return false;
  if (typeof x === "string") return x.trim() !== "";
  if (Array.isArray(x)) return x.length > 0;
  if (typeof x === "object") return Object.keys(x as object).length > 0;
  return true;
}

/**
 * Compute confidence scores per brand story section based on input data quality.
 * Returns map of sectionKey → score (0-100).
 */
export function computeConfidenceScores(data: ClientData): Record<string, number> {
  const scores: Record<string, number> = {};
  const c = data.client || {};
  const g = data.guidelines || {};
  const intake = (data.intakeData as Record<string, unknown>) || {};
  const intakeCount = Object.values(intake).filter(val).length;
  const hasIntakeRichness = intakeCount >= 8;

  // ── heroSection: needs persona + audience data ──
  let hero = 30; // baseline
  if (data.personas.length > 0) hero += 25;
  if (data.personas.length >= 2) hero += 10;
  if (val(g.target_audience_summary) || val(g.demographics) || val(g.psychographics)) hero += 15;
  if (data.personas.some((p) => val(p.pain_points) || val(p.age)) || val(intake.idealCustomerDescription)) hero += 10;
  if (val(intake.customerFrustrations) || val(intake.customerDesires)) hero += 10;
  scores.heroSection = Math.min(100, hero);

  // ── problemSection: needs pain points, frustrations ──
  let problem = 30;
  if (data.personas.some((p) => val(p.pain_points))) problem += 15;
  if (val(intake.customerFrustrations) || val(intake.biggestFrustration)) problem += 15;
  if (val(intake.practicalProblem) || val(intake.emotionalProblem)) problem += 15;
  if (val(intake.whyItMatters)) problem += 10;
  if (data.personas.length > 0 && data.personas.some((p) => val(p.pain_points))) problem += 15;
  scores.problemSection = Math.min(100, problem);

  // ── guideSection: authority + empathy ──
  let guide = 30;
  if (val(c.combined_years_experience)) guide += 15;
  if (val(c.certifications_trainings)) guide += 10;
  if (val(c.awards_recognitions)) guide += 10;
  if (val(c.notable_mentions)) guide += 10;
  if (val(g.unique_selling_points) || val(c.what_makes_us_unique)) guide += 15;
  if (val(c.year_founded)) guide += 10;
  scores.guideSection = Math.min(100, guide);

  // ── planSection: needs services + process info ──
  let plan = 30;
  if (data.services.length > 0) plan += 20;
  if (data.services.some((s) => val(s.description) || val(s.description_long))) plan += 15;
  if (val(intake.threeStepProcess)) plan += 20;
  if (val(g.guarantees) || val(intake.guarantees)) plan += 15;
  scores.planSection = Math.min(100, plan);

  // ── ctaSection: needs CTAs + user action strategy ──
  let cta = 40;
  if (val(intake.directCTA)) cta += 20;
  if (val(intake.transitionalCTA)) cta += 15;
  if (val(g.user_action_strategy) || val(g.preferred_ctas)) cta += 20;
  scores.ctaSection = Math.min(100, cta);

  // ── successSection: needs outcomes ──
  let success = 35;
  if (val(intake.customerFeelsAfter)) success += 20;
  if (val(intake.successStory) || val(g.success_stories)) success += 20;
  if (val(intake.expectedOutcomes) || data.services.some((s) => val(s.expected_outcomes))) success += 15;
  scores.successSection = Math.min(100, success);

  // ── failureSection: needs stakes + concerns ──
  let failure = 40;
  if (val(intake.whatHappensIfTheyDontAct)) failure += 25;
  if (data.personas.some((p) => val(p.pain_points))) failure += 15;
  if (data.services.some((s) => val(s.common_concerns))) failure += 15;
  scores.failureSection = Math.min(100, failure);

  // ── brandVoiceSection: needs voice/tone data ──
  let voice = 25;
  if (val(g.tone)) voice += 20;
  if (val(g.brand_voice)) voice += 20;
  if (val(g.writing_style)) voice += 15;
  if (val(g.dos_and_donts)) voice += 15;
  if (val(intake.brandPersonality) || val(intake.brandTone)) voice += 10;
  scores.brandVoiceSection = Math.min(100, voice);

  // ── visualIdentitySection: needs colors, fonts ──
  let visual = 20;
  if (val(g.brand_colors)) visual += 30;
  if (val(g.fonts) || val(intake.brandFonts)) visual += 20;
  if (val(g.logo_guidelines) || val(intake.logoDescription)) visual += 15;
  if (val(g.design_inspiration)) visual += 15;
  scores.visualIdentitySection = Math.min(100, visual);

  // ── contentStrategySection: needs topics ──
  let content = 35;
  if (val(g.focus_topics)) content += 20;
  if (val(g.content_themes)) content += 15;
  if (val(g.seo_keywords)) content += 15;
  if (val(intake.contentTopicsExcited) || val(intake.expertiseAreas)) content += 15;
  scores.contentStrategySection = Math.min(100, content);

  // ── messagingSection: needs USPs + differentiation ──
  let messaging = 30;
  if (val(g.unique_selling_points) || val(c.what_makes_us_unique)) messaging += 20;
  if (val(g.competitive_advantages)) messaging += 15;
  if (data.competitors.length > 0) messaging += 15;
  if (val(g.messaging_priorities)) messaging += 10;
  if (val(c.slogans_mottos)) messaging += 10;
  scores.messagingSection = Math.min(100, messaging);

  // ── implementationSection: roadmap is mostly generated ──
  scores.implementationSection = hasIntakeRichness ? 75 : 60;

  // ── Endless Customers sections ──
  let big5 = 35;
  if (data.services.length > 0) big5 += 20;
  if (data.competitors.length > 0) big5 += 15;
  if (val(g.focus_topics)) big5 += 15;
  if (val(intake.willingToDiscussPricing)) big5 += 10;
  if (val(intake.willingToCompare)) big5 += 5;
  scores.bigFiveSection = Math.min(100, big5);

  let taya = 35;
  if (val(intake.topQuestionsCustomersAsk)) taya += 30;
  if (data.personas.some((p) => val(p.pain_points)) || val(intake.customerFrustrations)) taya += 15;
  if (val(intake.willingToAddressProblems)) taya += 10;
  if (data.personas.length > 0) taya += 10;
  scores.tayaQuestionsSection = Math.min(100, taya);

  let endless = 40;
  if (val(intake.willingToDiscussPricing)) endless += 15;
  if (val(intake.willingToCompare)) endless += 15;
  if (val(intake.willingToAddressProblems)) endless += 15;
  if (val(g.unique_selling_points)) endless += 15;
  scores.endlessCustomersSection = Math.min(100, endless);

  return scores;
}

function buildContextBlock(data: ClientData): string {
  const parts: string[] = [];

  // Company info
  if (data.client) {
    const c = data.client;
    parts.push("## Company Information");
    if (c.company_name) parts.push(`- **Company Name**: ${c.company_name}`);
    if (c.industry) parts.push(`- **Industry**: ${c.industry}`);
    if (c.business_type) parts.push(`- **Business Type**: ${c.business_type}`);
    if (c.company_website) parts.push(`- **Website**: ${c.company_website}`);
    // Distinguish headquarters location from service area
    if (c.location) {
      if (c.is_local_service_area) {
        parts.push(`- **Location (local service area)**: ${c.location}`);
      } else {
        parts.push(`- **Headquartered in**: ${c.location} (NOTE: This is where the company is based, NOT necessarily their target market. They may serve clients nationally or in other regions.)`);
      }
    }
    if (c.year_founded) parts.push(`- **Year Founded**: ${c.year_founded}`);
    if (c.number_of_employees) parts.push(`- **Employees**: ${c.number_of_employees}`);
    if (c.combined_years_experience) parts.push(`- **Combined Years Experience**: ${c.combined_years_experience}`);
    if (c.business_facts) parts.push(`- **Business Facts**: ${c.business_facts}`);
  }

  // Services
  if (data.services.length > 0) {
    parts.push("\n## Services Offered");
    const byTier: Record<string, Record<string, unknown>[]> = {};
    for (const s of data.services) {
      const tier = (s.tier as string) || "other";
      if (!byTier[tier]) byTier[tier] = [];
      byTier[tier].push(s);
    }
    for (const tier of ["primary", "secondary", "complementary", "other"]) {
      if (!byTier[tier]) continue;
      if (tier !== "other") parts.push(`\n### ${tier.charAt(0).toUpperCase() + tier.slice(1)} Services`);
      for (const s of byTier[tier]) {
        parts.push(`- **${s.service_name}**${s.category ? ` (${s.category})` : ""}`);
        if (s.description) parts.push(`  - ${s.description}`);
        if (s.ideal_patient_profile) parts.push(`  - Ideal client: ${s.ideal_patient_profile}`);
        if (s.target_conditions) parts.push(`  - Target conditions: ${s.target_conditions}`);
        if (s.differentiators) parts.push(`  - Differentiators: ${s.differentiators}`);
        if (s.expected_outcomes) parts.push(`  - Expected outcomes: ${s.expected_outcomes}`);
      }
    }
  }

  // Service areas
  if (data.serviceAreas.length > 0) {
    parts.push("\n## Service Areas");
    for (const sa of data.serviceAreas) {
      if (sa.target_cities) parts.push(`- **Target Cities**: ${sa.target_cities}`);
      if (sa.target_counties) parts.push(`- **Target Counties**: ${sa.target_counties}`);
      if (sa.notes) parts.push(`- **Notes**: ${sa.notes}`);
    }
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
  const isLocal = data.client?.is_local_service_area === true;

  const locationLine = isLocal
    ? `**Location (local service area)**: ${location}`
    : `**Headquartered in**: ${location} (they may serve clients nationally — do NOT assume they only target this area)`;

  const prompt = `Research and provide a comprehensive business profile for:

**Company**: ${companyName}
**Website**: ${website}
**Industry**: ${industry}
${locationLine}

Please provide detailed information covering:
1. What the company does and its core services/products
2. Target audience and ideal customer profile (based on their industry and services, NOT their headquarters location)
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

  // 4b. Generate batch 3 (Endless Customers / Big 5 / TAYA) — failures here don't fail the whole story
  console.log(`[brand-story] Generating batch 3 (Endless Customers) for client ${clientId}...`);
  let batch3Sections: Record<string, string> = {};
  try {
    const batch3Prompt = buildBatchPrompt(BATCH_3_KEYS, context, { ...batch1Sections, ...batch2Sections });
    const batch3Response = await callClaudeWithRetry(GENERATION_SYSTEM_PROMPT, batch3Prompt);
    batch3Sections = parseBatchResponse(batch3Response, BATCH_3_KEYS);
  } catch (err) {
    console.error(`[brand-story] Batch 3 generation failed (non-fatal):`, err);
    // Continue without Endless Customers sections — they can be regenerated individually
  }

  // 5. Merge all sections and validate
  const allSections: Record<string, string> = { ...batch1Sections, ...batch2Sections, ...batch3Sections };
  const totalExpected = BATCH_1_KEYS.length + BATCH_2_KEYS.length + BATCH_3_KEYS.length;
  const totalParsed = Object.keys(allSections).length;
  if (totalParsed === 0) {
    throw new Error("Brand story generation failed — Claude returned no parseable sections. Please try again.");
  }
  if (totalParsed < totalExpected) {
    console.warn(`[brand-story] Only ${totalParsed}/${totalExpected} sections parsed for client ${clientId}`);
  }

  // 6. Build full markdown
  const fullStory = buildFullStoryMarkdown(allSections);

  // 6b. Compute confidence scores per section based on input data quality
  const confidenceScores = computeConfidenceScores(data);

  // 7. Upsert to cm_brand_story
  const generatedAtIso = new Date().toISOString();
  const sectionColumns = BRAND_STORY_SECTIONS.map((s) => SECTION_KEY_TO_COLUMN[s.key]);
  const sectionValues = BRAND_STORY_SECTIONS.map((s) => {
    const content = allSections[s.key] ?? null;
    if (!content) return null;
    return JSON.stringify({
      content,
      generated: true,
      edited: false,
      generatedAt: generatedAtIso,
      editedAt: null,
      confidence: confidenceScores[s.key] ?? null,
    });
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

  // 5. Update the single section column with confidence score + new timestamp
  const column = SECTION_KEY_TO_COLUMN[typedKey];
  const confidenceScores = computeConfidenceScores(data);
  const sectionData = JSON.stringify({
    content,
    generated: true,
    edited: false,
    generatedAt: new Date().toISOString(),
    editedAt: null,
    confidence: confidenceScores[typedKey] ?? null,
  });

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

  // Preserve existing generatedAt and confidence if any; just bump editedAt
  const { rows: existingRows } = await query(`SELECT ${column} FROM cm_brand_story WHERE client_id = $1`, [clientId]);
  const existing = existingRows[0]?.[column] || {};

  const sectionData = JSON.stringify({
    content,
    generated: false,
    edited: true,
    generatedAt: existing.generatedAt || existing.generated_at || null,
    editedAt: new Date().toISOString(),
    confidence: existing.confidence ?? null,
  });

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

// ── BrandScript (Short 2-Page Version) ──────────────────────

const BRANDSCRIPT_SYSTEM_PROMPT = `You are a world-class brand strategist creating a concise BrandScript — a 2-page brand messaging framework. This should be punchy, specific, and immediately useful. No fluff.

Output ONLY valid JSON with the following structure:
{
  "oneLiner": "A single sentence: [Problem] + [Solution] + [Result]",
  "character": "Who is the customer? What do they want? (2-3 sentences)",
  "problem": {
    "villain": "The root cause (not a person — a force, system, or condition)",
    "external": "The tangible, surface-level problem",
    "internal": "How it makes them feel",
    "philosophical": "Why this situation is just wrong"
  },
  "guide": {
    "empathy": "How the brand shows understanding (2-3 statements)",
    "authority": "Proof the brand can help (credentials, results, experience)"
  },
  "plan": {
    "step1": "First step (action verb + what happens)",
    "step2": "Second step",
    "step3": "Third step"
  },
  "callToAction": {
    "direct": "Primary CTA (e.g., 'Schedule Your Free Consultation')",
    "transitional": "Softer entry point (e.g., 'Download Our Free Guide')"
  },
  "success": "What life looks like after (2-3 vivid outcomes)",
  "failure": "What's at stake if they don't act (2-3 consequences)",
  "transformationBefore": "How the customer feels/lives BEFORE",
  "transformationAfter": "How the customer feels/lives AFTER"
}

CRITICAL: Be specific to THIS business. Use their actual name, services, and details. Never use placeholders.`;

export async function generateBrandScript(
  clientId: number
): Promise<{ success: boolean; brandscript: Record<string, unknown> }> {
  const data = await gatherClientData(clientId);
  if (!data.client) throw new Error(`Client ${clientId} not found`);

  let context = buildContextBlock(data);

  if (isDataSparse(data)) {
    console.log(`[brandscript] Data sparse for client ${clientId}, running research step...`);
    const research = await runResearchStep(data);
    context += `\n\n## Research Analysis\n${research}`;
  }

  const prompt = `Create a BrandScript for this business. Here is everything we know:\n\n${context}\n\nReturn ONLY the JSON object.`;

  console.log(`[brandscript] Generating BrandScript for client ${clientId}...`);
  const response = await callClaudeWithRetry(BRANDSCRIPT_SYSTEM_PROMPT, prompt);

  // Parse JSON response
  const cleaned = response.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
  let brandscript: Record<string, unknown>;
  try {
    brandscript = JSON.parse(cleaned);
  } catch {
    console.error("[brandscript] Failed to parse response, trying to extract JSON...");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      brandscript = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("AI returned invalid JSON for BrandScript");
    }
  }

  // Save to DB
  await query(
    `UPDATE cm_brand_story SET brandscript = $2, brandscript_generated_at = NOW(), updated_at = NOW()
     WHERE client_id = $1`,
    [clientId, JSON.stringify(brandscript)]
  );

  // If no brand_story row exists yet, create one
  const existing = await query("SELECT id FROM cm_brand_story WHERE client_id = $1", [clientId]);
  if (!existing.rows[0]) {
    await query(
      `INSERT INTO cm_brand_story (client_id, brandscript, brandscript_generated_at, status)
       VALUES ($1, $2, NOW(), 'generated')`,
      [clientId, JSON.stringify(brandscript)]
    );
  }

  console.log(`[brandscript] Successfully generated BrandScript for client ${clientId}`);
  return { success: true, brandscript };
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

// ── Research Outline (from URL) ──────────────────────────────

// The key intake fields that the AI should research and pre-fill
const RESEARCH_OUTLINE_FIELDS = [
  { key: "companyName", label: "Company Name", hint: "Official company/practice name" },
  { key: "industry", label: "Industry / Niche", hint: "Specific niche (e.g. 'functional medicine', 'concierge medicine', not just 'healthcare')" },
  { key: "primaryServices", label: "Primary Services", hint: "List the main services/offerings this business provides" },
  { key: "mostProfitableService", label: "Most Prominent Service", hint: "The service that appears most heavily featured or promoted" },
  { key: "serviceModel", label: "Service Model", hint: "e.g. cash-based/direct-pay, insurance-based, subscription/membership, hybrid" },
  { key: "averageServicePrice", label: "Pricing Indication", hint: "Any pricing info found, or 'Not listed' if not visible" },
  { key: "idealCustomerDescription", label: "Ideal Customer / Patient", hint: "Who this business serves — demographics, conditions, lifestyle. Be specific to what the website says, don't generalize." },
  { key: "customerLocation", label: "Customer Location / Service Area", hint: "Where their customers are. If the business appears to serve clients nationally or remotely, say so. Don't assume local-only." },
  { key: "customerDesires", label: "What Their Customers Want", hint: "The outcomes and transformations customers are seeking" },
  { key: "biggestFrustration", label: "Customer's Biggest Frustration", hint: "The root problem that drives people to seek this business — what conventional alternatives fail to deliver" },
  { key: "practicalProblem", label: "Practical Day-to-Day Problem", hint: "Tangible, surface-level problem customers face" },
  { key: "emotionalProblem", label: "Emotional Problem", hint: "How the problem makes customers FEEL" },
  { key: "howYouHelp", label: "How They Help", hint: "Their approach to solving the problem — methodology, philosophy" },
  { key: "whyTrustYou", label: "Why Trust Them (Authority)", hint: "Credentials, experience, certifications, team qualifications, years in practice" },
  { key: "threeStepProcess", label: "Their Process", hint: "How working with them works — discovery/consultation → treatment/service → results. Infer from the site." },
  { key: "brandPersonality", label: "Brand Personality", hint: "Tone and feel of the website — warm, clinical, luxury, approachable, authoritative, etc." },
  { key: "brandTone", label: "Brand Tone", hint: "How they communicate — professional, conversational, empathetic, etc." },
  { key: "brandColors", label: "Brand Colors", hint: "Describe the color palette visible on the website" },
  { key: "directCTA", label: "Primary Call to Action", hint: "The main CTA on their website (e.g. 'Book a Consultation', 'Schedule Now')" },
  { key: "topQuestionsCustomersAsk", label: "Top Questions Customers Likely Ask", hint: "Based on the services and industry, what would prospects want to know?" },
  { key: "expertiseAreas", label: "Areas of Expertise", hint: "Specific specialties, conditions treated, technologies used" },
  { key: "differentiators", label: "What Makes Them Different", hint: "What sets this business apart from competitors in the same space" },
] as const;

export { RESEARCH_OUTLINE_FIELDS };

const RESEARCH_OUTLINE_SYSTEM_PROMPT = `You are a marketing research analyst. Given a business website's content, extract specific, accurate information to fill out a brand profile.

CRITICAL RULES:
- Only state what you can reasonably infer from the website content provided. Do NOT make up specific facts.
- Be specific to THIS business — don't write generic industry descriptions.
- If the website doesn't clearly indicate something, write your best inference and mark it with "(inferred)" so the user knows to verify.
- For the customer location/service area: look for clues about whether they serve locally, regionally, or nationally. Many businesses are headquartered in one place but serve clients across the country (especially telehealth, remote services, consulting). Don't assume local-only unless the site explicitly says so.
- For the service model: look for clues about pricing structure — membership programs, cash-pay, insurance accepted, etc.
- Keep each field concise but informative (1-3 sentences).

Return your response as a JSON object with the field keys provided. Every field must have a value (use your best inference if needed).`;

export async function researchOutlineFromUrl(
  clientId: number,
  websiteUrl: string
): Promise<Record<string, string>> {
  // 1. Fetch website content
  console.log(`[brand-story] Researching website: ${websiteUrl}`);
  const websiteText = await fetchWebsiteText(websiteUrl);

  if (!websiteText || websiteText.length < 100) {
    throw new Error(`Could not fetch usable content from ${websiteUrl}. Check the URL and try again.`);
  }

  // 2. Also try to fetch /about page for more context
  let aboutText = "";
  try {
    const baseUrl = websiteUrl.replace(/\/$/, "");
    aboutText = await fetchWebsiteText(`${baseUrl}/about`);
    if (aboutText.length < 100) {
      aboutText = await fetchWebsiteText(`${baseUrl}/about-us`);
    }
  } catch { /* ok if about page doesn't exist */ }

  // 3. Build the prompt
  const fieldList = RESEARCH_OUTLINE_FIELDS.map(
    (f) => `- "${f.key}": ${f.label} — ${f.hint}`
  ).join("\n");

  const userPrompt = `Here is the website content for analysis:

=== HOMEPAGE ===
${websiteText}

${aboutText ? `=== ABOUT PAGE ===\n${aboutText.slice(0, 8_000)}\n` : ""}

Please analyze this website and fill out the following brand profile fields. Return ONLY a valid JSON object with these exact keys:

${fieldList}

Return ONLY the JSON object, no markdown fences or extra text.`;

  // 4. Call Claude
  const response = await callClaudeWithRetry(RESEARCH_OUTLINE_SYSTEM_PROMPT, userPrompt);

  // 5. Parse JSON response
  let outline: Record<string, string>;
  try {
    // Strip markdown fences if present
    const cleaned = response.replace(/^```(?:json)?\s*/m, "").replace(/\s*```\s*$/m, "").trim();
    outline = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // 6. Save as intake_data on cm_brand_story
  await query(
    `INSERT INTO cm_brand_story (client_id, intake_data, intake_submitted_at, status)
     VALUES ($1, $2, NOW(), 'draft')
     ON CONFLICT (client_id) DO UPDATE SET
       intake_data = $2,
       intake_submitted_at = NOW(),
       status = CASE WHEN cm_brand_story.status = 'generated' THEN cm_brand_story.status ELSE 'draft' END`,
    [clientId, JSON.stringify(outline)]
  );

  console.log(`[brand-story] Research outline saved for client ${clientId} (${Object.keys(outline).length} fields)`);
  return outline;
}
