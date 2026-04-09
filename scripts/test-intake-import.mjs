import "dotenv/config";
import { query } from "../build/database.js";
import { importIntakeTemplate } from "../build/intake-importer.js";
import fs from "fs";

async function main() {
  const { rows: existing } = await query("SELECT id FROM cm_clients WHERE slug = 'test-intake-import'");
  let clientId;
  if (existing[0]) {
    clientId = existing[0].id;
  } else {
    const { rows } = await query(
      "INSERT INTO cm_clients (slug, company_name, status) VALUES ('test-intake-import', 'Test Intake Import', 'active') RETURNING id"
    );
    clientId = rows[0].id;
  }
  console.log("Using clientId:", clientId);

  // Wipe previous import data
  await query("DELETE FROM cm_contacts WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_competitors WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_buyer_personas WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_testimonials WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_appointment_types WHERE client_id = $1", [clientId]);
  await query("DELETE FROM cm_services WHERE client_id = $1 AND source = 'intake_import'", [clientId]);
  await query("DELETE FROM cm_ai_bot_config WHERE client_id = $1", [clientId]);
  await query("UPDATE cm_clients SET access_checklist = '{}'::jsonb, social_links = '{}'::jsonb WHERE id = $1", [clientId]);

  const buf = fs.readFileSync("/home/andrewwhitley/agency-workflow-server/images and screenshots/Company Info _ Intake Template V.2.2 - 02_12_2026 (1).xlsx");
  const result = await importIntakeTemplate(clientId, buf);

  console.log("\nImport result:");
  console.log("  Fields imported:", result.fieldsImported);
  console.log("  Warnings:", result.warnings);

  const { rows: contacts } = await query("SELECT name FROM cm_contacts WHERE client_id = $1", [clientId]);
  const { rows: competitors } = await query("SELECT company_name FROM cm_competitors WHERE client_id = $1", [clientId]);
  const { rows: personas } = await query("SELECT persona_name FROM cm_buyer_personas WHERE client_id = $1", [clientId]);
  const { rows: testimonials } = await query("SELECT author FROM cm_testimonials WHERE client_id = $1", [clientId]);
  const { rows: services } = await query("SELECT service_name FROM cm_services WHERE client_id = $1", [clientId]);
  const { rows: appts } = await query("SELECT name FROM cm_appointment_types WHERE client_id = $1", [clientId]);
  const { rows: bot } = await query("SELECT * FROM cm_ai_bot_config WHERE client_id = $1", [clientId]);
  const { rows: c } = await query("SELECT access_checklist, social_links, mission_statement, what_makes_us_unique FROM cm_clients WHERE id = $1", [clientId]);

  console.log("\nResults from BLANK template (everything should be empty):");
  console.log("  Contacts:", contacts.length, contacts.map(r => r.name));
  console.log("  Competitors:", competitors.length, competitors.map(r => r.company_name));
  console.log("  Personas:", personas.length);
  console.log("  Testimonials:", testimonials.length);
  console.log("  Services:", services.length);
  console.log("  Appointments:", appts.length);
  console.log("  AI Bot configs:", bot.length);
  console.log("  Access checklist:", JSON.stringify(c[0].access_checklist));
  console.log("  Social links:", JSON.stringify(c[0].social_links));
  console.log("  Mission statement:", c[0].mission_statement);
  console.log("  What makes us unique:", c[0].what_makes_us_unique);

  process.exit(0);
}

main().catch((e) => { console.error("ERROR:", e.message); console.error(e.stack); process.exit(1); });
