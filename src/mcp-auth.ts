/**
 * OAuth 2.1 Authorization Code + PKCE for MCP endpoint.
 * Self-contained — no new npm dependencies. Uses Node.js crypto.
 * Tokens stored in-memory Maps (fine for single-instance server).
 */

import crypto from "node:crypto";
import type { Request, Response } from "express";

// ─── Configuration ───────────────────────────────────────────

export function isMcpOAuthConfigured(): boolean {
  return !!(process.env.MCP_OAUTH_CLIENT_ID && process.env.BASE_URL);
}

const ALLOWED_REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://www.claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "https://www.claude.com/api/mcp/auth_callback",
];

// ─── In-memory stores ────────────────────────────────────────

interface AuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
  expiresAt: number;
}

interface AccessToken {
  token: string;
  clientId: string;
  expiresAt: number;
}

const authCodes = new Map<string, AuthCode>();
const accessTokens = new Map<string, AccessToken>();

const AUTH_CODE_TTL = 5 * 60 * 1000; // 5 minutes
const ACCESS_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Periodic cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of authCodes) {
    if (val.expiresAt < now) authCodes.delete(key);
  }
  for (const [key, val] of accessTokens) {
    if (val.expiresAt < now) accessTokens.delete(key);
  }
}, 10 * 60 * 1000).unref();

// ─── Metadata endpoints ──────────────────────────────────────

export function getProtectedResourceMetadata(): object {
  const base = process.env.BASE_URL!;
  return {
    resource: `${base}/mcp/sse`,
    authorization_servers: [base],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
  };
}

