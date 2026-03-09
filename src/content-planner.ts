/**
 * ═══════════════════════════════════════════════════════════════
 *  Content Planner
 *  Generates comprehensive content strategies for clients:
 *  - Primary sitemap (service pages, area pages, core pages)
 *  - 12-month editorial calendar (blogs, case studies)
 *  - SEO-driven topic selection with seasonal awareness
 *  - Internal linking strategy
 * ═══════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ContentProfile, CoreService } from "./content-factory.js";

const anthropic = new Anthropic();

// ── Interfaces ──────────────────────────────────────────────

export interface SitemapPage {
  name: string;
  path: string;
  metaTitle: string;
  type: "core" | "service-category" | "service" | "sub-service" | "area" | "blog-index" | "support";
  parentPath?: string;
}

export interface ContentCalendarItem {
  month: number;
  targetDate: string;
  pageName: string;
  path: string;
  metaTitle: string;
  type: "blog" | "case-study";
  parentServicePage?: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  seasonalRelevance?: string;
  internalLinkTargets: string[];
}

export interface ContentStrategy {
  clientName: string;
  domain?: string;
  generatedAt: string;
  sitemap: SitemapPage[];
  calendar: ContentCalendarItem[];
  summary: {
    totalSitemapPages: number;
    totalCalendarItems: number;
    blogPosts: number;
    caseStudies: number;
    monthlyBreakdown: Record<number, number>;
  };
}

export interface ContentPlannerInput {
  clientName: string;
  domain?: string;
  contentProfile: ContentProfile;
  postsPerMonth?: number;
  includesCaseStudies?: boolean;
  startMonth?: number;
  startYear?: number;
}

// ── Sitemap builder (deterministic, no AI needed) ───────────

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildSitemap(
  profile: ContentProfile,
  clientName: string,
  domain?: string,
): SitemapPage[] {
  const pages: SitemapPage[] = [];
  const brandSuffix = ` | ${clientName}`;
  const loc = profile.cities?.length === 1 ? `, ${profile.cities[0]}` : "";

  // Core pages every local business needs
  const corePages: Array<{ name: string; path: string; titlePrefix: string; type: SitemapPage["type"] }> = [
    { name: "Home", path: "/", titlePrefix: `${profile.businessType}${loc}`, type: "core" },
    { name: "About", path: "/about/", titlePrefix: `About Us`, type: "core" },
    { name: "Services", path: "/services/", titlePrefix: `Our Services`, type: "core" },
    { name: "Contact", path: "/contact/", titlePrefix: `Contact Us`, type: "core" },
    { name: "Careers", path: "/careers/", titlePrefix: `Careers`, type: "support" },
    { name: "FAQ", path: "/faq/", titlePrefix: `Frequently Asked Questions`, type: "core" },
    { name: "Gallery", path: "/gallery/", titlePrefix: `Gallery`, type: "support" },
    { name: "Blog", path: "/blog/", titlePrefix: `Blog`, type: "blog-index" },
    { name: "Testimonials", path: "/testimonials/", titlePrefix: `Reviews & Testimonials`, type: "core" },
    { name: "Terms of Service", path: "/terms/", titlePrefix: `Terms of Service`, type: "support" },
    { name: "Privacy Policy", path: "/privacy/", titlePrefix: `Privacy Policy`, type: "support" },
  ];

  for (const p of corePages) {
    pages.push({
      name: p.name,
      path: p.path,
      metaTitle: `${p.titlePrefix}${brandSuffix}`,
      type: p.type,
    });
  }

  // Service pages with category hierarchy
  if (profile.coreServices?.length) {
    const needsCategories = profile.coreServices.length > 3;

    for (const service of profile.coreServices) {
      const categorySlug = toSlug(service.name);
      const categoryPath = `/services/${categorySlug}/`;

      // If multiple top-level services, each is a category page
      if (needsCategories) {
        pages.push({
          name: service.name,
          path: categoryPath,
          metaTitle: `${service.name}${loc}${brandSuffix}`,
          type: "service-category",
          parentPath: "/services/",
        });
      }

      // Sub-services become individual service pages
      if (service.subServices?.length) {
        for (const sub of service.subServices) {
          const subSlug = toSlug(sub.name);
          const subPath = needsCategories
            ? `/services/${categorySlug}/${subSlug}/`
            : `/services/${subSlug}/`;

          pages.push({
            name: sub.name,
            path: subPath,
            metaTitle: `${sub.name}${loc}${brandSuffix}`,
            type: "sub-service",
            parentPath: needsCategories ? categoryPath : "/services/",
          });
        }
      } else if (!needsCategories) {
        // Single-level: service pages directly under /services/
        pages.push({
          name: service.name,
          path: `/services/${categorySlug}/`,
          metaTitle: `${service.name}${loc}${brandSuffix}`,
          type: "service",
          parentPath: "/services/",
        });
      }
    }
  }

  // Area pages
  if (profile.cities?.length) {
    pages.push({
      name: "Areas Served",
      path: "/areas/",
      metaTitle: `Areas We Serve${brandSuffix}`,
      type: "core",
    });

    for (const city of profile.cities) {
      const citySlug = toSlug(city);
      pages.push({
        name: city,
        path: `/areas/${citySlug}/`,
        metaTitle: `${profile.businessType} in ${city}${brandSuffix}`,
        type: "area",
        parentPath: "/areas/",
      });
    }
  }

  return pages;
}

// ── AI-powered editorial calendar ───────────────────────────

const CALENDAR_SYSTEM_PROMPT = `You are an expert SEO content strategist for local businesses. Your job is to create a 12-month editorial calendar of blog posts and case studies that:

1. Build topical authority around the business's core services
2. Target micro-topics and specific consumer questions (not generic "5 benefits of..." filler)
3. Support and interlink with the main service pages on the sitemap
4. Factor in seasonal relevance (plan seasonal topics 1-2 months ahead)
5. Mix topic types: how-to, comparison, cost/pricing, myth-busting, process explainers, local guides, case studies
6. Prioritize unique insights: their process, pricing/costs, recommendations, top picks, comparisons, key questions, myths

Rules:
- Every topic must be specific enough to rank for a long-tail keyword
- Case studies should be less frequent than blog posts (roughly 1 per quarter unless told otherwise)
- Do not repeat topics or use generic filler
- Each topic must specify which service page(s) it should link to
- Include primary and secondary keywords for each piece
- Distribute topics evenly across the year
- Consider what consumers actually search for in this industry

Respond with ONLY a valid JSON array. No markdown, no explanation, no code fences. Each item:
{
  "month": 1-12,
  "pageName": "The Article Title",
  "type": "blog" or "case-study",
  "primaryKeyword": "main search term",
  "secondaryKeywords": ["term1", "term2"],
  "parentServicePage": "/services/slug/",
  "seasonalRelevance": "why this month or null",
  "internalLinkTargets": ["/services/slug/", "/areas/city/"]
}`;

export async function generateEditorialCalendar(
  profile: ContentProfile,
  clientName: string,
  sitemap: SitemapPage[],
  postsPerMonth: number = 4,
  startMonth: number = 1,
  startYear: number = new Date().getFullYear(),
): Promise<ContentCalendarItem[]> {
  const servicePages = sitemap
    .filter((p) => ["service", "service-category", "sub-service"].includes(p.type))
    .map((p) => `${p.name} (${p.path})`)
    .join("\n  ");

  const areaPages = sitemap
    .filter((p) => p.type === "area")
    .map((p) => `${p.name} (${p.path})`)
    .join("\n  ");

  const totalPieces = postsPerMonth * 12;

  const userPrompt = `Create a ${totalPieces}-piece content calendar (${postsPerMonth} per month) for the following business:

Business: ${clientName}
Industry: ${profile.businessType}
${profile.tagline ? `Tagline: ${profile.tagline}` : ""}
${profile.cities?.length ? `Location(s): ${profile.cities.join(", ")}` : ""}

Services offered:
${profile.coreServices?.map((s) => {
  let line = `  - ${s.name}${s.description ? `: ${s.description}` : ""}`;
  if (s.subServices?.length) {
    line += "\n" + s.subServices.map((sub) => `    - ${sub.name}${sub.description ? `: ${sub.description}` : ""}`).join("\n");
  }
  return line;
}).join("\n") || "  (none specified)"}

Service pages on the sitemap:
  ${servicePages || "(none)"}

Area pages:
  ${areaPages || "(none)"}

Start month: ${startMonth} (${startYear})
Total pieces: ${totalPieces} (${postsPerMonth}/month)

Generate the JSON array now.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 8192,
    system: CALENDAR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text || "[]";

  // Parse the JSON (strip any accidental markdown fences)
  const cleaned = text.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  const items: any[] = JSON.parse(cleaned);

  // Convert to typed calendar items with computed dates
  return items.map((item, index) => {
    const month = item.month || ((index % 12) + 1);
    const weekInMonth = Math.floor((index % postsPerMonth)) + 1;
    const day = Math.min(weekInMonth * 7, 28);
    const year = month >= startMonth ? startYear : startYear + 1;
    const targetDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const slug = toSlug(item.pageName || `post-${index + 1}`);

    return {
      month,
      targetDate,
      pageName: item.pageName || `Post ${index + 1}`,
      path: `/blog/${slug}/`,
      metaTitle: `${item.pageName}${item.parentServicePage ? "" : ""} | ${clientName}`,
      type: (item.type === "case-study" ? "case-study" : "blog") as "blog" | "case-study",
      parentServicePage: item.parentServicePage || undefined,
      primaryKeyword: item.primaryKeyword || "",
      secondaryKeywords: item.secondaryKeywords || [],
      seasonalRelevance: item.seasonalRelevance || undefined,
      internalLinkTargets: item.internalLinkTargets || [],
    };
  });
}

// ── Full strategy generator ─────────────────────────────────

export async function generateContentStrategy(
  input: ContentPlannerInput,
): Promise<ContentStrategy> {
  const { clientName, domain, contentProfile, postsPerMonth = 4, startMonth, startYear } = input;

  // Step 1: Build deterministic sitemap
  console.log(`[content-planner] Building sitemap for ${clientName}...`);
  const sitemap = buildSitemap(contentProfile, clientName, domain);

  // Step 2: Generate AI-powered editorial calendar
  console.log(`[content-planner] Generating ${postsPerMonth * 12}-piece editorial calendar...`);
  const calendar = await generateEditorialCalendar(
    contentProfile,
    clientName,
    sitemap,
    postsPerMonth,
    startMonth,
    startYear,
  );

  // Step 3: Compute summary
  const monthlyBreakdown: Record<number, number> = {};
  let blogPosts = 0;
  let caseStudies = 0;
  for (const item of calendar) {
    monthlyBreakdown[item.month] = (monthlyBreakdown[item.month] || 0) + 1;
    if (item.type === "blog") blogPosts++;
    else caseStudies++;
  }

  return {
    clientName,
    domain,
    generatedAt: new Date().toISOString(),
    sitemap,
    calendar,
    summary: {
      totalSitemapPages: sitemap.length,
      totalCalendarItems: calendar.length,
      blogPosts,
      caseStudies,
      monthlyBreakdown,
    },
  };
}

// ── CSV export ──────────────────────────────────────────────

export function strategyToCSV(strategy: ContentStrategy): string {
  const rows: string[][] = [
    ["Section", "Page Name", "Path", "Meta Title", "Type", "Target Date", "Primary Keyword", "Links To"],
  ];

  // Sitemap pages
  for (const page of strategy.sitemap) {
    const indent = page.parentPath ? "  " : "";
    rows.push([
      "Sitemap",
      `${indent}${page.name}`,
      page.path,
      page.metaTitle,
      page.type,
      "",
      "",
      "",
    ]);
  }

  // Calendar items
  for (const item of strategy.calendar) {
    rows.push([
      "Content Calendar",
      item.pageName,
      item.path,
      item.metaTitle,
      item.type,
      item.targetDate,
      item.primaryKeyword,
      item.internalLinkTargets.join("; "),
    ]);
  }

  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
