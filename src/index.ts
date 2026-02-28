#!/usr/bin/env node
import "dotenv/config";

import express from "express";
import cookieSession from "cookie-session";
import rateLimit from "express-rate-limit";
import { runMigrations, closePool } from "./health-database.js";
import { getDashboardHtml, getLoginPageHtml, getAccessDeniedHtml } from "./health-dashboard.js";
import { healthRouter } from "./health-api.js";
import { streamWellnessChat } from "./health-ai.js";
import { chatMessageSchema } from "./validation.js";
import {
  getOAuth2Client, isOAuthConfigured, isEmailAllowed, requireAuth,
  type SessionUser,
} from "./oauth.js";

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
  res.send(getLoginPageHtml());
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
      res.send(getAccessDeniedHtml(payload.email));
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

// ── Dashboard ─────────────────────────────────────────────────

app.get("/", requireAuth, (req, res) => {
  const user = (req.session as any)?.user as SessionUser | undefined;
  res.send(getDashboardHtml(user));
});

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

// ── Start server ──────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log("");
  console.log("============================================");
  console.log("  Optimal Health Dashboard");
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
