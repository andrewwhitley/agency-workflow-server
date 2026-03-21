#!/usr/bin/env node
import "dotenv/config";

import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieSession from "cookie-session";
import rateLimit from "express-rate-limit";
import { runMigrations, closePool } from "./health-database.js";
import { healthRouter } from "./health-api.js";
import { streamWellnessChat } from "./health-ai.js";
import { chatMessageSchema } from "./validation.js";
import {
  getOAuth2Client, isOAuthConfigured, isEmailAllowed, requireAuth,
  type SessionUser,
} from "./oauth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Environment validation ────────────────────────────────────

const PORT = parseInt(process.env.PORT || "3000", 10);
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.SESSION_SECRET) {
  console.error("FATAL: SESSION_SECRET is required in production");
  process.exit(1);
}

// ── Database ──────────────────────────────────────────────────

if (process.env.DATABASE_URL) {
  console.log("Connecting to database...");
  try {
    await runMigrations();
    console.log("Database migrations complete.");
  } catch (err) {
    console.error("Database migration failed:", err);
    process.exit(1);
  }
} else {
  console.warn("DATABASE_URL not set — running without database.");
}

// ── Express app ───────────────────────────────────────────────

const app = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  cookieSession({
    name: "session",
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
  }),
);

// Rate limiting on API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api", apiLimiter);

// ── Auth routes (public) ──────────────────────────────────────

app.get("/auth/login", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Sign In - My Health Optimized</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#0f1117;color:#e5e7eb;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#161822;border:1px solid #262840;border-radius:1rem;padding:2.5rem;max-width:380px;width:90%;text-align:center}
h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#6b7280;font-size:0.875rem;margin-bottom:1.5rem}
.btn{display:inline-flex;align-items:center;gap:0.5rem;background:#10b981;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:0.5rem;font-size:0.875rem;font-weight:500;cursor:pointer;text-decoration:none}
.btn:hover{background:#059669}.logo{width:3rem;height:3rem;background:rgba(16,185,129,0.15);border-radius:0.75rem;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem}
</style></head><body><div class="card">
<div class="logo"><svg width="24" height="24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M19.5 12.572l-7.5 7.428-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/></svg></div>
<h1>My Health Optimized</h1>
<p>Sign in with your Google account to access your family health dashboard.</p>
<a href="/auth/google" class="btn">
<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
Sign in with Google</a></div></body></html>`);
});

app.get("/auth/google", (_req, res) => {
  if (!isOAuthConfigured()) {
    res.status(500).send("OAuth not configured");
    return;
  }
  const client = getOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: "offline",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    if (!isOAuthConfigured()) {
      res.status(500).send("OAuth not configured");
      return;
    }

    const code = req.query.code as string;
    if (!code) {
      res.redirect("/auth/login?error=no_code");
      return;
    }

    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.redirect("/auth/login?error=no_email");
      return;
    }

    // Check email allowlist
    if (!isEmailAllowed(payload.email)) {
      res.status(403).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Access Denied</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#0f1117;color:#e5e7eb;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#161822;border:1px solid #262840;border-radius:1rem;padding:2.5rem;max-width:380px;width:90%;text-align:center}
h1{font-size:1.25rem;color:#ef4444;margin-bottom:0.5rem}p{color:#6b7280;font-size:0.875rem;margin-bottom:1rem}
a{color:#34d399;text-decoration:none;font-size:0.875rem}</style></head><body>
<div class="card"><h1>Access Denied</h1><p>${payload.email} is not authorized.</p><a href="/auth/login">Try a different account</a></div></body></html>`);
      return;
    }

    // Set session
    const user: SessionUser = {
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || "",
    };
    (req.session as any).user = user;

    console.log(`Login: ${user.email}`);
    res.redirect("/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.redirect("/auth/login?error=auth_failed");
  }
});

app.get("/auth/logout", (req, res) => {
  req.session = null;
  res.redirect("/auth/login");
});

app.get("/api/auth/me", (req, res) => {
  const user = (req.session as any)?.user as SessionUser | undefined;
  if (user) {
    res.json({ authenticated: true, user });
  } else {
    res.json({ authenticated: false });
  }
});

// ── React SPA (static files) ──────────────────────────────────

const frontendDist = path.join(__dirname, "..", "frontend", "dist");
app.use(express.static(frontendDist, { index: false }));

// ── Health API routes ─────────────────────────────────────────

app.use("/api/health", requireAuth);
app.use("/api/health", healthRouter());

// ── Chat streaming endpoint ───────────────────────────────────

app.post("/api/health/chat", requireAuth, async (req, res) => {
  try {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { message, family_member_id, conversation_id } = parsed.data;
    const user = (req.session as any)?.user as SessionUser | undefined;
    const accountEmail = user?.email || "anonymous";

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = streamWellnessChat(conversation_id, message, family_member_id, accountEmail);

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error("Chat stream error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Chat failed" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", content: "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
});

// ── Health check ──────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

// ── SPA fallback — serve React index.html for all non-API routes ──

app.get("*", requireAuth, (_req, res) => {
  const indexPath = path.join(frontendDist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send("Not found — run 'npm run build' in /frontend first.");
    }
  });
});

// ── Start server ──────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log("");
  console.log("============================================");
  console.log("  My Health Optimized Dashboard");
  console.log("============================================");
  console.log(`  Port:     ${PORT}`);
  console.log(`  Env:      ${isProduction ? "production" : "development"}`);
  console.log(`  Database: ${process.env.DATABASE_URL ? "connected" : "not configured"}`);
  console.log(`  OAuth:    ${isOAuthConfigured() ? "enabled" : "disabled (dev mode)"}`);
  console.log("============================================");
  console.log("");
});

// ── Graceful shutdown ─────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      await closePool();
      console.log("Database pool closed.");
    } catch (err) {
      console.error("Error closing pool:", err);
    }
    console.log("Goodbye.");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
