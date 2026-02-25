#!/usr/bin/env node
/**
 * CLI wrapper for workbook creation.
 * Usage: node create-workbook.mjs --client <slug> --source <doc-id> [--name "Title"]
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: "/home/andrewwhitley/agency-workflow-server/.env" });

const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

const clientSlug = getArg("client");
const sourceDocId = getArg("source");
const customName = getArg("name");

if (!clientSlug || !sourceDocId) {
  console.error("Usage: node create-workbook.mjs --client <slug> --source <doc-id> [--name \"Title\"]");
  console.error("\nAvailable clients:");
  const clientDir = path.join(path.dirname(new URL(import.meta.url).pathname), "data/clients");
  if (fs.existsSync(clientDir)) {
    fs.readdirSync(clientDir).filter(f => f.endsWith(".json")).forEach(f => {
      const config = JSON.parse(fs.readFileSync(path.join(clientDir, f), "utf-8"));
      console.error(`  ${f.replace(".json", "")} — ${config.name}`);
    });
  }
  process.exit(1);
}

// Import from the built service
const { createWorkbook } = await import("./build/workbook-service.js");

console.log("Creating workbook...");
try {
  const result = await createWorkbook(clientSlug, sourceDocId, customName);
  console.log(`\n✅ ${result.title}`);
  console.log(`   Client: ${result.client}`);
  console.log(`   Images: ${result.imagesInserted}`);
  console.log(`   URL: ${result.url}`);
  console.log(`\nManual steps:`);
  console.log(`  1. Right-click each image → Image options → Text wrapping → Wrap text`);
  console.log(`  2. Resize images as desired`);
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
