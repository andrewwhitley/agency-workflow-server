/**
 * ═══════════════════════════════════════════════════════════════
 *  Content QA
 *  Reviews generated content for quality, accuracy, SEO compliance,
 *  and AI writing detection. Produces graded scores and specific
 *  improvement suggestions.
 * ═══════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContentProfile, ContentPageSpec } from "./content-factory.js";
import type { SitemapPage } from "./content-planner.js";

const anthropic = new Anthropic();

// ── Interfaces ──────────────────────────────────────────────

export interface QAIssue {
  category: "accuracy" | "seo" | "writing" | "links" | "ai-detection";
  severity: "error" | "warning" | "info";
  description: string;
  suggestion?: string;
}

export interface QAScore {
  accuracy: number;      // 0-100
  seo: number;           // 0-100
  writingQuality: number; // 0-100
  overall: number;       // 0-100
  grade: string;         // A, B, C, D, F
}

export interface QAResult {
  pageId: string;
  pageTitle: string;
  scores: QAScore;
  issues: QAIssue[];
  passed: boolean;
  improvedContent?: string;
}

export interface QAConfig {
  passThreshold?: number;
  autoFix?: boolean;
  sitemap?: SitemapPage[];
}

// ── System prompt ───────────────────────────────────────────

const QA_SYSTEM_PROMPT = `You are an expert content editor, SEO specialist, and quality assurance reviewer for local business websites. Your job is to evaluate content against strict standards and produce a structured review.

You will receive:
1. The generated content (markdown)
2. The page specification (what was requested)
3. The client's brand profile (services, voice, StoryBrand, etc.)
4. The sitemap of the website (for internal link validation)

## Evaluation Criteria

### Accuracy (0-100)
- Content matches the client profile data (services, areas, claims)
- No fabricated statistics, credentials, or claims
- Service descriptions match what the client actually offers
- Location references are correct
- StoryBrand elements are properly applied (hero, guide, plan)

### SEO (0-100)
- Meta title: starts with main keyword/topic, includes city/state if local, ends with brand name separated by "|", under 60-70 chars (not counting brand)
- H1 is very similar to the meta title
- First section is a summary (not an intro) that answers the main question immediately
- Structure is: summary, meat/details, CTA (not intro, meat, CTA)
- Headline keywords appear in the following paragraph(s)
- Keyword variations and extenders used naturally
- Internal links present and use relative URLs
- JSON-LD schema markup included
- Meta description present with CTA and phone number for service/area pages

### Writing Quality (0-100)
- Written naturally, as if speaking to a real person
- 2nd person voice
- Scannable: uses bold, bullets, callout statements
- CTA has a headline, phone number, differentiator, target areas
- No em dashes, long dashes, or double hyphens
- No generic filler or vague statements
- No words: free, cheap, affordable, low-cost, guarantee (unless specified)
- Phone numbers are clickable
- External links open in new tab
- All factual claims are verifiable

### AI Detection (checked as part of writing quality)
Flag these AI writing patterns:
- Repetitive phrasing or sentence structures
- Generic/vague statements without specifics
- Overuse of: "additionally", "furthermore", "moreover", "in conclusion", "however", "on the other hand", "it's important to note", "for example", "in summary", "to summarize", "overall", "as a result", "ultimately", "for instance", "in other words", "that being said"
- Flawless but stiff grammar
- Lack of personal stories or local detail
- Overuse of structured lists and headings
- Awkward synonym substitutions
- Em dashes (zero tolerance)

## Response Format

Respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "scores": {
    "accuracy": 0-100,
    "seo": 0-100,
    "writingQuality": 0-100
  },
  "issues": [
    {
      "category": "accuracy|seo|writing|links|ai-detection",
      "severity": "error|warning|info",
      "description": "What's wrong",
      "suggestion": "How to fix it"
    }
  ]
}

Be thorough but fair. Only flag real issues, not nitpicks.`;

// ── QA review function ──────────────────────────────────────

function computeGrade(score: number): string {
  if (score >= 93) return "A";
  if (score >= 85) return "B+";
  if (score >= 78) return "B";
  if (score >= 70) return "C+";
  if (score >= 63) return "C";
  if (score >= 55) return "D";
  return "F";
}

export async function reviewContent(
  content: string,
  spec: ContentPageSpec,
  profile: ContentProfile,
  clientName: string,
  config: QAConfig = {},
): Promise<QAResult> {
  const sitemapContext = config.sitemap?.length
    ? `\n\nSITEMAP (for internal link validation):\n${config.sitemap.map((p) => `  ${p.name}: ${p.path}`).join("\n")}`
    : "";

  // Build brand context summary
  const brandContext = [
    `Business: ${clientName}`,
    `Type: ${profile.businessType}`,
    profile.tagline ? `Tagline: ${profile.tagline}` : "",
    profile.cities?.length ? `Cities: ${profile.cities.join(", ")}` : "",
    profile.coreServices?.length
      ? `Services: ${profile.coreServices.map((s) => s.name).join(", ")}`
      : "",
    profile.brandVoice ? `Voice: ${profile.brandVoice.tone}, ${profile.brandVoice.style}` : "",
    profile.brandVoice?.avoidWords?.length
      ? `Avoid words: ${profile.brandVoice.avoidWords.join(", ")}`
      : "",
  ].filter(Boolean).join("\n");

  const userPrompt = `Review this content:

--- PAGE SPECIFICATION ---
Title: ${spec.title}
Slug: /${spec.slug}
Type: ${spec.type}
Purpose: ${spec.context}
${spec.serviceName ? `Service: ${spec.serviceName}` : ""}
${spec.cityName ? `City: ${spec.cityName}` : ""}

--- CLIENT PROFILE ---
${brandContext}

--- CONTENT TO REVIEW ---
${content}
${sitemapContext}

Evaluate and return the JSON review.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: QA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "{}";
  const cleaned = text.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[content-qa] Failed to parse QA response:", text.slice(0, 200));
    return {
      pageId: spec.id,
      pageTitle: spec.title,
      scores: { accuracy: 0, seo: 0, writingQuality: 0, overall: 0, grade: "F" },
      issues: [{ category: "accuracy", severity: "error", description: "QA review failed to parse" }],
      passed: false,
    };
  }

  const scores: QAScore = {
    accuracy: parsed.scores?.accuracy ?? 0,
    seo: parsed.scores?.seo ?? 0,
    writingQuality: parsed.scores?.writingQuality ?? 0,
    overall: 0,
    grade: "",
  };
  scores.overall = Math.round((scores.accuracy + scores.seo + scores.writingQuality) / 3);
  scores.grade = computeGrade(scores.overall);

  const issues: QAIssue[] = (parsed.issues || []).map((i: any) => ({
    category: i.category || "writing",
    severity: i.severity || "warning",
    description: i.description || "",
    suggestion: i.suggestion || undefined,
  }));

  const threshold = config.passThreshold ?? 70;

  return {
    pageId: spec.id,
    pageTitle: spec.title,
    scores,
    issues,
    passed: scores.overall >= threshold,
  };
}

// ── Batch QA ────────────────────────────────────────────────

export interface BatchQAResult {
  totalReviewed: number;
  passed: number;
  failed: number;
  averageScore: number;
  averageGrade: string;
  results: QAResult[];
}

export async function reviewBatch(
  pages: Array<{ spec: ContentPageSpec; content: string }>,
  profile: ContentProfile,
  clientName: string,
  config: QAConfig = {},
): Promise<BatchQAResult> {
  const results: QAResult[] = [];

  for (let i = 0; i < pages.length; i++) {
    const { spec, content } = pages[i];
    console.log(`[content-qa] Reviewing ${i + 1}/${pages.length}: ${spec.title}`);

    try {
      const result = await reviewContent(content, spec, profile, clientName, config);
      results.push(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[content-qa] Review failed for ${spec.title}:`, message);
      results.push({
        pageId: spec.id,
        pageTitle: spec.title,
        scores: { accuracy: 0, seo: 0, writingQuality: 0, overall: 0, grade: "F" },
        issues: [{ category: "accuracy", severity: "error", description: `Review failed: ${message}` }],
        passed: false,
      });
    }

    // Rate limit between reviews
    if (i < pages.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const totalScore = results.reduce((sum, r) => sum + r.scores.overall, 0);
  const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

  return {
    totalReviewed: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    averageScore: avgScore,
    averageGrade: computeGrade(avgScore),
    results,
  };
}
