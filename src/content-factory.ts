/**
 * ═══════════════════════════════════════════════════════════════
 *  Content Factory
 *  Generates batches of branded content (website pages, blog posts,
 *  GBP posts) using Claude with full client brand context, outputting
 *  Google Docs to per-client Drive folders.
 * ═══════════════════════════════════════════════════════════════
 */

import Anthropic from "@anthropic-ai/sdk";
import { loadClientConfig, type ClientConfig } from "./workbook-service.js";
import { GoogleDriveService } from "./google-drive.js";

const anthropic = new Anthropic();

// ── Interfaces ──────────────────────────────────────────────

export interface SubService {
  name: string;
  slug: string;
  description?: string;
}

export interface CoreService {
  name: string;
  slug: string;
  description?: string;
  subServices?: SubService[];
}

export interface StoryBrand {
  hero: string;
  problem: string;
  guide: string;
  plan: string;
  callToAction: string;
  avoidFailure: string;
  achieveSuccess: string;
}

export interface BrandVoice {
  tone: string;
  style: string;
  avoidWords?: string[];
  preferWords?: string[];
}

export interface ContentProfile {
  businessType: string;
  tagline?: string;
  cities?: string[];
  coreServices?: CoreService[];
  storybrand?: StoryBrand;
  brandVoice?: BrandVoice;
  contentPrompts?: Record<string, string>;
}

export type ContentType = "website-page" | "blog-post" | "gbp-post";

export interface ContentPageSpec {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  context: string;
  serviceName?: string;
  cityName?: string;
}

export interface ContentFactoryInput {
  clientSlug?: string;
  contentProfile?: ContentProfile;
  clientConfig?: ClientConfig;
  contentTypes?: ContentType[];
  dryRun?: boolean;
  outputFolderId?: string;
}

export interface PageResult {
  id: string;
  title: string;
  slug: string;
  status: "success" | "failed";
  docId?: string;
  docUrl?: string;
  error?: string;
}

export interface ContentFactoryResult {
  runId: string;
  clientName: string;
  status: "completed" | "in_progress" | "failed";
  totalPages: number;
  completedPages: number;
  failedPages: number;
  pages: PageResult[];
  folderId?: string;
  folderUrl?: string;
  dryRun: boolean;
  startedAt: string;
  completedAt?: string;
}

// ── Default system prompts per content type ─────────────────

const DEFAULT_PROMPTS: Record<ContentType, string> = {
  "website-page": `You are a professional website copywriter. Write compelling, SEO-optimized website page content.

Rules:
- Write in the brand voice provided
- Use the StoryBrand framework: the customer is the hero, the business is the guide
- Include a clear call-to-action
- Use H2 and H3 headings to structure content
- Write 400-800 words per page
- Include relevant keywords naturally
- Do NOT use generic filler — every sentence should be specific to this business
- Output clean text with markdown headings (## for H2, ### for H3)
- Do NOT include the page title as an H1 — that will be added separately`,

  "blog-post": `You are a professional content writer specializing in blog posts. Write informative, engaging blog content.

Rules:
- Write in the brand voice provided
- Target 800-1500 words
- Use H2 and H3 headings for structure
- Include an engaging introduction that hooks the reader
- Provide actionable advice and specific examples
- End with a clear call-to-action
- Write for both humans and search engines
- Output clean text with markdown headings`,

  "gbp-post": `You are a local business marketing specialist writing Google Business Profile posts.

Rules:
- Write 100-300 words (GBP post limit is ~1500 chars)
- Be conversational and warm
- Include a call-to-action (call, visit, book online)
- Reference the local area when relevant
- Focus on one service or topic per post
- Keep it engaging and to the point`,
};

// ── In-memory run tracking ──────────────────────────────────

const activeRuns = new Map<string, ContentFactoryResult>();

export function getRunStatus(runId: string): ContentFactoryResult | null {
  return activeRuns.get(runId) || null;
}

