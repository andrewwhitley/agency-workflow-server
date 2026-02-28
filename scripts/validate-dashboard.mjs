/**
 * Post-build validator: extracts inline JS from dashboard HTML
 * and checks it for syntax errors. Run after `tsc`.
 */

import { getDashboardHtml } from "../build/health-dashboard.js";

const html = getDashboardHtml();
const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  console.error("✗ No <script> tag found in dashboard HTML");
  process.exit(1);
}

try {
  new Function(scriptMatch[1]);
  console.log("✓ Dashboard JS syntax OK");
} catch (e) {
  console.error("✗ Dashboard JS syntax error:", e.message);

  // Try to find the offending line
  const lines = scriptMatch[1].split("\n");
  for (let i = lines.length; i > 0; i--) {
    try {
      new Function(lines.slice(0, i).join("\n"));
      console.error("  Near JS line " + (i + 1) + ":");
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) {
        console.error("  " + (j + 1) + ": " + lines[j]);
      }
      break;
    } catch {}
  }
  process.exit(1);
}
