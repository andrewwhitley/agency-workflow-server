#!/usr/bin/env node
/**
 * Re-score all enriched prospects using provider-based revenue estimates
 * instead of Coldlytics revenue data.
 *
 * Revenue per provider estimates (sourced from industry data, Mar 2026):
 * - Chiropractic: $300K (ChiroEco 2024 survey: $507K avg collections, conservative for smaller practices)
 * - Concierge medicine: $600K (100 patients × $500/mo avg membership)
 * - Concierge-adjacent (DPC/blank in concierge tab): $300K
 * - Functional/integrative/wellness/holistic/naturopathic/anti-aging: $250K (cash-pay, lower volume)
 *
 * Usage: node scripts/rescore-prospects.mjs [--dry-run]
 */

import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const DRY_RUN = process.argv.includes("--dry-run");

// Revenue per provider by specialty
const REV_PER_PROVIDER = {
  chiropractic: 300000,
  concierge_medicine: 600000,
};
const REV_DEFAULT_FM = 250000;
const REV_DEFAULT_CM = 300000;

function estimateRevenue(prospect) {
  const pc = prospect.provider_count;
  if (!pc || pc <= 0) return null;

  const specialty = prospect.specialty || "";
  const isConciergeTab = (prospect.source_tab || "").includes("Concierge");

  let perProvider;
  if (REV_PER_PROVIDER[specialty]) {
    perProvider = REV_PER_PROVIDER[specialty];
  } else if (isConciergeTab) {
    perProvider = REV_DEFAULT_CM;
  } else {
    perProvider = REV_DEFAULT_FM;
  }

  return pc * perProvider;
}

function calculateScores(p, estRevenue) {
  const scores = {};
  const angles = [];

  // ── Size (max 40) ──
  // Use our estimated revenue (provider-based) instead of Coldlytics
  let revScore = 0;
  if (estRevenue) {
    if (estRevenue >= 1000000) revScore = 40;
    else if (estRevenue >= 500000) revScore = 30;
    else if (estRevenue >= 250000) revScore = 20;
    else if (estRevenue > 0) revScore = 10;
  }

  let provScore = 0;
  const pc = p.provider_count || 0;
  if (pc >= 5) provScore = 40;
  else if (pc >= 3) provScore = 30;
  else if (pc >= 2) provScore = 20;
  else if (pc >= 1) provScore = 10;

  let empScore = 0;
  const empNum = parseInt((p.employee_count || "").replace(/[^0-9]/g, "")) || 0;
  if (empNum >= 20) empScore = 35;
  else if (empNum >= 10) empScore = 25;
  else if (empNum >= 5) empScore = 15;
  else if (empNum >= 2) empScore = 8;

  // If we have NO provider data and NO employee data, fall back to Coldlytics revenue
  // but cap it at 20 (not full 40) since we know $3M is unreliable
  if (pc <= 0 && empNum <= 0 && revScore === 0) {
    const coldRaw = (p.revenue_range || "").replace(/[^0-9.]/g, "");
    const coldNum = coldRaw ? parseFloat(coldRaw) : 0;
    const coldNorm = coldNum < 1000 ? coldNum * 1000000 : coldNum;
    if (coldNorm >= 1000000) revScore = 20;       // cap at 20 — unverified
    else if (coldNorm >= 500000) revScore = 15;
    else if (coldNorm >= 250000) revScore = 10;
    else if (coldNorm > 0) revScore = 5;
  }

  scores.size = Math.min(40, Math.max(revScore, provScore, empScore));

  // ── Website (max 15) ──
  let websiteScore = 0;
  const platform = (p.website_platform || "").toLowerCase();
  if (!platform || platform === "wix" || platform === "squarespace" || platform === "google sites" || platform === "godaddy" || platform === "weebly") {
    websiteScore += 7;
    angles.push("Website redesign opportunity — weak or outdated platform");
  } else if (platform === "wordpress") {
    websiteScore += 2;
  }
  const qualityScore = p.website_quality_score ?? p.onpage_score ?? null;
  if (qualityScore !== null) {
    if (qualityScore < 40) { websiteScore += 5; angles.push("Low website quality score"); }
    else if (qualityScore < 60) websiteScore += 3;
    else if (qualityScore < 80) websiteScore += 1;
  }
  const loadTime = p.website_load_time ?? null;
  if (loadTime !== null && loadTime > 4) websiteScore += 3;
  scores.website = Math.min(15, websiteScore);

  // ── SEO (max 20) ──
  let seoScore = 0;
  const traffic = p.organic_traffic ?? null;
  if (traffic !== null) {
    if (traffic < 100) { seoScore += 8; angles.push("Virtually invisible in search — massive SEO upside"); }
    else if (traffic < 500) { seoScore += 5; angles.push("Low organic traffic — room to grow significantly"); }
    else if (traffic < 2000) seoScore += 3;
  } else {
    seoScore += 4;
  }
  const rankings = p.page1_rankings;
  const rankingCount = Array.isArray(rankings) ? rankings.length : 0;
  if (rankingCount === 0) seoScore += 8;
  else if (rankingCount < 5) seoScore += 5;
  else if (rankingCount < 15) seoScore += 2;
  const domainRank = p.domain_rank || 0;
  if (domainRank < 10) seoScore += 4;
  else if (domainRank < 30) seoScore += 2;
  scores.seo = Math.min(20, seoScore);

  // ── Ads (max 10) ──
  let adsScore = 0;
  if (p.has_fb_pixel && p.has_google_pixel) {
    adsScore += 10;
    angles.push("Running both FB + Google ads — active growth investment");
  } else if (p.has_fb_pixel || p.has_google_pixel) {
    adsScore += 6;
    angles.push("Running paid ads on one channel");
  }
  scores.ads = Math.min(10, adsScore);

  // ── Established/Reputation (max 10) ──
  let establishedScore = 0;
  const reviewCount = p.gbp_review_count || 0;
  const rating = p.gbp_rating || 0;
  if (reviewCount >= 100 && rating >= 4.5) establishedScore = 10;
  else if (reviewCount >= 50 && rating >= 4.0) establishedScore = 7;
  else if (reviewCount >= 20) establishedScore = 5;
  else if (reviewCount >= 5) establishedScore = 2;
  scores.established = establishedScore;

  // ── Contact (max 5) ──
  let contactScore = 0;
  if (p.contact_email) contactScore += 2;
  if (p.contact_phone) contactScore += 2;
  if (p.contact_linkedin) contactScore += 1;
  scores.contact = Math.min(5, contactScore);

  const total = scores.size + scores.website + scores.seo + scores.ads + scores.established + scores.contact;
  let tier;
  if (total >= 70) tier = "dream";
  else if (total >= 50) tier = "good";
  else if (total >= 30) tier = "maybe";
  else tier = "unqualified";

  return { pillar_scores: scores, total_score: total, qualification_tier: tier, sales_angles: angles.slice(0, 4) };
}

