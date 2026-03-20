#!/usr/bin/env node
/**
 * Backfill provider counts, services, and staff from website HTML via Claude Haiku.
 * Targets already-enriched prospects missing provider_count.
 *
 * Usage: node scripts/backfill-providers.mjs [--max 100] [--concurrency 3] [--cost-cap 20] [--dry-run]
 */

import "dotenv/config";
import pg from "pg";
import Anthropic from "@anthropic-ai/sdk";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const claude = new Anthropic();

const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const MAX = parseInt(getArg("--max") || "0") || 0; // 0 = all
const CONCURRENCY = parseInt(getArg("--concurrency") || "3");
const COST_CAP = parseFloat(getArg("--cost-cap") || "20");
const DRY_RUN = args.includes("--dry-run");

// Team/about page URL patterns to look for in homepage links
const TEAM_PAGE_PATTERNS = [
  /\/(meet[_-]?(the[_-]?)?team|our[_-]?team|the[_-]?team|staff|providers|practitioners|doctors|clinicians|about[_-]?us|about|who[_-]?we[_-]?are|our[_-]?doctors|our[_-]?providers|our[_-]?staff|our[_-]?practitioners|team[_-]?members|our[_-]?chiropractors)/i,
];

async function fetchPage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(url, {
      signal: controller.signal, redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyBot/1.0)" },
    });
    clearTimeout(timeout);
    return resp.ok ? await resp.text() : "";
  } catch { return ""; }
}

// Strip scripts, styles, nav, footer, SVGs to get just content text
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findTeamPageUrl(html, baseUrl) {
  // Extract all href values
  const linkRegex = /href=["']([^"']+)["']/gi;
  const links = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    links.push(match[1]);
  }

  // Deduplicate
  const seen = new Set();
  const unique = links.filter(l => { const key = l.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });

  // Score each link — more specific patterns score higher
  const scored = [];
  for (const href of unique) {
    try {
      const full = new URL(href, baseUrl).href;
      // Must be same domain
      if (new URL(full).hostname !== new URL(baseUrl).hostname) continue;

      const path = new URL(full).pathname.toLowerCase();
      // Skip non-page links
      if (path.match(/\.(jpg|png|gif|svg|css|js|pdf|zip)$/i)) continue;

      let score = 0;
      if (path.match(/meet[_-]?(the[_-]?)?team/i)) score = 10;
      else if (path.match(/our[_-]?(team|doctors|providers|practitioners|staff|chiropractors)/i)) score = 9;
      else if (path.match(/\/(team|providers|practitioners|doctors|staff|clinicians)\b/i)) score = 8;
      else if (path.match(/about[_-]?us.*team|team.*about/i)) score = 7;
      else if (path.match(/about[_-]?us|about\b|who[_-]?we[_-]?are/i)) score = 5;

      if (score > 0) scored.push({ url: full, score });
    } catch { /* invalid URL */ }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.url || null;
}

async function fetchHtmlWithTeamPage(websiteUrl) {
  const baseUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
  const homepage = await fetchPage(baseUrl);
  if (!homepage) return { homepage: "", teamPage: "" };

  const teamUrl = findTeamPageUrl(homepage, baseUrl);
  let teamPage = "";
  if (teamUrl) {
    teamPage = await fetchPage(teamUrl);
  }

  return { homepage, teamPage };
}

async function analyzeWithClaude(prospect, homepage, teamPage) {
  // Strip HTML tags to get just text content — fits much more in the token budget
  const homeText = stripHtml(homepage);
  const teamText = teamPage ? stripHtml(teamPage) : "";

  let content = "";
  if (teamText) {
    const trimmedTeam = teamText.length > 8000 ? teamText.slice(0, 8000) : teamText;
    const trimmedHome = homeText.length > 4000 ? homeText.slice(0, 4000) : homeText;
    content = `HOMEPAGE TEXT:\n${trimmedHome}\n\nTEAM/ABOUT PAGE TEXT:\n${trimmedTeam}`;
  } else {
    content = homeText.length > 10000 ? homeText.slice(0, 10000) : homeText;
  }

  const msg = await claude.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [{
      role: "user",
      content: `Analyze this medical practice website HTML. Return ONLY valid JSON with these fields:
- provider_count: number of doctors/providers/practitioners (NPs, PAs, DOs, MDs, DCs count). null if you cannot determine.
- provider_names: array of provider names found (empty array if none)
- total_staff: estimated total staff if determinable, null if unknown
- top_services: array of up to 8 main services offered (e.g. "Hormone Therapy", "IV Therapy", "Functional Medicine")

Practice: ${prospect.company_name}, ${prospect.city}, ${prospect.state}
${content}`,
    }],
  });
  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// Scoring function (simplified — mirrors enrichment-service.ts calculateScores)