export function getAuthorizationServerMetadata(): object {
  const base = process.env.BASE_URL!;
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    registration_endpoint: `${base}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post"],
  };
}

// ─── Authorize (GET — show consent page) ─────────────────────

export function handleAuthorize(req: Request, res: Response): void {
  const {
    client_id,
    redirect_uri,
    response_type,
    code_challenge,
    code_challenge_method,
    state,
  } = req.query as Record<string, string>;

  console.log(`[OAuth] GET /authorize | client_id=${client_id} | redirect_uri=${redirect_uri} | response_type=${response_type} | pkce=${code_challenge_method}`);

  // Validate required params
  if (response_type !== "code") {
    res.status(400).json({ error: "unsupported_response_type" });
    return;
  }
  if (!client_id) {
    res.status(400).json({ error: "invalid_client" });
    return;
  }
  if (!redirect_uri || !ALLOWED_REDIRECT_URIS.includes(redirect_uri)) {
    res.status(400).json({ error: "invalid_redirect_uri" });
    return;
  }
  if (code_challenge_method !== "S256" || !code_challenge) {
    res.status(400).json({ error: "invalid_request", error_description: "PKCE S256 required" });
    return;
  }

  // Show consent page
  res.setHeader("Content-Type", "text/html");
  res.send(consentPage(client_id, redirect_uri, code_challenge, state || ""));
}

// ─── Authorize (POST — user approved) ────────────────────────

export function handleAuthorizeApproval(req: Request, res: Response): void {
  const { client_id, redirect_uri, code_challenge, state, action } = req.body;

  if (action === "deny") {
    const url = new URL(redirect_uri);
    url.searchParams.set("error", "access_denied");
    if (state) url.searchParams.set("state", state);
    res.redirect(url.toString());
    return;
  }

  // Validate again (don't trust hidden fields blindly)
  if (!client_id) {
    res.status(400).json({ error: "invalid_client" });
    return;
  }
  if (!redirect_uri || !ALLOWED_REDIRECT_URIS.includes(redirect_uri)) {
    res.status(400).json({ error: "invalid_redirect_uri" });
    return;
  }

  // Generate auth code
  const code = crypto.randomBytes(32).toString("hex");
  authCodes.set(code, {
    code,
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    state: state || "",
    expiresAt: Date.now() + AUTH_CODE_TTL,
  });

  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  res.redirect(url.toString());
}

// ─── Token endpoint ──────────────────────────────────────────

export function handleToken(req: Request, res: Response): void {
  const {
    grant_type,
    code,
    redirect_uri,
    client_id,
    client_secret,
    code_verifier,
  } = req.body;

  console.log(`[OAuth] POST /token | grant_type=${grant_type} | client_id=${client_id} | has_secret=${!!client_secret} | has_verifier=${!!code_verifier} | redirect_uri=${redirect_uri}`);

  if (grant_type !== "authorization_code") {
    res.status(400).json({ error: "unsupported_grant_type" });
    return;
  }

  // Validate client — accept "none" auth (public client) or client_secret_post
  if (!client_id) {
    res.status(401).json({ error: "invalid_client" });
    return;
  }
  // If client_secret is provided, verify it matches (client_secret_post auth)
  const expectedSecret = process.env.MCP_OAUTH_CLIENT_SECRET;
  if (client_secret && expectedSecret && client_secret !== expectedSecret) {
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  // Look up and consume auth code
  const stored = authCodes.get(code);
  if (!stored) {
    res.status(400).json({ error: "invalid_grant", error_description: "Unknown or expired code" });
    return;
  }
  authCodes.delete(code);

  if (stored.expiresAt < Date.now()) {
    res.status(400).json({ error: "invalid_grant", error_description: "Code expired" });
    return;
  }
  if (stored.redirectUri !== redirect_uri) {
    res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
    return;
  }

  // PKCE: SHA256(code_verifier) must match code_challenge
  if (!code_verifier) {
    res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
    return;
  }
  const computedChallenge = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64url");

  if (computedChallenge !== stored.codeChallenge) {
    res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
    return;
  }

  // Issue access token
  const token = crypto.randomBytes(32).toString("hex");
  accessTokens.set(token, {
    token,
    clientId: client_id,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL,
  });

  res.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL / 1000,
  });
}

// ─── Dynamic Client Registration (RFC 7591) ─────────────────

export function handleRegister(req: Request, res: Response): void {
  const { client_name, redirect_uris } = req.body;
  console.log(`[OAuth] POST /register | client_name=${client_name} | redirect_uris=${JSON.stringify(redirect_uris)}`);

  // Accept any registration — single-user server, we just echo back
  // a client_id. If the caller provides redirect_uris, validate them.
  if (redirect_uris && Array.isArray(redirect_uris)) {
    for (const uri of redirect_uris) {
      if (!ALLOWED_REDIRECT_URIS.includes(uri)) {
        res.status(400).json({ error: "invalid_redirect_uri" });
        return;
      }
    }
  }

  const clientId = process.env.MCP_OAUTH_CLIENT_ID || `dcr-${crypto.randomBytes(8).toString("hex")}`;

  res.status(201).json({
    client_id: clientId,
    client_name: client_name || "MCP Client",
    redirect_uris: redirect_uris || ALLOWED_REDIRECT_URIS,
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
}

// ─── Bearer token validation ─────────────────────────────────

export function validateBearerToken(token: string): boolean {
  const stored = accessTokens.get(token);
  if (!stored) return false;
  if (stored.expiresAt < Date.now()) {
    accessTokens.delete(token);
    return false;
  }
  return true;
}

// ─── Consent page HTML ──────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function consentPage(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Authorize MCP Access</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; max-width: 420px; width: 100%; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.5; }
    .client { color: #60a5fa; font-weight: 600; }
    .actions { display: flex; gap: 0.75rem; }
    button { flex: 1; padding: 0.75rem; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 500; }
    .allow { background: #3b82f6; color: #fff; }
    .allow:hover { background: #2563eb; }
    .deny { background: #334155; color: #94a3b8; }
    .deny:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize MCP Access</h1>
    <p><span class="client">${escapeHtml(clientId)}</span> is requesting access to your Agency Workflow Server MCP tools.</p>
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}">
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge)}">
      <input type="hidden" name="state" value="${escapeHtml(state)}">
      <div class="actions">
        <button type="submit" name="action" value="deny" class="deny">Deny</button>
        <button type="submit" name="action" value="approve" class="allow">Authorize</button>
      </div>
    </form>
  </div>
</body>
</html>`;
}
