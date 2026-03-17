/**
 * Post-build validator: checks that the login/access-denied pages
 * exported from dashboard.ts are valid HTML strings.
 */

import { getLoginPageHtml, getAccessDeniedHtml } from "../build/dashboard.js";

const login = getLoginPageHtml();
const denied = getAccessDeniedHtml("test@example.com");

if (!login.includes("<!DOCTYPE html>")) {
  console.error("✗ getLoginPageHtml() did not return valid HTML");
  process.exit(1);
}

if (!denied.includes("<!DOCTYPE html>")) {
  console.error("✗ getAccessDeniedHtml() did not return valid HTML");
  process.exit(1);
}

console.log("✓ Dashboard pages OK");
