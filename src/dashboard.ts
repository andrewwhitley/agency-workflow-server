import type { SessionUser } from "./oauth.js";

/**
 * Returns the full HTML for the dashboard UI.
 * Self-contained: all CSS and JS are inline.
 */
export function getDashboardHtml(user?: SessionUser): string {
  const userHtml = user
    ? `<div class="user-info">
        <img class="user-avatar" src="${user.picture}" alt="" referrerpolicy="no-referrer" />
        <div class="user-details">
          <div class="user-name">${user.name}</div>
          <div class="user-email">${user.email}</div>
        </div>
      </div>
      <a href="/auth/logout" class="sign-out-link">Sign out</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workflow Command Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --surface-2: #1a1a26;
      --surface-3: #22222e;
      --border: #2a2a3a;
      --border-accent: #3d3d55;
      --text: #e8e8f0;
      --text-muted: #8888a0;
      --text-dim: #555570;
      --accent: #6366f1;
      --accent-glow: #818cf833;
      --green: #34d399;
      --green-dim: #34d39922;
      --red: #f87171;
      --red-dim: #f8717122;
      --amber: #fbbf24;
      --amber-dim: #fbbf2422;
      --blue: #60a5fa;
      --radius: 12px;
      --radius-sm: 8px;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* ── Layout ─────────────────────────────────────────── */

    .app {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
    }

    @media (max-width: 768px) {
      .app { grid-template-columns: 1fr; }
      .sidebar { display: none; }
    }

    /* ── Sidebar ────────────────────────────────────────── */

    .sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 28px 20px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, var(--accent), #a78bfa);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
      color: white;
      letter-spacing: -1px;
    }

    .logo-text {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }

    .logo-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      color: var(--text-dim);
      padding: 0 12px;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .nav-item {
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 13.5px;
      color: var(--text-muted);
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 10px;
      user-select: none;
    }

    .nav-item:hover { background: var(--surface-2); color: var(--text); }
    .nav-item.active { background: var(--accent); color: white; }

    .nav-item .count {
      margin-left: auto;
      background: var(--surface-3);
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 500;
    }
    .nav-item.active .count { background: #ffffff33; }

    .sidebar-footer {
      margin-top: auto;
      padding: 16px 12px;
      border-top: 1px solid var(--border);
      font-size: 11px;
      color: var(--text-dim);
      line-height: 1.6;
    }

    .sidebar-footer code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      background: var(--surface-3);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--border-accent);
    }

    .user-details { overflow: hidden; }

    .user-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 10px;
      color: var(--text-dim);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sign-out-link {
      display: inline-block;
      font-size: 11px;
      color: var(--text-dim);
      text-decoration: none;
      margin-bottom: 12px;
      transition: color 0.15s;
    }
    .sign-out-link:hover { color: var(--red); }

    /* ── Main Content ───────────────────────────────────── */

    .main {
      padding: 32px 40px;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .main { padding: 20px 16px; }
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }

    .page-header p {
      color: var(--text-muted);
      font-size: 14px;
    }

    /* ── Stat Cards ─────────────────────────────────────── */

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      transition: border-color 0.2s;
    }

    .stat-card:hover { border-color: var(--border-accent); }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-dim);
      margin-bottom: 8px;
      font-weight: 500;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -1px;
    }

    .stat-value.green { color: var(--green); }
    .stat-value.red { color: var(--red); }
    .stat-value.blue { color: var(--blue); }
    .stat-value.amber { color: var(--amber); }

    /* ── Workflow Cards ──────────────────────────────────── */

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .section-header h2 {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }

    .workflow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px;
      margin-bottom: 40px;
    }

    .wf-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }

    .wf-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), #a78bfa);
      opacity: 0;
      transition: opacity 0.2s;
    }

    .wf-card:hover { border-color: var(--accent); transform: translateY(-2px); }
    .wf-card:hover::before { opacity: 1; }

    .wf-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .wf-card-name {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.2px;
    }

    .wf-card-category {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 3px 10px;
      border-radius: 99px;
      background: var(--accent-glow);
      color: var(--accent);
      font-weight: 600;
      white-space: nowrap;
    }

    .wf-card-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 16px;
    }

    .wf-card-meta {
      display: flex;
      gap: 16px;
      font-size: 11.5px;
      color: var(--text-dim);
    }

    .wf-card-meta span { display: flex; align-items: center; gap: 4px; }

    /* ── Run Panel (Modal) ──────────────────────────────── */

    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: #000000aa;
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }

    .modal-overlay.open { display: flex; }

    .modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 90vw;
      max-width: 640px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 32px;
    }

    .modal h2 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .modal .subtitle {
      color: var(--text-muted);
      font-size: 13px;
      margin-bottom: 24px;
    }

    .form-group {
      margin-bottom: 18px;
    }

    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .form-group input, .form-group textarea, .form-group select {
      width: 100%;
      padding: 10px 14px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      font-family: inherit;
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.15s;
    }

    .form-group input:focus, .form-group textarea:focus {
      border-color: var(--accent);
    }

    .form-group textarea { resize: vertical; min-height: 80px; }
    .form-group .hint { font-size: 11px; color: var(--text-dim); margin-top: 4px; }

    .btn-row {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-primary {
      background: var(--accent);
      color: white;
    }
    .btn-primary:hover { background: #4f46e5; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-ghost {
      background: transparent;
      color: var(--text-muted);
      border: 1px solid var(--border);
    }
    .btn-ghost:hover { background: var(--surface-2); color: var(--text); }

    .btn-green {
      background: var(--green);
      color: #000;
      font-weight: 600;
    }
    .btn-green:hover { background: #2bc48a; }

    .btn-red {
      background: var(--red);
      color: #000;
      font-weight: 600;
    }
    .btn-red:hover { background: #e65a5a; }

    .btn-sm {
      padding: 6px 14px;
      font-size: 12px;
    }

    /* ── Result Display ─────────────────────────────────── */

    .result-box {
      margin-top: 24px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }

    .result-header {
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .result-header.success { background: var(--green-dim); color: var(--green); }
    .result-header.error { background: var(--red-dim); color: var(--red); }
    .result-header.running { background: var(--amber-dim); color: var(--amber); }

    .result-body {
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.7;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      color: var(--text-muted);
    }

    /* ── History Table ───────────────────────────────────── */

    .history-table {
      width: 100%;
      border-collapse: collapse;
    }

    .history-table th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-dim);
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }

    .history-table td {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }

    .history-table tr:hover td { background: var(--surface-2); }

    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .status-dot.success { background: var(--green); }
    .status-dot.failed { background: var(--red); }
    .status-dot.running { background: var(--amber); animation: pulse 1s infinite; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* ── Utilities ───────────────────────────────────────── */

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-dim);
    }
    .empty-state .icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state p { font-size: 14px; }

    .hidden { display: none !important; }

    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pill {
      padding: 6px 14px;
      border-radius: 99px;
      font-size: 12px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .pill:hover { border-color: var(--text-muted); color: var(--text); }
    .pill.active { background: var(--accent); border-color: var(--accent); color: white; }

    /* Connection status badge */
    .conn-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 99px;
      background: var(--green-dim);
      color: var(--green);
      font-weight: 500;
    }
    .conn-badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
    }
    .conn-badge.disconnected {
      background: var(--red-dim);
      color: var(--red);
    }
    .conn-badge.disconnected::before {
      background: var(--red);
    }

    /* ── Knowledge Base Cards ────────────────────────────── */

    .kb-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      transition: border-color 0.2s;
    }
    .kb-card:hover { border-color: var(--border-accent); }

    .kb-card-title {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .kb-card-meta {
      font-size: 12px;
      color: var(--text-dim);
      margin-bottom: 12px;
    }

    .kb-card-preview {
      font-size: 12.5px;
      color: var(--text-muted);
      line-height: 1.5;
      max-height: 60px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .kb-card-actions {
      display: flex;
      gap: 8px;
    }

    .folder-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .folder-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
      font-size: 13.5px;
    }
    .folder-item:hover { border-color: var(--accent); background: var(--surface-2); }

    .client-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .client-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      transition: all 0.2s;
    }
    .client-card:hover { border-color: var(--border-accent); }

    .client-card-name {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .client-card-stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--text-dim);
      margin-bottom: 12px;
    }

    .tag-list {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tag {
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 11px;
      background: var(--surface-3);
      color: var(--text-muted);
    }

    .ask-box {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }
    .ask-box input {
      flex: 1;
      padding: 8px 14px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    .ask-box input:focus { border-color: var(--accent); }
  </style>
</head>
<body>
  <div class="app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon">W</div>
        <div>
          <div class="logo-text">Workflow Server</div>
          <div class="logo-sub">Agency Command Center</div>
        </div>
      </div>

      <nav class="nav-section">
        <div class="nav-label">Navigation</div>
        <div class="nav-item active" data-view="dashboard" onclick="switchView('dashboard')">
          <span>&#9673;</span> Dashboard
        </div>
        <div class="nav-item" data-view="workflows" onclick="switchView('workflows')">
          <span>&#9889;</span> Workflows <span class="count" id="wf-count">0</span>
        </div>
        <div class="nav-item" data-view="history" onclick="switchView('history')">
          <span>&#9719;</span> Run History <span class="count" id="hist-count">0</span>
        </div>
      </nav>

      <nav class="nav-section">
        <div class="nav-label">Knowledge Base</div>
        <div class="nav-item" data-view="drive" onclick="switchView('drive')">
          <span>&#9729;</span> Google Drive <span class="count" id="drive-badge"></span>
        </div>
        <div class="nav-item" data-view="clients" onclick="switchView('clients')">
          <span>&#9823;</span> Clients <span class="count" id="clients-count">0</span>
        </div>
        <div class="nav-item" data-view="sops" onclick="switchView('sops')">
          <span>&#9776;</span> SOPs <span class="count" id="sops-count">0</span>
        </div>
      </nav>

      <nav class="nav-section" id="category-nav">
        <div class="nav-label">Categories</div>
      </nav>

      <div class="sidebar-footer">
        \${userHtml}
        <div class="conn-badge">MCP Server Online</div>
        <br/><br/>
        Connect via:<br/>
        <code>POST /mcp</code>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main">

      <!-- ═══ Dashboard View ═══ -->
      <div id="view-dashboard">
        <div class="page-header">
          <h1>Dashboard</h1>
          <p>Overview of your workflow engine</p>
        </div>
        <div class="stats-grid" id="stats-grid"></div>
        <div class="section-header">
          <h2>Recent Runs</h2>
        </div>
        <div id="recent-runs"></div>
      </div>

      <!-- ═══ Workflows View ═══ -->
      <div id="view-workflows" class="hidden">
        <div class="page-header">
          <h1>Workflows</h1>
          <p>Click any workflow to run it</p>
        </div>
        <div class="filter-pills" id="filter-pills" style="margin-bottom:20px;"></div>
        <div class="workflow-grid" id="workflow-grid"></div>
      </div>

      <!-- ═══ History View ═══ -->
      <div id="view-history" class="hidden">
        <div class="page-header">
          <h1>Run History</h1>
          <p>All workflow executions</p>
        </div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">
          <table class="history-table" id="history-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Workflow</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody id="history-body"></tbody>
          </table>
        </div>
      </div>

      <!-- ═══ Google Drive View ═══ -->
      <div id="view-drive" class="hidden">
        <div class="page-header">
          <h1>Google Drive</h1>
          <p>Connect your Drive, browse folders, and index documents</p>
        </div>

        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
          <div class="stat-card">
            <div class="stat-label">Connection</div>
            <div id="drive-status-text" style="font-size:14px;font-weight:600;margin-top:4px;">Checking...</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Indexed Docs</div>
            <div class="stat-value blue" id="indexed-count">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Clients Found</div>
            <div class="stat-value green" id="clients-found">0</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">SOPs Found</div>
            <div class="stat-value amber" id="sops-found">0</div>
          </div>
        </div>

        <div id="drive-connect-section" style="margin-bottom:24px;">
          <div id="service-account-info" style="font-size:13px;color:var(--text-muted);"></div>
        </div>

        <div id="drive-browser" class="hidden">
          <div class="section-header">
            <h2>Drive Folders</h2>
            <button class="btn btn-ghost btn-sm" onclick="loadFolders()">Refresh</button>
          </div>
          <div id="folder-breadcrumb" style="font-size:12px;color:var(--text-dim);margin-bottom:12px;"></div>
          <div id="folder-list" class="folder-list" style="margin-bottom:24px;"></div>

          <div class="section-header" style="margin-top:24px;">
            <h2>Indexed Documents</h2>
          </div>
          <div id="indexed-docs-list" class="workflow-grid"></div>
        </div>
      </div>

      <!-- ═══ Clients View ═══ -->
      <div id="view-clients" class="hidden">
        <div class="page-header">
          <h1>Clients</h1>
          <p>Client profiles built from your indexed documents</p>
        </div>
        <div id="clients-grid" class="client-grid"></div>
      </div>

      <!-- ═══ SOPs View ═══ -->
      <div id="view-sops" class="hidden">
        <div class="page-header">
          <h1>Standard Operating Procedures</h1>
          <p>Your SOPs parsed into structured steps</p>
        </div>
        <div id="sops-grid" class="workflow-grid"></div>
      </div>
    </main>
  </div>

  <!-- Run Modal -->
  <div class="modal-overlay" id="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal" id="modal"></div>
  </div>

  <script>
    // ─── State ──────────────────────────────────────────
    let workflows = [];
    let stats = {};
    let history = [];
    let activeFilter = "all";
    let driveConnected = false;
    let folderStack = []; // for breadcrumb navigation

    // ─── API ────────────────────────────────────────────
    const api = (path) => fetch("/api" + path).then(r => {
      if (r.status === 401) { window.location.href = "/auth/login"; throw new Error("Unauthorized"); }
      return r.json();
    });
    const apiPost = (path, body) => fetch("/api" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => {
      if (r.status === 401) { window.location.href = "/auth/login"; throw new Error("Unauthorized"); }
      return r.json();
    });

    // ─── Init ───────────────────────────────────────────
    async function init() {
      [workflows, stats, history] = await Promise.all([
        api("/workflows"),
        api("/stats"),
        api("/history"),
      ]);
      render();
      checkDriveStatus();
      loadKBCounts();

      // Handle hash-based navigation
      if (window.location.hash === "#drive") switchView("drive");

      // Poll for updates
      setInterval(async () => {
        [stats, history] = await Promise.all([api("/stats"), api("/history")]);
        renderStats();
        renderHistory();
        document.getElementById("hist-count").textContent = history.length;
      }, 5000);
    }

    // ─── Render ─────────────────────────────────────────
    function render() {
      document.getElementById("wf-count").textContent = workflows.length;
      document.getElementById("hist-count").textContent = history.length;
      renderStats();
      renderCategories();
      renderWorkflows();
      renderHistory();
      renderFilters();
    }

    function renderStats() {
      const grid = document.getElementById("stats-grid");
      grid.innerHTML = \`
        <div class="stat-card">
          <div class="stat-label">Total Workflows</div>
          <div class="stat-value blue">\${workflows.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Runs</div>
          <div class="stat-value">\${stats.total || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Successes</div>
          <div class="stat-value green">\${stats.successes || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Failures</div>
          <div class="stat-value red">\${stats.failures || 0}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Duration</div>
          <div class="stat-value">\${stats.avgDuration || 0}ms</div>
        </div>
      \`;
    }

    function renderCategories() {
      const cats = [...new Set(workflows.map(w => w.category || "Other"))];
      const nav = document.getElementById("category-nav");
      nav.innerHTML = '<div class="nav-label">Categories</div>' +
        cats.map(c => \`<div class="nav-item" onclick="filterByCategory('\${c}')"><span>&#9656;</span> \${c} <span class="count">\${workflows.filter(w => (w.category||"Other") === c).length}</span></div>\`).join("");
    }

    function renderFilters() {
      const cats = ["all", ...new Set(workflows.map(w => w.category || "Other"))];
      document.getElementById("filter-pills").innerHTML = cats.map(c =>
        \`<button class="pill \${activeFilter === c ? 'active' : ''}" onclick="setFilter('\${c}')">\${c === 'all' ? 'All' : c}</button>\`
      ).join("");
    }

    function setFilter(cat) {
      activeFilter = cat;
      renderFilters();
      renderWorkflows();
    }

    function filterByCategory(cat) {
      switchView("workflows");
      setFilter(cat);
    }

    function renderWorkflows() {
      const filtered = activeFilter === "all" ? workflows : workflows.filter(w => (w.category || "Other") === activeFilter);
      const grid = document.getElementById("workflow-grid");
      if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state"><div class="icon">&#9889;</div><p>No workflows in this category</p></div>';
        return;
      }
      grid.innerHTML = filtered.map(w => \`
        <div class="wf-card" onclick="openRunModal('\${w.name}')">
          <div class="wf-card-header">
            <div class="wf-card-name">\${w.name}</div>
            <div class="wf-card-category">\${w.category || 'Other'}</div>
          </div>
          <div class="wf-card-desc">\${w.description}</div>
          <div class="wf-card-meta">
            <span>&#9678; \${w.steps.length} steps</span>
            <span>&#8863; \${(w.inputs ? Object.keys(w.inputs).length : 0)} inputs</span>
            \${w.tags?.length ? '<span>&#8862; ' + w.tags.join(', ') + '</span>' : ''}
          </div>
        </div>
      \`).join("");
    }

    function renderHistory() {
      const body = document.getElementById("history-body");
      const recent = document.getElementById("recent-runs");

      if (!history.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-dim);">No runs yet. Go run a workflow!</td></tr>';
        recent.innerHTML = '<div class="empty-state"><div class="icon">&#9719;</div><p>No runs yet</p></div>';
        return;
      }

      const rows = history.slice(0, 50).map(r => \`
        <tr>
          <td><span class="status-dot \${r.status}"></span>\${r.status}</td>
          <td style="color:var(--text);font-weight:500;">\${r.workflow}</td>
          <td>\${new Date(r.startedAt).toLocaleString()}</td>
          <td>\${r.durationMs ? r.durationMs + 'ms' : '—'}</td>
        </tr>
      \`).join("");

      body.innerHTML = rows;
      recent.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;">' +
        '<table class="history-table"><thead><tr><th>Status</th><th>Workflow</th><th>Started</th><th>Duration</th></tr></thead><tbody>' +
        history.slice(0, 5).map(r => \`
          <tr>
            <td><span class="status-dot \${r.status}"></span>\${r.status}</td>
            <td style="color:var(--text);font-weight:500;">\${r.workflow}</td>
            <td>\${new Date(r.startedAt).toLocaleString()}</td>
            <td>\${r.durationMs ? r.durationMs + 'ms' : '—'}</td>
          </tr>
        \`).join("") +
        '</tbody></table></div>';
    }

    // ─── Run Modal ──────────────────────────────────────
    function openRunModal(name) {
      const wf = workflows.find(w => w.name === name);
      if (!wf) return;

      const inputs = wf.inputs || {};
      const fields = Object.entries(inputs).map(([key, spec]) => {
        const def = typeof spec === "string" ? { type: spec } : spec;
        const required = def.required !== false;
        const placeholder = def.default !== undefined ? \`Default: \${JSON.stringify(def.default)}\` : "";
        const inputType = def.type === "number" ? "number" : def.type === "boolean" ? "select" : "text";

        if (inputType === "select") {
          return \`<div class="form-group">
            <label>\${key}\${required ? ' *' : ''}</label>
            <select name="\${key}"><option value="true">true</option><option value="false">false</option></select>
            \${def.description ? '<div class="hint">' + def.description + '</div>' : ''}
          </div>\`;
        }

        const useTextarea = def.type === "object" || def.type === "array";
        const tag = useTextarea ? "textarea" : "input";
        return \`<div class="form-group">
          <label>\${key}\${required ? ' *' : ''}</label>
          <\${tag} name="\${key}" type="\${inputType}" placeholder="\${placeholder}" \${useTextarea ? 'rows="3"' : ''} /\${useTextarea ? '>' : '>'}
          \${def.description ? '<div class="hint">' + def.description + '</div>' : ''}
        </div>\`;
      }).join("");

      const modal = document.getElementById("modal");
      modal.innerHTML = \`
        <h2>Run: \${wf.name}</h2>
        <div class="subtitle">\${wf.description}</div>
        <form id="run-form">
          \${fields || '<p style="color:var(--text-dim);">This workflow has no inputs.</p>'}
          <div class="btn-row">
            <button type="submit" class="btn btn-primary" id="run-btn">&#9654; Run Workflow</button>
            <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          </div>
        </form>
        <div id="run-result"></div>
      \`;

      document.getElementById("modal-overlay").classList.add("open");

      document.getElementById("run-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const args = {};
        const inputDefs = wf.inputs || {};

        for (const [key, value] of formData.entries()) {
          const spec = inputDefs[key];
          const type = typeof spec === "string" ? spec : spec?.type;
          if (value === "" && (typeof spec !== "string" && spec?.required === false)) continue;

          if (type === "number") args[key] = Number(value);
          else if (type === "boolean") args[key] = value === "true";
          else if (type === "object" || type === "array") {
            try { args[key] = JSON.parse(value); } catch { args[key] = value; }
          }
          else args[key] = value;
        }

        const btn = document.getElementById("run-btn");
        btn.disabled = true;
        btn.textContent = "Running...";

        const resultDiv = document.getElementById("run-result");
        resultDiv.innerHTML = '<div class="result-box"><div class="result-header running">&#10227; Running...</div></div>';

        try {
          const result = await apiPost("/run/" + wf.name, args);
          const ok = result.success;
          resultDiv.innerHTML = \`
            <div class="result-box">
              <div class="result-header \${ok ? 'success' : 'error'}">\${ok ? '&#10003; Success' : '&#10007; Failed'} — \${result.durationMs}ms</div>
              <div class="result-body">\${JSON.stringify(ok ? result.stepResults : result, null, 2)}</div>
            </div>
          \`;
          // Refresh stats
          [stats, history] = await Promise.all([api("/stats"), api("/history")]);
          renderStats();
          renderHistory();
          document.getElementById("hist-count").textContent = history.length;
        } catch (err) {
          resultDiv.innerHTML = '<div class="result-box"><div class="result-header error">&#10007; Error</div><div class="result-body">' + err.message + '</div></div>';
        }

        btn.disabled = false;
        btn.textContent = "&#9654; Run Again";
      });
    }

    function closeModal() {
      document.getElementById("modal-overlay").classList.remove("open");
    }

    // ─── View Switching ─────────────────────────────────
    function switchView(view) {
      document.querySelectorAll("[id^='view-']").forEach(el => el.classList.add("hidden"));
      document.getElementById("view-" + view).classList.remove("hidden");
      document.querySelectorAll(".nav-item[data-view]").forEach(el => el.classList.remove("active"));
      document.querySelector(\`.nav-item[data-view="\${view}"]\`)?.classList.add("active");

      // Load data for knowledge base views
      if (view === "drive") { checkDriveStatus(); loadIndexedDocs(); }
      if (view === "clients") loadClients();
      if (view === "sops") loadSOPs();
    }

    // ─── Google Drive ───────────────────────────────────
    async function checkDriveStatus() {
      try {
        const { connected, serviceEmail } = await api("/auth/status");
        driveConnected = connected;
        const statusText = document.getElementById("drive-status-text");
        const infoEl = document.getElementById("service-account-info");
        const browser = document.getElementById("drive-browser");
        const badge = document.getElementById("drive-badge");

        if (connected) {
          statusText.innerHTML = '<span style="color:var(--green);">Connected</span>';
          infoEl.innerHTML = 'Service account: <strong>' + serviceEmail + '</strong><br/><span style="font-size:11px;color:var(--text-dim);">Share folders with this email in Google Drive to grant access.</span>';
          browser.classList.remove("hidden");
          badge.textContent = "&#10003;";
          badge.style.color = "var(--green)";
          loadFolders();
        } else {
          statusText.innerHTML = '<span style="color:var(--red);">Not Configured</span>';
          infoEl.innerHTML = 'Set <code style="background:var(--surface-3);padding:2px 6px;border-radius:4px;font-size:12px;">GOOGLE_SERVICE_ACCOUNT_PATH</code> or <code style="background:var(--surface-3);padding:2px 6px;border-radius:4px;font-size:12px;">GOOGLE_SERVICE_ACCOUNT_JSON</code> to connect.';
          browser.classList.add("hidden");
          badge.textContent = "&#10007;";
          badge.style.color = "var(--red)";
        }
      } catch { /* ignore */ }
    }

    async function loadFolders(parentId) {
      if (!driveConnected) return;
      try {
        const url = parentId ? "/drive/folders?parentId=" + parentId : "/drive/folders";
        const folders = await api(url);
        const list = document.getElementById("folder-list");

        // Update breadcrumb
        if (parentId) {
          // Already navigated into a subfolder
        } else {
          folderStack = [];
        }
        renderBreadcrumb();

        let html = "";
        if (folderStack.length > 0) {
          html += '<div class="folder-item" onclick="navigateUp()">&#8592; Back</div>';
        }
        html += folders.map(f => \`
          <div class="folder-item" onclick="navigateFolder('\${f.id}', '\${f.name.replace(/'/g, "\\\\'")}')">
            <span>&#128193;</span>
            <span style="flex:1;">\${f.name}</span>
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();indexFolder('\${f.id}')">Index</button>
          </div>
        \`).join("");

        if (!folders.length && folderStack.length === 0) {
          html = '<div class="empty-state"><p>No folders found. Make sure your Drive has folders.</p></div>';
        }

        list.innerHTML = html;
      } catch (err) {
        console.error("Failed to load folders:", err);
      }
    }

    function navigateFolder(folderId, folderName) {
      folderStack.push({ id: folderId, name: folderName });
      loadFolders(folderId);
    }

    function navigateUp() {
      folderStack.pop();
      const parentId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;
      loadFolders(parentId);
    }

    function renderBreadcrumb() {
      const el = document.getElementById("folder-breadcrumb");
      if (!folderStack.length) {
        el.innerHTML = "Root";
        return;
      }
      el.innerHTML = '<span style="cursor:pointer;color:var(--accent);" onclick="loadFolders()">Root</span>' +
        folderStack.map((f, i) =>
          ' / ' + (i === folderStack.length - 1
            ? '<span>' + f.name + '</span>'
            : '<span style="cursor:pointer;color:var(--accent);" onclick="folderStack.splice(' + (i+1) + ');loadFolders(\\'' + f.id + '\\')">' + f.name + '</span>')
        ).join("");
    }

    async function indexFolder(folderId) {
      try {
        const btn = event.target;
        btn.disabled = true;
        btn.textContent = "Indexing...";
        const result = await apiPost("/index/sync", { folderId });
        btn.textContent = "Done! (" + result.indexed + ")";
        setTimeout(() => { btn.textContent = "Index"; btn.disabled = false; }, 2000);
        loadKBCounts();
        loadIndexedDocs();
      } catch (err) {
        console.error("Index error:", err);
      }
    }

    async function loadIndexedDocs() {
      try {
        const docs = await api("/index/documents");
        const grid = document.getElementById("indexed-docs-list");
        if (!docs.length) {
          grid.innerHTML = '<div class="empty-state"><p>No documents indexed yet. Click "Index" on a folder above.</p></div>';
          return;
        }
        grid.innerHTML = docs.map(d => \`
          <div class="kb-card">
            <div class="kb-card-title">\${d.name}</div>
            <div class="kb-card-meta">\${d.path} &bull; \${d.type} \${d.client ? '&bull; ' + d.client : ''}</div>
            <div class="kb-card-preview">\${d.contentPreview || ''}</div>
            <div class="tag-list">\${d.keywords.slice(0,5).map(k => '<span class="tag">' + k + '</span>').join('')}</div>
          </div>
        \`).join("");
      } catch { /* ignore */ }
    }

    async function loadKBCounts() {
      try {
        const [docs, clients, sops] = await Promise.all([
          api("/index/documents"),
          api("/index/clients"),
          api("/sops"),
        ]);
        document.getElementById("indexed-count").textContent = docs.length;
        document.getElementById("clients-found").textContent = clients.length;
        document.getElementById("sops-found").textContent = sops.length;
        document.getElementById("clients-count").textContent = clients.length;
        document.getElementById("sops-count").textContent = sops.length;
      } catch { /* ignore */ }
    }

    // ─── Clients View ───────────────────────────────────
    async function loadClients() {
      try {
        const clients = await api("/clients");
        const grid = document.getElementById("clients-grid");
        if (!clients.length) {
          grid.innerHTML = '<div class="empty-state"><div class="icon">&#9823;</div><p>No clients found. Index some Drive folders first.</p></div>';
          return;
        }
        grid.innerHTML = clients.map(c => \`
          <div class="client-card" id="client-\${c.name.replace(/[^a-zA-Z0-9]/g, '_')}">
            <div class="client-card-name">\${c.name}</div>
            <div class="client-card-stats">
              <span>\${c.documentCount || 0} docs</span>
              <span>\${c.sopCount || 0} SOPs</span>
              \${c.lastUpdated ? '<span>Updated: ' + new Date(c.lastUpdated).toLocaleDateString() + '</span>' : ''}
            </div>
            \${c.brandVoice?.length ? '<div style="margin-bottom:8px;"><span style="font-size:11px;color:var(--text-dim);">Brand voice:</span> <span style="font-size:12px;">' + c.brandVoice.slice(0,3).join(', ') + '</span></div>' : ''}
            \${c.goals?.length ? '<div style="margin-bottom:8px;"><span style="font-size:11px;color:var(--text-dim);">Goals:</span> <span style="font-size:12px;">' + c.goals.slice(0,3).join(', ') + '</span></div>' : ''}
            \${c.services?.length ? '<div class="tag-list" style="margin-bottom:12px;">' + c.services.slice(0,5).map(s => '<span class="tag">' + s + '</span>').join('') + '</div>' : ''}
            <div class="btn-row" style="margin-top:12px;">
              <button class="btn btn-primary btn-sm" onclick="buildProfile('\${c.name}')">Build Profile</button>
            </div>
            <div class="ask-box">
              <input type="text" placeholder="Ask about \${c.name}..." id="ask-\${c.name.replace(/[^a-zA-Z0-9]/g, '_')}" onkeydown="if(event.key==='Enter')askClient('\${c.name}')" />
              <button class="btn btn-ghost btn-sm" onclick="askClient('\${c.name}')">Ask</button>
            </div>
            <div id="ask-result-\${c.name.replace(/[^a-zA-Z0-9]/g, '_')}" style="margin-top:8px;"></div>
          </div>
        \`).join("");
      } catch { /* ignore */ }
    }

    async function buildProfile(clientName) {
      try {
        await apiPost("/clients/" + encodeURIComponent(clientName) + "/build", {});
        loadClients();
      } catch (err) {
        console.error("Build profile error:", err);
      }
    }

    async function askClient(clientName) {
      const inputId = "ask-" + clientName.replace(/[^a-zA-Z0-9]/g, '_');
      const resultId = "ask-result-" + clientName.replace(/[^a-zA-Z0-9]/g, '_');
      const input = document.getElementById(inputId);
      const resultDiv = document.getElementById(resultId);
      const question = input.value.trim();
      if (!question) return;

      resultDiv.innerHTML = '<div style="font-size:12px;color:var(--amber);">Searching...</div>';
      try {
        const result = await apiPost("/clients/" + encodeURIComponent(clientName) + "/ask", { question });
        resultDiv.innerHTML = \`
          <div class="result-box" style="margin-top:8px;">
            <div class="result-body" style="max-height:200px;">\${result.answer}</div>
          </div>
        \`;
      } catch (err) {
        resultDiv.innerHTML = '<div style="font-size:12px;color:var(--red);">Error: ' + err.message + '</div>';
      }
    }

    // ─── SOPs View ──────────────────────────────────────
    async function loadSOPs() {
      try {
        const sops = await api("/sops");
        const grid = document.getElementById("sops-grid");
        if (!sops.length) {
          grid.innerHTML = '<div class="empty-state"><div class="icon">&#9776;</div><p>No SOPs found. Index folders containing SOP documents.</p></div>';
          return;
        }
        grid.innerHTML = sops.map(s => \`
          <div class="kb-card">
            <div class="kb-card-title">\${s.name}</div>
            <div class="kb-card-meta">\${s.path} \${s.client ? '&bull; ' + s.client : ''}</div>
            <div class="kb-card-preview">\${s.contentPreview || ''}</div>
            <div class="kb-card-actions" style="margin-top:12px;">
              <button class="btn btn-ghost btn-sm" onclick="viewSOPSteps('\${s.id}')">View Steps</button>
              <button class="btn btn-primary btn-sm" onclick="registerSOP('\${s.id}')">Create Workflow</button>
            </div>
          </div>
        \`).join("");
      } catch { /* ignore */ }
    }

    async function viewSOPSteps(sopId) {
      try {
        const parsed = await api("/sops/" + encodeURIComponent(sopId) + "/parsed");
        const modal = document.getElementById("modal");
        modal.innerHTML = \`
          <h2>\${parsed.name}</h2>
          <div class="subtitle">Parsed SOP Steps</div>
          \${parsed.steps.map(s => \`
            <div style="margin-bottom:16px;padding:12px;background:var(--surface-2);border-radius:var(--radius-sm);border:1px solid var(--border);">
              <div style="font-weight:600;margin-bottom:4px;">Step \${s.stepNumber}: \${s.title}</div>
              \${s.description ? '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">' + s.description + '</div>' : ''}
              \${s.checklist.length ? '<div style="font-size:12px;color:var(--text-dim);">' + s.checklist.map(c => '<div style="padding:2px 0;">&#8226; ' + c + '</div>').join('') + '</div>' : ''}
            </div>
          \`).join("")}
          <div class="btn-row">
            <button class="btn btn-primary" onclick="registerSOP('\${sopId}');closeModal();">Create Workflow</button>
            <button class="btn btn-ghost" onclick="closeModal()">Close</button>
          </div>
        \`;
        document.getElementById("modal-overlay").classList.add("open");
      } catch (err) {
        console.error("View SOP steps error:", err);
      }
    }

    async function registerSOP(sopId) {
      try {
        const result = await apiPost("/sops/" + encodeURIComponent(sopId) + "/register", {});
        if (result.success) {
          // Refresh workflows
          workflows = await api("/workflows");
          render();
          alert("Workflow created: " + result.workflowName + " (" + result.steps + " steps)");
        }
      } catch (err) {
        console.error("Register SOP error:", err);
      }
    }

    // ─── Keyboard shortcut ──────────────────────────────
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeModal();
    });

    // ─── Boot ───────────────────────────────────────────
    init();
  </script>
</body>
</html>`;
}

