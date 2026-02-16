# Agency Workflow Server

An **MCP-compatible workflow server** with a **web dashboard**, built for digital marketing agencies. Define multi-step workflows for SEO audits, Google Ads reports, Meta Ads analysis, GHL pipeline reviews, WordPress content briefs, and more — then run them from the dashboard or connect AI tools like Claude Desktop and Cursor.

**Deploy to Railway in 2 minutes.**

---

## What's Included

### Pre-Built Agency Workflows

| Workflow | Category | What It Does |
|---|---|---|
| `seo-audit` | SEO | Crawl a URL, score meta tags/headings/performance, generate report |
| `keyword-research` | SEO | Generate keyword ideas with volume, difficulty, and opportunity scores |
| `google-ads-report` | Google Ads | Pull campaign data, calculate ROAS/CPA, generate recommendations |
| `meta-ads-report` | Meta Ads | Analyze ad sets, find best CPL audiences, suggest scaling strategy |
| `wp-content-brief` | WordPress | Generate a full content brief with SEO guidelines and outline |
| `ghl-lead-pipeline` | GHL | Analyze pipeline stages, conversion rates, and bottlenecks |
| `client-monthly-report` | Reporting | Combine all channel metrics into one client report |

### Dashboard
A clean web UI where you and your team can browse workflows, fill in inputs, run them, and see results — no coding required.

### MCP Endpoint
AI tools (Claude Desktop, Cursor, Claude Code) can connect to the server and use your workflows as tools. This means you can ask Claude: *"Run an SEO audit on acme.com"* and it will call your workflow.

---

## Deploy to Railway

### Option 1: From GitHub (Recommended)

1. Push this repo to a GitHub repository
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your repo
4. Railway auto-detects Node.js and deploys
5. Go to **Settings → Networking → Generate Domain** to get your public URL
6. Add any API keys as environment variables in Railway

### Option 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Init project
railway init

# Deploy
railway up

# Get your domain
railway domain
```

### Environment Variables (Railway Dashboard)

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Auto-set by Railway |
| `NODE_ENV` | No | Set to `production` |
| `GOOGLE_ADS_API_KEY` | No | For live Google Ads data |
| `META_ADS_ACCESS_TOKEN` | No | For live Meta Ads data |
| `GHL_API_KEY` | No | For live GHL data |
| `SEMRUSH_API_KEY` | No | For live keyword data |

---

## Connecting AI Tools

Once deployed on Railway (e.g., `https://your-app.up.railway.app`):

### Claude Desktop
Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "agency-workflows": {
      "url": "https://your-app.up.railway.app/mcp/sse"
    }
  }
}
```

### Claude Code
```bash
claude mcp add agency-workflows --transport sse https://your-app.up.railway.app/mcp/sse
```

### Cursor
Add as an MCP server in Cursor settings, pointing to your Railway URL's `/mcp/sse` endpoint.

---

## Local Development

```bash
# Install
npm install

# Build
npm run build

# Run
npm start
# → Dashboard at http://localhost:3000
# → MCP at http://localhost:3000/mcp/sse
```

---

## Adding Your Own Workflows

Open `src/agency-workflows.ts` and add:

```typescript
engine.register({
  name: "my-new-workflow",
  description: "What it does (the LLM sees this)",
  category: "My Category",
  tags: ["tag1", "tag2"],
  inputs: {
    clientName: { type: "string", description: "Client name", required: true },
    dateRange:  { type: "string", description: "Date range", default: "last_30_days" },
  },
  steps: [
    {
      id: "step_one",
      description: "Fetch data",
      action: async (ctx) => {
        // ctx.inputs.clientName, ctx.inputs.dateRange
        // Make API calls, process data, etc.
        return { data: "..." };
      },
    },
    {
      id: "step_two",
      description: "Analyze",
      action: async (ctx) => {
        const prev = ctx.results.step_one;  // Output from step 1
        return { analysis: "..." };
      },
    },
  ],
});
```

Then rebuild and redeploy:
```bash
npm run build && railway up
```

### Connecting to Real APIs

The included workflows use **simulated data** so you can see the patterns immediately. To connect to real services:

1. Add your API key to Railway env vars
2. Replace the `action` function body with a real API call:

```typescript
action: async (ctx) => {
  const resp = await fetch("https://api.semrush.com/...", {
    headers: { Authorization: `Bearer ${process.env.SEMRUSH_API_KEY}` },
  });
  return await resp.json();
},
```

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Railway (your-app.up.railway.app)                   │
│                                                       │
│  Express Server                                       │
│  ├─ GET  /           → Dashboard (HTML)              │
│  ├─ GET  /api/*      → REST API (for dashboard)     │
│  ├─ POST /api/run/*  → Run workflows via REST       │
│  ├─ GET  /mcp/sse    → MCP SSE endpoint             │
│  └─ POST /mcp/messages → MCP message handling       │
│                                                       │
│  Workflow Engine                                      │
│  ├─ SEO workflows                                    │
│  ├─ Google Ads workflows                             │
│  ├─ Meta Ads workflows                               │
│  ├─ WordPress workflows                              │
│  ├─ GHL workflows                                    │
│  └─ Reporting workflows                              │
└──────────────────────────────────────────────────────┘
         ▲                          ▲
         │                          │
    Team members              Claude / Cursor
    (browser)                (MCP connection)
```

## License

MIT
