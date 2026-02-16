/**
 * Returns the full HTML for the dashboard UI.
 * Self-contained: all CSS and JS are inline.
 */
export function getDashboardHtml(): string {
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
          <span>◉</span> Dashboard
        </div>
        <div class="nav-item" data-view="workflows" onclick="switchView('workflows')">
          <span>⚡</span> Workflows <span class="count" id="wf-count">0</span>
        </div>
        <div class="nav-item" data-view="history" onclick="switchView('history')">
          <span>◷</span> Run History <span class="count" id="hist-count">0</span>
        </div>
      </nav>

      <nav class="nav-section" id="category-nav">
        <div class="nav-label">Categories</div>
      </nav>

      <div class="sidebar-footer">
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

    // ─── API ────────────────────────────────────────────
    const api = (path) => fetch("/api" + path).then(r => r.json());
    const apiPost = (path, body) => fetch("/api" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(r => r.json());

    // ─── Init ───────────────────────────────────────────
    async function init() {
      [workflows, stats, history] = await Promise.all([
        api("/workflows"),
        api("/stats"),
        api("/history"),
      ]);
      render();
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
        cats.map(c => \`<div class="nav-item" onclick="filterByCategory('\${c}')"><span>▸</span> \${c} <span class="count">\${workflows.filter(w => (w.category||"Other") === c).length}</span></div>\`).join("");
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
        grid.innerHTML = '<div class="empty-state"><div class="icon">⚡</div><p>No workflows in this category</p></div>';
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
            <span>◎ \${w.steps.length} steps</span>
            <span>⊟ \${(w.inputs ? Object.keys(w.inputs).length : 0)} inputs</span>
            \${w.tags?.length ? '<span>⊞ ' + w.tags.join(', ') + '</span>' : ''}
          </div>
        </div>
      \`).join("");
    }

    function renderHistory() {
      const body = document.getElementById("history-body");
      const recent = document.getElementById("recent-runs");

      if (!history.length) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-dim);">No runs yet. Go run a workflow!</td></tr>';
        recent.innerHTML = '<div class="empty-state"><div class="icon">◷</div><p>No runs yet</p></div>';
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
            <button type="submit" class="btn btn-primary" id="run-btn">▶ Run Workflow</button>
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
        resultDiv.innerHTML = '<div class="result-box"><div class="result-header running">⟳ Running...</div></div>';

        try {
          const result = await apiPost("/run/" + wf.name, args);
          const ok = result.success;
          resultDiv.innerHTML = \`
            <div class="result-box">
              <div class="result-header \${ok ? 'success' : 'error'}">\${ok ? '✓ Success' : '✗ Failed'} — \${result.durationMs}ms</div>
              <div class="result-body">\${JSON.stringify(ok ? result.stepResults : result, null, 2)}</div>
            </div>
          \`;
          // Refresh stats
          [stats, history] = await Promise.all([api("/stats"), api("/history")]);
          renderStats();
          renderHistory();
          document.getElementById("hist-count").textContent = history.length;
        } catch (err) {
          resultDiv.innerHTML = '<div class="result-box"><div class="result-header error">✗ Error</div><div class="result-body">' + err.message + '</div></div>';
        }

        btn.disabled = false;
        btn.textContent = "▶ Run Again";
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