async function main() {
  const { rows } = await pool.query(
    "SELECT * FROM enrichment_prospects WHERE enrichment_status = 'completed' ORDER BY total_score DESC"
  );
  console.log(`Re-scoring ${rows.length} prospects${DRY_RUN ? " (DRY RUN)" : ""}...`);

  // Track before/after
  const tiersBefore = { dream: 0, good: 0, maybe: 0, unqualified: 0 };
  const tiersAfter = { dream: 0, good: 0, maybe: 0, unqualified: 0 };
  let changed = 0;

  for (const p of rows) {
    tiersBefore[p.qualification_tier]++;

    const estRev = estimateRevenue(p);
    const scoring = calculateScores(p, estRev);
    tiersAfter[scoring.qualification_tier]++;

    if (scoring.total_score !== p.total_score || scoring.qualification_tier !== p.qualification_tier) {
      changed++;
    }

    if (!DRY_RUN) {
      await pool.query(`
        UPDATE enrichment_prospects
        SET pillar_scores = $2, total_score = $3, qualification_tier = $4, sales_angles = $5,
            estimated_revenue = $6, updated_at = NOW()
        WHERE id = $1
      `, [
        p.id,
        JSON.stringify(scoring.pillar_scores),
        scoring.total_score,
        scoring.qualification_tier,
        JSON.stringify(scoring.sales_angles),
        estRev,
      ]);
    }
  }

  console.log(`\n${changed} prospects changed score/tier`);
  console.log("\nBefore:");
  for (const [t, c] of Object.entries(tiersBefore)) console.log(`  ${t}: ${c}`);
  console.log("\nAfter:");
  for (const [t, c] of Object.entries(tiersAfter)) console.log(`  ${t}: ${c}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
