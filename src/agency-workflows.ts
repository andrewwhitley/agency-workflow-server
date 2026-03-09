/**
 * ═══════════════════════════════════════════════════════════════
 *  Agency Workflows
 *  Pre-built workflows for WordPress, GHL, SEO, Google Ads, Meta
 * ═══════════════════════════════════════════════════════════════
 *
 *  These are STARTER templates. Each one runs locally with
 *  simulated data so you can see the pattern. To connect to
 *  real APIs, replace the action functions with actual API calls
 *  and add your API keys to Railway env vars.
 * ═══════════════════════════════════════════════════════════════
 */

import { WorkflowEngine } from "./workflow-engine.js";
import { loadClientConfig } from "./workbook-service.js";
import { buildContentPlan, runContentFactory, type ContentType } from "./content-factory.js";

export function registerAgencyWorkflows(engine: WorkflowEngine): void {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  SEO WORKFLOWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  engine.register({
    name: "seo-audit",
    description: "Run a technical SEO audit on a URL — checks meta tags, headings, performance signals, and generates a report",
    category: "SEO",
    tags: ["seo", "audit", "technical"],
    inputs: {
      url: { type: "string", description: "The URL to audit", required: true },
      depth: { type: "string", description: "Audit depth: 'quick' or 'full'", default: "quick" },
    },
    steps: [
      {
        id: "fetch_page",
        description: "Fetch the page and extract key SEO elements",
        action: async (ctx) => {
          const url = String(ctx.inputs.url);
          ctx.log(`Fetching ${url}...`);
          // In production: use fetch() or puppeteer to actually crawl
          return {
            url,
            statusCode: 200,
            title: `Example Title — ${url}`,
            metaDescription: "This is a sample meta description for audit purposes.",
            h1Count: 1,
            h2Count: 4,
            imgWithoutAlt: 2,
            canonical: url,
            hasRobotsTxt: true,
            hasSitemap: true,
            loadTimeMs: 1240,
            pageSize: "1.8MB",
          };
        },
      },
      {
        id: "analyze",
        description: "Score each SEO factor",
        action: async (ctx) => {
          const page = ctx.results.fetch_page as Record<string, unknown>;
          const issues: string[] = [];
          let score = 100;

          const title = String(page.title ?? "");
          if (!title) { issues.push("❌ Missing title tag"); score -= 20; }
          else if (title.length > 60) { issues.push("⚠️ Title too long (" + title.length + " chars, aim for <60)"); score -= 5; }

          const desc = String(page.metaDescription ?? "");
          if (!desc) { issues.push("❌ Missing meta description"); score -= 15; }
          else if (desc.length > 160) { issues.push("⚠️ Meta description too long"); score -= 5; }

          if ((page.h1Count as number) === 0) { issues.push("❌ No H1 tag found"); score -= 15; }
          if ((page.h1Count as number) > 1) { issues.push("⚠️ Multiple H1 tags"); score -= 5; }

          if ((page.imgWithoutAlt as number) > 0) {
            issues.push(`⚠️ ${page.imgWithoutAlt} images missing alt text`);
            score -= (page.imgWithoutAlt as number) * 3;
          }

          if ((page.loadTimeMs as number) > 3000) { issues.push("❌ Page load > 3s"); score -= 15; }
          else if ((page.loadTimeMs as number) > 2000) { issues.push("⚠️ Page load > 2s"); score -= 5; }

          if (!page.hasSitemap) { issues.push("⚠️ No sitemap.xml found"); score -= 10; }

          return {
            score: Math.max(0, score),
            grade: score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F",
            issueCount: issues.length,
            issues,
            passed: [
              page.hasRobotsTxt ? "✅ robots.txt found" : null,
              page.hasSitemap ? "✅ sitemap.xml found" : null,
              page.canonical ? "✅ Canonical URL set" : null,
              (page.h1Count as number) === 1 ? "✅ Single H1 tag" : null,
            ].filter(Boolean),
          };
        },
      },
      {
        id: "report",
        description: "Generate a formatted audit report",
        action: async (ctx) => {
          const page = ctx.results.fetch_page as Record<string, unknown>;
          const analysis = ctx.results.analyze as Record<string, unknown>;
          return {
            summary: `SEO Audit for ${page.url}: Score ${analysis.score}/100 (${analysis.grade})`,
            details: analysis,
            recommendation:
              (analysis.score as number) >= 90
                ? "Great shape! Focus on content and backlinks."
                : (analysis.score as number) >= 70
                  ? "Some issues to fix. Address the warnings above for quick wins."
                  : "Needs attention. Start with the critical issues marked with ❌.",
          };
        },
      },
    ],
  });

  engine.register({
    name: "keyword-research",
    description: "Research keywords for a topic — generates keyword ideas with volume estimates and difficulty scores",
    category: "SEO",
    tags: ["seo", "keywords", "content"],
    inputs: {
      topic: { type: "string", description: "Main topic or seed keyword", required: true },
      intent: { type: "string", description: "Search intent: informational, commercial, transactional, navigational", default: "informational" },
      count: { type: "number", description: "Number of keywords to generate", default: 10 },
    },
    steps: [
      {
        id: "generate",
        description: "Generate keyword ideas (connect to SEMrush/Ahrefs API in production)",
        action: async (ctx) => {
          const topic = String(ctx.inputs.topic);
          const count = Number(ctx.inputs.count ?? 10);
          // Simulated — replace with actual API call
          const modifiers = ["best", "how to", "top", "cheap", "review", "vs", "near me", "guide", "tips", "examples"];
          return modifiers.slice(0, count).map((mod, i) => ({
            keyword: `${mod} ${topic}`,
            volume: Math.floor(Math.random() * 10000) + 100,
            difficulty: Math.floor(Math.random() * 100),
            cpc: (Math.random() * 5 + 0.5).toFixed(2),
            intent: ctx.inputs.intent,
          }));
        },
      },
      {
        id: "prioritize",
        description: "Rank keywords by opportunity (high volume + low difficulty)",
        action: async (ctx) => {
          const keywords = ctx.results.generate as Array<{
            keyword: string; volume: number; difficulty: number; cpc: string;
          }>;
          const scored = keywords
            .map((kw) => ({
              ...kw,
              opportunityScore: Math.round((kw.volume / 100) * ((100 - kw.difficulty) / 100)),
            }))
            .sort((a, b) => b.opportunityScore - a.opportunityScore);

          return {
            topKeywords: scored.slice(0, 5),
            allKeywords: scored,
            summary: `Found ${scored.length} keywords. Top opportunity: "${scored[0]?.keyword}" (score: ${scored[0]?.opportunityScore})`,
          };
        },
      },
    ],
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  GOOGLE ADS WORKFLOWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  engine.register({
    name: "google-ads-report",
    description: "Generate a Google Ads performance report for a date range — includes spend, conversions, ROAS, and recommendations",
    category: "Google Ads",
    tags: ["ads", "google", "reporting"],
    inputs: {
      accountName: { type: "string", description: "Client account name", required: true },
      dateRange: { type: "string", description: "Date range: 'last_7_days', 'last_30_days', 'last_quarter'", default: "last_30_days" },
    },
    steps: [
      {
        id: "fetch_data",
        description: "Pull campaign data (connect to Google Ads API in production)",
        action: async (ctx) => {
          // Simulated data — replace with Google Ads API
          return {
            account: ctx.inputs.accountName,
            dateRange: ctx.inputs.dateRange,
            campaigns: [
              { name: "Brand — Search", spend: 1200, impressions: 45000, clicks: 3200, conversions: 89, cpa: 13.48, roas: 5.2 },
              { name: "Non-Brand — Search", spend: 3400, impressions: 120000, clicks: 4800, conversions: 52, cpa: 65.38, roas: 2.1 },
              { name: "Remarketing — Display", spend: 800, impressions: 200000, clicks: 1800, conversions: 34, cpa: 23.53, roas: 3.8 },
              { name: "Performance Max", spend: 2200, impressions: 300000, clicks: 5200, conversions: 67, cpa: 32.84, roas: 3.1 },
            ],
          };
        },
      },
      {
        id: "analyze",
        description: "Calculate aggregate metrics and identify winners/losers",
        action: async (ctx) => {
          const data = ctx.results.fetch_data as { campaigns: Array<{ name: string; spend: number; impressions: number; clicks: number; conversions: number; cpa: number; roas: number }> };
          const totals = data.campaigns.reduce(
            (acc, c) => ({
              spend: acc.spend + c.spend,
              impressions: acc.impressions + c.impressions,
              clicks: acc.clicks + c.clicks,
              conversions: acc.conversions + c.conversions,
            }),
            { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
          );

          const sorted = [...data.campaigns].sort((a, b) => b.roas - a.roas);
          return {
            totals: {
              ...totals,
              ctr: ((totals.clicks / totals.impressions) * 100).toFixed(2) + "%",
              avgCpa: (totals.spend / totals.conversions).toFixed(2),
              blendedRoas: ((totals.conversions * 50) / totals.spend).toFixed(2),
            },
            topPerformer: sorted[0].name,
            underperformer: sorted[sorted.length - 1].name,
          };
        },
      },
      {
        id: "recommendations",
        description: "Generate actionable recommendations",
        action: async (ctx) => {
          const analysis = ctx.results.analyze as Record<string, unknown>;
          const totals = analysis.totals as Record<string, unknown>;
          return {
            recommendations: [
              `🏆 "${analysis.topPerformer}" is your strongest campaign — consider increasing budget by 20%.`,
              `⚠️ "${analysis.underperformer}" has the lowest ROAS — review keywords, ad copy, and landing page.`,
              Number(String(totals.avgCpa).replace("$", "")) > 50
                ? "💰 Average CPA is high. Test new ad copy variations and tighten audience targeting."
                : "✅ CPA is healthy. Focus on scaling top performers.",
              "📊 A/B test at least 3 ad variations per ad group for better performance.",
            ],
            summary: totals,
          };
        },
      },
    ],
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  META ADS WORKFLOWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  engine.register({
    name: "meta-ads-report",
    description: "Generate a Meta (Facebook/Instagram) Ads report — includes spend, CPM, CTR, and creative analysis",
    category: "Meta Ads",
    tags: ["ads", "meta", "facebook", "instagram"],
    inputs: {
      accountName: { type: "string", description: "Client account name", required: true },
      platform: { type: "string", description: "'facebook', 'instagram', or 'both'", default: "both" },
    },
    steps: [
      {
        id: "fetch_data",
        description: "Pull ad set data (connect to Meta Marketing API in production)",
        action: async (ctx) => ({
          account: ctx.inputs.accountName,
          adSets: [
            { name: "Lookalike — 1%", spend: 1500, impressions: 180000, clicks: 2700, leads: 45, cpm: 8.33, ctr: 1.5 },
            { name: "Interest — Homeowners", spend: 2200, impressions: 250000, clicks: 3500, leads: 38, cpm: 8.80, ctr: 1.4 },
            { name: "Retargeting — Website Visitors", spend: 600, impressions: 50000, clicks: 1200, leads: 28, cpm: 12.00, ctr: 2.4 },
            { name: "Broad — Advantage+", spend: 1800, impressions: 320000, clicks: 4100, leads: 52, cpm: 5.63, ctr: 1.28 },
          ],
        }),
      },
      {
        id: "analyze",
        description: "Identify top creatives and audience segments",
        action: async (ctx) => {
          const data = ctx.results.fetch_data as { adSets: Array<{ name: string; spend: number; leads: number; cpm: number; ctr: number }> };
          const best = [...data.adSets].sort((a, b) => (a.spend / a.leads) - (b.spend / b.leads));
          const totalSpend = data.adSets.reduce((s, a) => s + a.spend, 0);
          const totalLeads = data.adSets.reduce((s, a) => s + a.leads, 0);

          return {
            costPerLead: (totalSpend / totalLeads).toFixed(2),
            totalSpend,
            totalLeads,
            bestAudience: best[0].name,
            worstAudience: best[best.length - 1].name,
            recommendations: [
              `🎯 Best CPL: "${best[0].name}" at $${(best[0].spend / best[0].leads).toFixed(2)}/lead.`,
              `📈 Scale "${best[0].name}" — increase daily budget gradually (20% every 3 days).`,
              `🔄 Refresh creatives for "${best[best.length - 1].name}" — fatigue may be driving up costs.`,
              `💡 Test video creatives — they typically outperform static images by 20-30% on Meta.`,
            ],
          };
        },
      },
    ],
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  WORDPRESS WORKFLOWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  engine.register({
    name: "wp-content-brief",
    description: "Generate a content brief for a WordPress blog post — includes SEO guidelines, outline, and competitor analysis",
    category: "WordPress",
    tags: ["wordpress", "content", "seo"],
    inputs: {
      topic: { type: "string", description: "Blog post topic", required: true },
      targetKeyword: { type: "string", description: "Primary SEO keyword", required: true },
      wordCount: { type: "number", description: "Target word count", default: 1500 },
    },
    steps: [
      {
        id: "research",
        description: "Analyze competitors and SERP for the target keyword",
        action: async (ctx) => ({
          keyword: ctx.inputs.targetKeyword,
          avgCompetitorWordCount: 1800,
          topRankingTitles: [
            `Ultimate Guide to ${ctx.inputs.topic}`,
            `${ctx.inputs.topic}: Everything You Need to Know in 2025`,
            `How to ${ctx.inputs.topic} (Step-by-Step)`,
          ],
          commonSubtopics: ["Introduction", "Benefits", "How-to steps", "Common mistakes", "FAQ", "Conclusion"],
          suggestedInternalLinks: 3,
          suggestedExternalLinks: 5,
        }),
      },
      {
        id: "create_brief",
        description: "Assemble the content brief",
        action: async (ctx) => {
          const research = ctx.results.research as Record<string, unknown>;
          return {
            title: `${ctx.inputs.topic} — Complete Guide`,
            primaryKeyword: ctx.inputs.targetKeyword,
            wordCountTarget: ctx.inputs.wordCount,
            seoGuidelines: {
              titleFormat: "Include primary keyword in first 60 chars",
              metaDescription: `Write 150-160 chars including "${ctx.inputs.targetKeyword}"`,
              h1: "Match or closely reflect the title",
              h2s: research.commonSubtopics,
              keywordDensity: "1-2% for primary keyword",
              internalLinks: research.suggestedInternalLinks,
              externalLinks: research.suggestedExternalLinks,
            },
            outline: (research.commonSubtopics as string[]).map((topic, i) => ({
              section: `H2: ${topic}`,
              estimatedWords: Math.round(Number(ctx.inputs.wordCount ?? 1500) / 6),
              notes: i === 0 ? "Hook the reader with a stat or question" : undefined,
            })),
            competitorInsight: `Top results average ${research.avgCompetitorWordCount} words. Target at least that.`,
          };
        },
      },
    ],
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  GHL (GoHighLevel) WORKFLOWS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  engine.register({
    name: "ghl-lead-pipeline",
    description: "Analyze the GHL lead pipeline — stage counts, conversion rates, and follow-up recommendations",
    category: "GHL",
    tags: ["ghl", "leads", "crm", "automation"],
    inputs: {
      pipelineName: { type: "string", description: "Name of the GHL pipeline", required: true },
    },
    steps: [
      {
        id: "fetch_pipeline",
        description: "Pull pipeline data (connect to GHL API in production)",
        action: async (ctx) => ({
          pipeline: ctx.inputs.pipelineName,
          stages: [
            { name: "New Lead", count: 124, avgDaysInStage: 1.2 },
            { name: "Contacted", count: 89, avgDaysInStage: 3.4 },
            { name: "Qualified", count: 45, avgDaysInStage: 5.1 },
            { name: "Proposal Sent", count: 28, avgDaysInStage: 7.2 },
            { name: "Won", count: 12, avgDaysInStage: 0 },
            { name: "Lost", count: 18, avgDaysInStage: 0 },
          ],
        }),
      },
      {
        id: "analyze",
        description: "Calculate conversion rates between stages",
        action: async (ctx) => {
          const data = ctx.results.fetch_pipeline as {
            stages: Array<{ name: string; count: number; avgDaysInStage: number }>;
          };
          const stages = data.stages;
          const conversionRates = [];
          for (let i = 0; i < stages.length - 2; i++) {
            conversionRates.push({
              from: stages[i].name,
              to: stages[i + 1].name,
              rate: ((stages[i + 1].count / stages[i].count) * 100).toFixed(1) + "%",
            });
          }

          const totalLeads = stages[0].count;
          const won = stages.find((s) => s.name === "Won")?.count ?? 0;
          const lost = stages.find((s) => s.name === "Lost")?.count ?? 0;

          return {
            overallConversion: ((won / totalLeads) * 100).toFixed(1) + "%",
            winRate: ((won / (won + lost)) * 100).toFixed(1) + "%",
            conversionRates,
            bottleneck: conversionRates.reduce((worst, cr) =>
              parseFloat(cr.rate) < parseFloat(worst.rate) ? cr : worst
            ),
          };
        },
      },
      {
        id: "recommendations",
        description: "Generate follow-up and automation recommendations",
        action: async (ctx) => {
          const analysis = ctx.results.analyze as {
            bottleneck: { from: string; to: string; rate: string };
            overallConversion: string;
            winRate: string;
          };
          return {
            summary: `Pipeline conversion: ${analysis.overallConversion} | Win rate: ${analysis.winRate}`,
            bottleneck: `Biggest drop-off: ${analysis.bottleneck.from} → ${analysis.bottleneck.to} (${analysis.bottleneck.rate})`,
            actions: [
              `🔴 Focus on "${analysis.bottleneck.from}" → "${analysis.bottleneck.to}" transition — this is your biggest leak.`,
              "⚡ Set up a GHL automation: if lead is in 'Contacted' > 3 days, trigger SMS follow-up.",
              "📧 Create a 5-email nurture sequence for leads stuck in 'Qualified'.",
              "📞 Require a phone call attempt within 5 min of new lead — speed-to-lead matters.",
              "🏷️ Tag all lost leads with a reason and review monthly for patterns.",
            ],
          };
        },
      },
    ],
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CLIENT REPORTING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  engine.register({
    name: "client-monthly-report",
    description: "Generate a monthly client report combining SEO, Ads, and web metrics",
    category: "Reporting",
    tags: ["reporting", "client", "monthly"],
    inputs: {
      clientName: { type: "string", description: "Client name", required: true },
      month: { type: "string", description: "Report month (e.g., 'January 2025')", required: true },
      services: { type: "array", description: "Services: ['seo', 'google_ads', 'meta_ads', 'web']", required: true },
    },
    steps: [
      {
        id: "gather_metrics",
        description: "Collect metrics for each active service",
        action: async (ctx) => {
          const services = ctx.inputs.services as string[];
          const metrics: Record<string, unknown> = {};

          if (services.includes("seo")) {
            metrics.seo = {
              organicSessions: 12450,
              organicSessionsChange: "+18%",
              keywordsInTop10: 34,
              keywordsChange: "+6",
              backlinksAcquired: 8,
              topMovers: [
                { keyword: "best plumber near me", from: 15, to: 7 },
                { keyword: "emergency plumbing service", from: 22, to: 11 },
              ],
            };
          }

          if (services.includes("google_ads")) {
            metrics.googleAds = { spend: 4500, conversions: 89, cpa: 50.56, roas: 3.2, ctr: "4.2%" };
          }

          if (services.includes("meta_ads")) {
            metrics.metaAds = { spend: 3200, leads: 67, costPerLead: 47.76, reach: 185000, ctr: "1.8%" };
          }

          if (services.includes("web")) {
            metrics.web = { sessions: 18200, bounceRate: "42%", avgSessionDuration: "2:34", pageviews: 45000, topPages: ["/", "/services", "/contact"] };
          }

          return metrics;
        },
      },
      {
        id: "format_report",
        description: "Format into a client-friendly report",
        action: async (ctx) => {
          const metrics = ctx.results.gather_metrics as Record<string, unknown>;
          return {
            header: `Monthly Report — ${ctx.inputs.clientName} — ${ctx.inputs.month}`,
            sections: Object.entries(metrics).map(([service, data]) => ({
              service: service.replace("_", " ").toUpperCase(),
              data,
            })),
            executiveSummary: `This month, we continued to drive growth across your active channels. See detailed metrics below.`,
          };
        },
      },
    ],
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CONTENT FACTORY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  engine.register({
    name: "content-factory",
    description: "Generate batches of website content (pages, blog posts) for a client using their brand profile, then save as Google Docs",
    category: "Content",
    tags: ["content", "website", "copywriting", "google-docs"],
    inputs: {
      clientSlug: { type: "string", description: "Client slug (e.g. 'elevated-chiropractic')", required: true },
      contentTypes: { type: "string", description: "Comma-separated content types: website-page, blog-post, gbp-post (default: website-page)", default: "website-page" },
      dryRun: { type: "boolean", description: "If true, returns the plan without generating content", default: false },
    },
    steps: [
      {
        id: "load_client",
        description: "Load client configuration and content profile",
        action: async (ctx) => {
          const slug = String(ctx.inputs.clientSlug);
          const config = loadClientConfig(slug);
          if (!config) throw new Error(`Client not found: ${slug}`);

          const profile = config.contentProfile;
          if (!profile) throw new Error(`No contentProfile found in client config: ${slug}`);

          return {
            slug,
            name: config.name,
            hasProfile: true,
            outputFolder: config.outputFolder || null,
          };
        },
      },
      {
        id: "build_plan",
        description: "Generate the content plan — list of all pages to create",
        action: async (ctx) => {
          const slug = String(ctx.inputs.clientSlug);
          const config = loadClientConfig(slug)!;
          const profile = config.contentProfile!;
          const typesStr = String(ctx.inputs.contentTypes || "website-page");
          const contentTypes = typesStr.split(",").map(t => t.trim()) as ContentType[];

          const plan = buildContentPlan(profile, config.name, contentTypes);
          return {
            totalPages: plan.length,
            pages: plan.map(p => ({ id: p.id, title: p.title, slug: p.slug, type: p.type })),
          };
        },
      },
      {
        id: "generate_content",
        description: "Generate all content pages and save as Google Docs",
        action: async (ctx) => {
          const dryRun = ctx.inputs.dryRun === true || ctx.inputs.dryRun === "true";
          if (dryRun) {
            return {
              dryRun: true,
              message: "Dry run — content plan generated but no pages were created. Review the plan in the previous step.",
              plan: ctx.results.build_plan,
            };
          }

          const slug = String(ctx.inputs.clientSlug);
          const typesStr = String(ctx.inputs.contentTypes || "website-page");
          const contentTypes = typesStr.split(",").map(t => t.trim()) as ContentType[];

          const result = await runContentFactory({
            clientSlug: slug,
            contentTypes,
          });

          return result;
        },
      },
      {
        id: "create_tracking",
        description: "Summarize the results",
        action: async (ctx) => {
          const gen = ctx.results.generate_content as Record<string, unknown>;
          if (gen.dryRun) {
            return { summary: "Dry run completed. No content was generated.", plan: gen.plan };
          }

          return {
            summary: `Content factory complete: ${gen.completedPages}/${gen.totalPages} pages generated.${gen.failedPages ? ` ${gen.failedPages} failed.` : ""}`,
            runId: gen.runId,
            folderUrl: gen.folderUrl || "No Drive folder (Drive not connected)",
            pages: (gen.pages as Array<Record<string, unknown>>)?.map(p => ({
              title: p.title,
              status: p.status,
              url: p.docUrl || null,
            })),
          };
        },
      },
    ],
  });
}
