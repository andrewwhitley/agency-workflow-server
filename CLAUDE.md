# CLAUDE.md — Agency Workflow Server

## Project
MCP-compatible workflow server with web dashboard for AI Marketing Team.
Live at: **teamdashboard.aimarketingteam.com** (Railway, auto-deploys from main)

## Owner
Andrew Whitley — andrew@aimarketingteam.com

## Quick Reference
- **Build**: `npm run build` (tsc → ./build/)
- **Start**: `npm start` (node build/index.js)
- **Dev**: `npm run dev` (tsc --watch)
- **Deploy**: push to `main` → Railway auto-deploys
- **Railway CLI**: `railway status`, `railway logs`, `railway variables`

## Architecture Rules
- All dashboard HTML/CSS/JS is inline in TypeScript (no separate frontend build). `dashboard.ts` is ~30k tokens — always use offset/limit when reading it.
- Database features (agents, threads, tasks, memories) only activate when `DATABASE_URL` is set.
- Google Drive features only activate when service account credentials are configured.
- Discord bot only starts when `DISCORD_BOT_TOKEN` is set.
- The server degrades gracefully — every integration is optional.

## Code Conventions
- TypeScript with ES2022 target, Node16 module resolution
- ESM (`"type": "module"` in package.json) — all imports use `.js` extensions
- Validation uses Zod schemas in `src/validation.ts`
- Database migrations are sequential in `src/database.ts` — append new migrations, never modify existing ones
- Express routes: inline in `src/index.ts` for public/simple routes, `src/api-routes.ts` for agent/thread/task/memory CRUD

## Key Files
| File | What it does |
|---|---|
| `src/index.ts` | Express app, all route wiring, startup |
| `src/dashboard.ts` | Full dashboard SPA (huge — use offset/limit) |
| `src/dashboard-chat.ts` | Chat UI injected into dashboard |
| `src/chat-engine.ts` | Streaming Claude chat with tool use loop |
| `src/database.ts` | PostgreSQL pool + all migrations |
| `src/api-routes.ts` | REST API for agents, threads, tasks, memories |
| `src/mcp-bridge.ts` | Exposes everything as MCP tools |
| `src/agency-workflows.ts` | 7 pre-built marketing workflows |
| `src/discord-bot.ts` | Discord bot (The Oracle) |

## Environment
- Railway project: `agency-workflow-server` (production)
- PostgreSQL: provisioned on Railway, `DATABASE_URL` auto-injected
- Discord bot name: The Oracle
- Domain: teamdashboard.aimarketingteam.com

## Mistakes to Avoid
- Don't try to `cat` or read `dashboard.ts` in full — it will exceed token limits. Use offset/limit.
- Don't modify existing migration SQL in `database.ts` — always append new migrations.
- Don't forget `.js` extensions on imports — this is ESM.
- Don't assume features are enabled — always check env var gates.
- Don't commit the `images and screenshots/` folder or `.env` file.
- When deploying, push to `main` — that's all that's needed. Don't run `railway up` manually unless there's a reason.

## Memory
Detailed architecture, patterns, and task tracking are in the auto-memory directory. See:
- `memory/soul.md` — Full architecture and component map
- `memory/todo.md` — Current tasks and progress
- `memory/MEMORY.md` — Quick-reference and preferences
