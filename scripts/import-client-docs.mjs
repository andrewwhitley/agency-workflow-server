#!/usr/bin/env node
/**
 * CLI tool: Import client data from Google Docs/Sheets
 *
 * Usage:
 *   node scripts/import-client-docs.mjs --client <slug> --docs "docId1,docId2,docId3"
 *   node scripts/import-client-docs.mjs --client-id <id> --docs "docId1,docId2"
 *
 * Options:
 *   --client <slug>      Client slug (e.g., "soleil-holistic")
 *   --client-id <id>     Client ID (numeric)
 *   --docs <ids>         Comma-separated Google Doc/Sheet IDs or URLs
 *   --no-enrich          Skip web enrichment
 *   --no-story           Skip brand story generation
 *   --dry-run            Show what would be extracted without writing to DB
 */

import { config } from "dotenv";
config();

// Dynamic import of built modules
const { importClientData, getClientIdBySlug } = await import("../build/client-import.js");
const { GoogleAuthService } = await import("../build/google-auth.js");
const { GoogleDriveService } = await import("../build/google-drive.js");
const { runMigrations } = await import("../build/database.js");

function usage() {
  console.log(`
Usage:
  node scripts/import-client-docs.mjs --client <slug> --docs "docId1,docId2,..."

Options:
  --client <slug>      Client slug (e.g., "soleil-holistic")
  --client-id <id>     Client ID (numeric)
  --docs <ids>         Comma-separated Google Doc/Sheet IDs or URLs
  --no-enrich          Skip web enrichment step
  --no-story           Skip brand story generation
  `);
  process.exit(1);
}

// Parse args
const args = process.argv.slice(2);
let clientSlug = null;
let clientId = null;
let docIds = null;
let enrichFromWeb = true;
let generateStory = true;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--client":
      clientSlug = args[++i];
      break;
    case "--client-id":
      clientId = parseInt(args[++i]);
      break;
    case "--docs":
      docIds = args[++i]?.split(",").map((s) => s.trim()).filter(Boolean);
      break;
    case "--no-enrich":
      enrichFromWeb = false;
      break;
    case "--no-story":
      generateStory = false;
      break;
    case "--help":
    case "-h":
      usage();
      break;
  }
}

if (!docIds || docIds.length === 0) {
  console.error("Error: --docs is required");
  usage();
}

if (!clientSlug && !clientId) {
  console.error("Error: --client or --client-id is required");
  usage();
}

// Run
try {
  console.log("Running database migrations...");
  await runMigrations();

  // Resolve client ID from slug if needed
  if (clientSlug && !clientId) {
    clientId = await getClientIdBySlug(clientSlug);
    if (!clientId) {
      console.error(`Error: Client with slug "${clientSlug}" not found`);
      process.exit(1);
    }
    console.log(`Resolved client "${clientSlug}" to ID ${clientId}`);
  }

  // Initialize Google Drive
  const authService = new GoogleAuthService();
  if (!authService.isAuthenticated()) {
    console.error("Error: Google service account not configured. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_JSON.");
    process.exit(1);
  }
  const driveService = new GoogleDriveService(authService.getClient());

  console.log(`\nImporting ${docIds.length} documents for client ID ${clientId}...`);
  console.log(`  Documents: ${docIds.join(", ")}`);
  console.log(`  Web enrichment: ${enrichFromWeb ? "yes" : "no"}`);
  console.log(`  Brand story: ${generateStory ? "yes" : "no"}`);
  console.log("");

  const result = await importClientData(clientId, docIds, driveService, {
    generateStory,
    enrichFromWeb,
  });

  console.log("\n═══════════════════════════════════════");
  console.log("  IMPORT COMPLETE");
  console.log("═══════════════════════════════════════");
  console.log(`  Documents read:    ${result.summary.documentsRead}`);
  console.log(`  Fields extracted:  ${result.summary.fieldsExtracted}`);
  console.log(`  Fields enriched:   ${result.summary.fieldsEnriched}`);
  console.log(`  Brand story:       ${result.summary.brandStoryGenerated ? "generated" : "skipped"}`);

  if (Object.keys(result.summary.entitiesCreated).length > 0) {
    console.log("  Entities created:");
    for (const [entity, count] of Object.entries(result.summary.entitiesCreated)) {
      console.log(`    - ${entity}: ${count}`);
    }
  }

  if (result.errors.length > 0) {
    console.log("\n  Warnings:");
    for (const err of result.errors) {
      console.log(`    - ${err}`);
    }
  }

  console.log("");
  process.exit(0);
} catch (err) {
  console.error("\nFATAL:", err.message || err);
  process.exit(1);
}
