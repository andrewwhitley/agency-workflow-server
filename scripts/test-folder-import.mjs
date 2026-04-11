import "dotenv/config";
import { query } from "../build/database.js";
import { importFromFolder } from "../build/folder-importer.js";

async function main() {
  // Create "Soleil Test" client
  const { rows: existing } = await query("SELECT id FROM cm_clients WHERE slug = 'soleil-test'");
  let clientId;
  if (existing[0]) {
    clientId = existing[0].id;
    console.log("Reusing Soleil Test client id:", clientId);
  } else {
    const { rows } = await query(
      "INSERT INTO cm_clients (slug, company_name, status) VALUES ('soleil-test', 'Soleil Test', 'active') RETURNING id"
    );
    clientId = rows[0].id;
    console.log("Created Soleil Test client id:", clientId);
  }

  const folderPath = "/home/andrewwhitley/agency-workflow-server/images and screenshots/Soleil Company info";

  console.log("\nStarting folder import...");
  console.log("This will take 30-60 seconds (Claude extraction)...\n");

  const result = await importFromFolder(clientId, folderPath);

  console.log("\n═══════════════════════════════════════");
  console.log("  FOLDER IMPORT RESULTS");
  console.log("═══════════════════════════════════════");
  console.log(`Files processed: ${result.filesProcessed.length}`);
  result.filesProcessed.forEach((f) => console.log(`  - ${f}`));
  console.log(`Total text: ${result.totalTextLength.toLocaleString()} chars`);
  console.log(`Tables updated: ${result.tablesUpdated.length}`);
  result.tablesUpdated.forEach((t) => console.log(`  ✓ ${t}`));
  if (result.warnings.length > 0) {
    console.log("Warnings:");
    result.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  // Verify what got created
  console.log("\n── Verification ──");
  const { rows: client } = await query("SELECT company_name, legal_name, industry, location, company_background FROM cm_clients WHERE id = $1", [clientId]);
  if (client[0]) {
    console.log(`Company: ${client[0].company_name}`);
    console.log(`Legal: ${client[0].legal_name}`);
    console.log(`Industry: ${client[0].industry}`);
    console.log(`Location: ${client[0].location}`);
    console.log(`Background: ${(client[0].company_background || "").slice(0, 100)}...`);
  }

  const { rows: services } = await query("SELECT service_name, category, tier FROM cm_services WHERE client_id = $1 ORDER BY sort_order", [clientId]);
  console.log(`\nServices: ${services.length}`);
  services.slice(0, 10).forEach((s) => console.log(`  [${s.tier}/${s.category}] ${s.service_name}`));
  if (services.length > 10) console.log(`  ... +${services.length - 10} more`);

  const { rows: contacts } = await query("SELECT full_name, role, credentials FROM cm_team_members WHERE client_id = $1", [clientId]);
  console.log(`\nTeam Members: ${contacts.length}`);
  contacts.forEach((c) => console.log(`  ${c.full_name} — ${c.role} ${c.credentials || ""}`));

  const { rows: competitors } = await query("SELECT company_name, url FROM cm_competitors WHERE client_id = $1", [clientId]);
  console.log(`\nCompetitors: ${competitors.length}`);
  competitors.forEach((c) => console.log(`  ${c.company_name} (${c.url})`));

  const { rows: personas } = await query("SELECT persona_name, pain_points FROM cm_buyer_personas WHERE client_id = $1", [clientId]);
  console.log(`\nBuyer Personas: ${personas.length}`);
  personas.forEach((p) => console.log(`  ${p.persona_name}: ${(p.pain_points || "").slice(0, 80)}`));

  const { rows: guide } = await query("SELECT brand_voice, tone, brand_colors FROM cm_content_guidelines WHERE client_id = $1", [clientId]);
  if (guide[0]) {
    console.log(`\nBrand Voice: ${(guide[0].brand_voice || "").slice(0, 80)}`);
    console.log(`Tone: ${(guide[0].tone || "").slice(0, 80)}`);
    console.log(`Colors: ${guide[0].brand_colors}`);
  }

  // Count campaigns extracted
  const campaigns = result.extracted.campaigns || [];
  console.log(`\nCampaigns extracted: ${campaigns.length}`);
  campaigns.forEach((c) => console.log(`  ${c.name} (${c.platform || c.type})`));

  process.exit(0);
}

main().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