/**
 * Branded login page matching the dark dashboard theme.
 */
export function getLoginPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In — Workflow Command Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #2a2a3a;
      --text: #e8e8f0;
      --text-muted: #8888a0;
      --text-dim: #555570;
      --accent: #6366f1;
      --radius: 12px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 48px 40px;
      text-align: center;
      max-width: 400px;
      width: 90vw;
    }
    .logo-icon {
      width: 56px; height: 56px;
      background: linear-gradient(135deg, var(--accent), #a78bfa);
      border-radius: 14px;
      display: inline-flex;
      align-items: center; justify-content: center;
      font-size: 28px; font-weight: 700; color: white;
      margin-bottom: 20px; letter-spacing: -1px;
    }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .subtitle { font-size: 14px; color: var(--text-muted); margin-bottom: 36px; }
    .google-btn {
      display: inline-flex;
      align-items: center; gap: 12px;
      padding: 12px 28px;
      background: white; color: #333;
      border: none; border-radius: 8px;
      font-family: inherit; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: box-shadow 0.15s;
      text-decoration: none;
    }
    .google-btn:hover { box-shadow: 0 2px 12px rgba(99,102,241,0.3); }
    .google-btn svg { width: 20px; height: 20px; }
    .footer { margin-top: 32px; font-size: 11px; color: var(--text-dim); }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo-icon">W</div>
    <h1>Workflow Command Center</h1>
    <p class="subtitle">Sign in with your team account to continue</p>
    <a href="/auth/google" class="google-btn">
      <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Sign in with Google
    </a>
    <p class="footer">Only authorized team members can access this dashboard.</p>
  </div>
</body>
</html>`;
}

/**
 * Shows which email was rejected when user is not on the allow-list.
 */
export function getAccessDeniedHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Access Denied — Workflow Command Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #2a2a3a;
      --text: #e8e8f0;
      --text-muted: #8888a0;
      --text-dim: #555570;
      --red: #f87171;
      --red-dim: #f8717122;
      --radius: 12px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 48px 40px;
      text-align: center;
      max-width: 440px;
      width: 90vw;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: var(--red); }
    .msg { font-size: 14px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.6; }
    .email-badge {
      display: inline-block;
      padding: 6px 16px;
      background: var(--red-dim);
      color: var(--red);
      border-radius: 99px;
      font-size: 13px;
      font-weight: 500;
      margin: 12px 0 24px;
    }
    .back-link {
      display: inline-block;
      padding: 10px 24px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-muted);
      text-decoration: none;
      font-family: inherit;
      font-size: 13px;
      transition: all 0.15s;
    }
    .back-link:hover { border-color: var(--text-muted); color: var(--text); }
    .footer { margin-top: 24px; font-size: 11px; color: var(--text-dim); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#128683;</div>
    <h1>Access Denied</h1>
    <p class="msg">This account is not authorized to access the dashboard.</p>
    <div class="email-badge">${email}</div>
    <br/>
    <a href="/auth/login" class="back-link">Try a different account</a>
    <p class="footer">Contact your administrator to request access.</p>
  </div>
</body>
</html>`;
}