export function listRuns(): ContentFactoryResult[] {
  return Array.from(activeRuns.values()).sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

// ── Build content plan ──────────────────────────────────────

export function buildContentPlan(
  profile: ContentProfile,
  clientName: string,
  contentTypes: ContentType[] = ["website-page"]
): ContentPageSpec[] {
  const pages: ContentPageSpec[] = [];

  if (contentTypes.includes("website-page")) {
    // Static pages every business needs
    const staticPages = [
      { title: "Home", slug: "home", context: "Main landing page. Lead with the hero's problem, position the business as the guide, present the plan, and call to action." },
      { title: "About", slug: "about", context: "About page. Tell the provider's story, credentials, mission. Why they started this business and who they serve." },
      { title: "Services Overview", slug: "services", context: "Overview of all services offered. Brief description of each with links to individual service pages." },
      { title: "Contact", slug: "contact", context: "Contact page. Include location, hours, phone, email, and a warm invitation to reach out." },
      { title: "Testimonials", slug: "testimonials", context: "Testimonials page. Frame with intro text about client results. Leave placeholders for actual testimonials." },
      { title: "FAQ", slug: "faq", context: "Frequently asked questions. Cover common concerns, pricing questions, what to expect on first visit." },
      { title: "Blog", slug: "blog", context: "Blog index page. Brief intro about the topics covered and why readers should follow along." },
    ];

    for (const page of staticPages) {
      pages.push({
        id: `website-${page.slug}`,
        type: "website-page",
        title: `${clientName} — ${page.title}`,
        slug: page.slug,
        context: page.context,
      });
    }

    // Service pages
    if (profile.coreServices) {
      for (const service of profile.coreServices) {
        pages.push({
          id: `website-service-${service.slug}`,
          type: "website-page",
          title: `${service.name} — ${clientName}`,
          slug: service.slug,
          context: `Dedicated service page for "${service.name}". ${service.description || ""} Explain what the service involves, who it's for, benefits, and what to expect.`,
          serviceName: service.name,
        });

        // Sub-service pages
        if (service.subServices) {
          for (const sub of service.subServices) {
            pages.push({
              id: `website-service-${sub.slug}`,
              type: "website-page",
              title: `${sub.name} — ${clientName}`,
              slug: sub.slug,
              context: `Sub-service page for "${sub.name}" under "${service.name}". ${sub.description || ""} Explain the specialty, who benefits most, and how it differs from the general service.`,
              serviceName: sub.name,
            });
          }
        }
      }
    }

    // City/location pages
    if (profile.cities) {
      for (const city of profile.cities) {
        const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        pages.push({
          id: `website-location-${citySlug}`,
          type: "website-page",
          title: `${profile.businessType} in ${city} — ${clientName}`,
          slug: citySlug,
          context: `Location page for ${city}. Highlight availability in this area, local relevance, and why residents should choose this business. Reference local landmarks or community aspects if appropriate.`,
          cityName: city,
        });
      }
    }
  }

  return pages;
}

// ── Generate a single page ──────────────────────────────────

function buildPagePrompt(
  spec: ContentPageSpec,
  profile: ContentProfile,
  clientName: string
): { system: string; user: string } {
  // Use custom prompt if provided, otherwise default
  const basePrompt = profile.contentPrompts?.[spec.type] || DEFAULT_PROMPTS[spec.type];

  // Build brand context
  const brandContext: string[] = [
    `Business: ${clientName}`,
    `Type: ${profile.businessType}`,
  ];
  if (profile.tagline) brandContext.push(`Tagline: ${profile.tagline}`);
  if (profile.brandVoice) {
    brandContext.push(`Tone: ${profile.brandVoice.tone}`);
    brandContext.push(`Style: ${profile.brandVoice.style}`);
    if (profile.brandVoice.avoidWords?.length) {
      brandContext.push(`Avoid these words: ${profile.brandVoice.avoidWords.join(", ")}`);
    }
    if (profile.brandVoice.preferWords?.length) {
      brandContext.push(`Prefer these words: ${profile.brandVoice.preferWords.join(", ")}`);
    }
  }

  // StoryBrand context
  if (profile.storybrand) {
    brandContext.push("");
    brandContext.push("StoryBrand Framework:");
    brandContext.push(`- Hero (customer): ${profile.storybrand.hero}`);
    brandContext.push(`- Problem: ${profile.storybrand.problem}`);
    brandContext.push(`- Guide (business): ${profile.storybrand.guide}`);
    brandContext.push(`- Plan: ${profile.storybrand.plan}`);
    brandContext.push(`- Call to Action: ${profile.storybrand.callToAction}`);
    brandContext.push(`- Avoid Failure: ${profile.storybrand.avoidFailure}`);
    brandContext.push(`- Achieve Success: ${profile.storybrand.achieveSuccess}`);
  }

  // Services context
  if (profile.coreServices?.length) {
    brandContext.push("");
    brandContext.push("Services offered:");
    for (const svc of profile.coreServices) {
      brandContext.push(`- ${svc.name}${svc.description ? `: ${svc.description}` : ""}`);
      if (svc.subServices) {
        for (const sub of svc.subServices) {
          brandContext.push(`  - ${sub.name}${sub.description ? `: ${sub.description}` : ""}`);
        }
      }
    }
  }

  // Cities context
  if (profile.cities?.length) {
    brandContext.push("");
    brandContext.push(`Service areas: ${profile.cities.join(", ")}`);
  }

  const system = `${basePrompt}\n\n--- BRAND CONTEXT ---\n${brandContext.join("\n")}`;

  const user = `Write the content for this page:\n\nPage Title: ${spec.title}\nSlug: /${spec.slug}\nPage Purpose: ${spec.context}${spec.serviceName ? `\nService: ${spec.serviceName}` : ""}${spec.cityName ? `\nCity: ${spec.cityName}` : ""}`;

  return { system, user };
}

export async function generatePageContent(
  spec: ContentPageSpec,
  profile: ContentProfile,
  clientName: string
): Promise<string> {
  const { system, user } = buildPagePrompt(spec, profile, clientName);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

// ── Main orchestrator ───────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function generateRunId(): string {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function runContentFactory(
  input: ContentFactoryInput,
  driveService?: GoogleDriveService
): Promise<ContentFactoryResult> {
  // Resolve client config and content profile
  let clientConfig: ClientConfig | null = null;
  let profile: ContentProfile;
  let clientName: string;

  if (input.clientSlug) {
    clientConfig = loadClientConfig(input.clientSlug);
    if (!clientConfig) throw new Error(`Client config not found: ${input.clientSlug}`);
  }
  if (input.clientConfig) {
    clientConfig = input.clientConfig;
  }

  // Content profile: inline > client config > error
  if (input.contentProfile) {
    profile = input.contentProfile;
  } else if (clientConfig?.contentProfile) {
    profile = clientConfig.contentProfile;
  } else {
    throw new Error("No content profile provided. Send contentProfile inline or configure it in the client JSON.");
  }

  clientName = clientConfig?.name || profile.businessType || "Client";

  const contentTypes = input.contentTypes || ["website-page"];
  const pages = buildContentPlan(profile, clientName, contentTypes);

  const runId = generateRunId();
  const result: ContentFactoryResult = {
    runId,
    clientName,
    status: "in_progress",
    totalPages: pages.length,
    completedPages: 0,
    failedPages: 0,
    pages: [],
    dryRun: input.dryRun === true,
    startedAt: new Date().toISOString(),
  };

  activeRuns.set(runId, result);

  // Dry run: return the plan without generating
  if (input.dryRun) {
    result.status = "completed";
    result.completedAt = new Date().toISOString();
    result.pages = pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: "success" as const,
    }));
    return result;
  }

  // Create output folder in Drive
  const outputFolderId = input.outputFolderId || clientConfig?.outputFolder;

  let contentFolderId: string | undefined;
  if (driveService && outputFolderId) {
    try {
      const folderName = `${clientName} — Website Content — ${new Date().toISOString().slice(0, 10)}`;
      contentFolderId = await driveService.createFolder(folderName, outputFolderId);
      result.folderId = contentFolderId;
      result.folderUrl = `https://drive.google.com/drive/folders/${contentFolderId}`;
    } catch (err) {
      console.error("Failed to create content folder:", err);
    }
  }

  // Generate pages sequentially
  for (let i = 0; i < pages.length; i++) {
    const spec = pages[i];
    const pageResult: PageResult = {
      id: spec.id,
      title: spec.title,
      slug: spec.slug,
      status: "success",
    };

    try {
      console.log(`[content-factory] Generating ${i + 1}/${pages.length}: ${spec.title}`);
      const content = await generatePageContent(spec, profile, clientName);

      // Save to Google Drive if available
      if (driveService && contentFolderId) {
        const doc = await driveService.createGoogleDoc(spec.title, contentFolderId, content);
        pageResult.docId = doc.id;
        pageResult.docUrl = doc.url;
      }

      result.completedPages++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[content-factory] Failed: ${spec.title}:`, message);
      pageResult.status = "failed";
      pageResult.error = message;
      result.failedPages++;
    }

    result.pages.push(pageResult);

    // Rate limit delay between pages (skip after last page)
    if (i < pages.length - 1) {
      await delay(2000);
    }
  }

  result.status = result.failedPages === pages.length ? "failed" : "completed";
  result.completedAt = new Date().toISOString();
  return result;
}
