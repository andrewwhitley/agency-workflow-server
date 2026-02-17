/**
 * Google OAuth 2.0 helpers for dashboard authentication.
 * Uses googleapis OAuth2Client directly — no Passport.js needed.
 *
 * If GOOGLE_OAUTH_CLIENT_ID is not set, auth is disabled entirely
 * (dev fallback: server works as before).
 */

import { OAuth2Client } from "googleapis-common";
import type { Request, Response, NextFunction } from "express";

// ─── Lazy-init OAuth2Client ────────────────────────────────

let _client: OAuth2Client | null = null;

export function getOAuth2Client(): OAuth2Client {
  if (!_client) {
    _client = new OAuth2Client(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      `${process.env.BASE_URL}/auth/google/callback`
    );
  }
  return _client;
}

// ─── Allow-list helpers ────────────────────────────────────

export function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedEmails();
  if (allowed.length === 0) return true; // no allow-list = allow all
  return allowed.includes(email.toLowerCase());
}

// ─── Config check ──────────────────────────────────────────

export function isOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.BASE_URL &&
    process.env.SESSION_SECRET
  );
}

// ─── Session user type ─────────────────────────────────────

export interface SessionUser {
  email: string;
  name: string;
  picture: string;
}

// ─── Auth middleware ───────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // If OAuth is not configured, skip auth (dev fallback)
  if (!isOAuthConfigured()) {
    next();
    return;
  }

  const user = (req.session as any)?.user as SessionUser | undefined;
  if (user) {
    next();
    return;
  }

  // API calls get 401; browser requests get redirected to login
  const acceptsHtml =
    req.headers.accept?.includes("text/html") && !req.xhr;

  if (acceptsHtml) {
    res.redirect("/auth/login");
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}