function recalcScore(prospect, updates) {
  const merged = { ...prospect, ...updates };

  // Size score (max 40)
  const revRaw = (merged.estimated_revenue || merged.revenue_range || "").replace(/[^0-9.]/g, "");
  const revNum = revRaw ? parseFloat(revRaw) : 0;
  const revNormalized = revNum < 1000 ? revNum * 1000000 : revNum;
  let revScore = 0;
  if (revNormalized >= 1000000) revScore = 40;
  else if (revNormalized >= 500000) revScore = 30;
  else if (revNormalized >= 250000) revScore = 20;
  else if (revNormalized > 0) revScore = 10;

  let provScore = 0;
  const pc = merged.provider_count || 0;
  if (pc >= 5) provScore = 40;
  else if (pc >= 3) provScore = 30;
  else if (pc >= 2) provScore = 20;
  else if (pc >= 1) provScore = 10;

  let empScore = 0;
  const empNum = parseInt((merged.employee_count || "").replace(/[^0-9]/g, "")) || 0;
  if (empNum >= 20) empScore = 35;
  else if (empNum >= 10) empScore = 25;
  else if (empNum >= 5) empScore = 15;
  else if (empNum >= 2) empScore = 8;

  const sizeScore = Math.min(40, Math.max(revScore, provScore, empScore));

  // Just return updated size score — keep other pillar scores as-is
  const existing = typeof merged.pillar_scores === "string" ? JSON.parse(merged.pillar_scores) : (merged.pillar_scores || {});
  existing.size = sizeScore;
  const total = Object.values(existing).reduce((a, b) => a + b, 0);
  const tier = total >= 70 ? "dream" : total >= 50 ? "good" : total >= 30 ? "maybe" : "unqualified";
  return { pillar_scores: existing, total_score: total, qualification_tier: tier };
}

async function markSkipped(id) {
  // Set provider_count to -1 as a "checked but unknown" sentinel so we don't re-process
  await pool.query("UPDATE enrichment_prospects SET provider_count = -1, updated_at = NOW() WHERE id = $1", [id]);
}

async function processProspect(prospect) {
  const { homepage, teamPage } = await fetchHtmlWithTeamPage(prospect.website);
  if (!homepage) {
    if (!DRY_RUN) await markSkipped(prospect.id);
    return { status: "skipped", reason: "no html" };
  }

  const parsed = await analyzeWithClaude(prospect, homepage, teamPage);
  if (!parsed) {
    if (!DRY_RUN) await markSkipped(prospect.id);
    return { status: "skipped", reason: "no json" };
  }

  // Only set provider_count if Claude actually found providers; otherwise mark as checked-but-unknown
  const updates = {};
  if (parsed.provider_count && parsed.provider_count > 0) {
    updates.provider_count = parsed.provider_count;
  } else {
    updates.provider_count = -1; // sentinel: checked but unknown
  }
  if (parsed.total_staff > 0) updates.total_staff = parsed.total_staff;
  if (Array.isArray(parsed.top_services) && parsed.top_services.length > 0) updates.top_services = JSON.stringify(parsed.top_services);
  if (Array.isArray(parsed.provider_names) && parsed.provider_names.length > 0) updates.provider_details = JSON.stringify(parsed.provider_names);

  const hasUsefulData = updates.provider_count > 0 || updates.total_staff || updates.top_services || updates.provider_details;

  // Re-score
  const scoring = recalcScore(prospect, updates);
  updates.pillar_scores = JSON.stringify(scoring.pillar_scores);
  updates.total_score = scoring.total_score;
  updates.qualification_tier = scoring.qualification_tier;

  if (!DRY_RUN) {
    const setClauses = [];
    const values = [prospect.id];
    let idx = 2;
    for (const [key, val] of Object.entries(updates)) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
    setClauses.push("updated_at = NOW()");
    await pool.query(`UPDATE enrichment_prospects SET ${setClauses.join(", ")} WHERE id = $1`, values);
  }

  return {
    status: hasUsefulData ? "success" : "skipped",
    reason: hasUsefulData ? undefined : "no data found",
    providers: parsed.provider_count || 0,
    services: parsed.top_services?.length || 0,
  };
}

async function main() {
  // Count eligible
  const { rows: [{ count }] } = await pool.query(
    "SELECT COUNT(*)::int as count FROM enrichment_prospects WHERE enrichment_status = 'completed' AND provider_count IS NULL AND website_status = 'live' AND qualification_tier IN ('dream', 'good')"
  );
  const total = MAX > 0 ? Math.min(MAX, count) : count;
  console.log(`Backfill: ${count} eligible, processing ${total}${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log(`Concurrency: ${CONCURRENCY}, Cost cap: $${COST_CAP}`);

  let processed = 0, succeeded = 0, failed = 0, skipped = 0, cost = 0;

  while (processed < total) {
    if (cost >= COST_CAP) {
      console.log(`\nCost cap reached: $${cost.toFixed(2)}`);
      break;
    }

    const batchSize = Math.min(CONCURRENCY, total - processed);
    const { rows: batch } = await pool.query(`
      SELECT * FROM enrichment_prospects
      WHERE enrichment_status = 'completed' AND provider_count IS NULL AND website_status = 'live' AND qualification_tier IN ('dream', 'good')
      ORDER BY total_score DESC
      LIMIT $1
    `, [batchSize]);

    if (batch.length === 0) break;

    const results = await Promise.allSettled(batch.map(p => processProspect(p)));

    for (let i = 0; i < results.length; i++) {
      processed++;
      cost += 0.01;
      const r = results[i];
      if (r.status === "fulfilled") {
        if (r.value.status === "success") {
          succeeded++;
          process.stdout.write(`\r  ${processed}/${total} | ✓${succeeded} skip${skipped} fail${failed} | $${cost.toFixed(2)} | ${batch[i].company_name} → ${r.value.providers} providers, ${r.value.services} services`);
        } else {
          skipped++;
          process.stdout.write(`\r  ${processed}/${total} | ✓${succeeded} skip${skipped} fail${failed} | $${cost.toFixed(2)} | ${batch[i].company_name} → ${r.value.reason}`);
        }
      } else {
        failed++;
        process.stdout.write(`\r  ${processed}/${total} | ✓${succeeded} skip${skipped} fail${failed} | $${cost.toFixed(2)} | ${batch[i].company_name} → ERROR`);
        console.error(`\n  Error: ${r.reason}`);
      }
    }

    // Brief pause between batches
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n\nDone! Processed: ${processed}, Succeeded: ${succeeded}, Skipped: ${skipped}, Failed: ${failed}, Cost: ~$${cost.toFixed(2)}`);

  // Convert -1 sentinels back to NULL (blank in exports)
  const { rowCount: cleaned } = await pool.query("UPDATE enrichment_prospects SET provider_count = NULL WHERE provider_count = -1");
  console.log(`\nCleaned ${cleaned} unknown provider counts back to NULL`);

  // Show updated tier distribution
  const { rows: tiers } = await pool.query(
    "SELECT qualification_tier, COUNT(*)::int as count FROM enrichment_prospects WHERE enrichment_status = 'completed' GROUP BY qualification_tier ORDER BY count DESC"
  );
  console.log("\nUpdated tier distribution:");
  for (const t of tiers) console.log(`  ${t.qualification_tier}: ${t.count}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
