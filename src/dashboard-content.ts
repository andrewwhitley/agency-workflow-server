/**
 * Content Manager view for the dashboard.
 * Returns HTML, CSS, and JS to be embedded in the main dashboard.
 */

export function getContentViewHtml(): string {
  return `
      <!-- Content Manager View -->
      <div id="view-content" class="hidden">
        <div class="page-header">
          <h1>Content Manager</h1>
          <p>Plan, generate, and manage content for your clients</p>
        </div>

        <!-- Client Selector -->
        <div class="content-controls">
          <div class="form-group" style="max-width:320px;">
            <label>Client</label>
            <select id="content-client-select" onchange="onContentClientChange(this.value)">
              <option value="">Select a client...</option>
            </select>
          </div>
          <div id="content-client-info" class="hidden" style="display:flex;gap:12px;align-items:center;margin-left:auto;">
            <span id="content-client-profile-badge" class="pill pill-green hidden">Content Profile</span>
            <span id="content-client-folder-badge" class="pill pill-blue hidden">Fulfillment Folder</span>
            <span id="content-client-sheet-badge" class="pill pill-purple hidden">Planning Sheet</span>
          </div>
        </div>

        <!-- Tab Pills -->
        <div id="content-tabs" class="hidden">
          <div class="filter-pills" style="margin-bottom:20px;">
            <button class="pill pill-active" onclick="switchContentTab('plan')" data-content-tab="plan">Content Plan</button>
            <button class="pill" onclick="switchContentTab('calendar')" data-content-tab="calendar">Editorial Calendar</button>
            <button class="pill" onclick="switchContentTab('generate')" data-content-tab="generate">Generate</button>
            <button class="pill" onclick="switchContentTab('sheet')" data-content-tab="sheet">Planning Sheet</button>
            <button class="pill" onclick="switchContentTab('runs')" data-content-tab="runs">Run History</button>
            <button class="pill" onclick="switchContentTab('settings')" data-content-tab="settings">Settings</button>
          </div>
        </div>

        <!-- Plan Tab -->
        <div id="content-tab-plan" class="content-tab hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="font-size:18px;margin:0;">Sitemap &amp; Pages</h2>
            <div style="display:flex;gap:8px;">
              <span id="content-plan-count" style="color:var(--text-muted);font-size:13px;line-height:36px;"></span>
            </div>
          </div>
          <div id="content-plan-body" class="content-plan-body">
            <div class="empty-state"><p>Select a client to view their content plan</p></div>
          </div>
        </div>

        <!-- Calendar Tab -->
        <div id="content-tab-calendar" class="content-tab hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="font-size:18px;margin:0;">Editorial Calendar</h2>
            <button class="btn btn-primary btn-sm" id="gen-calendar-btn" onclick="generateCalendar()">Generate 12-Month Calendar</button>
          </div>
          <div id="content-calendar-body">
            <div class="empty-state"><p>Click "Generate" to create an AI-powered 12-month editorial calendar</p></div>
          </div>
        </div>

        <!-- Generate Tab -->
        <div id="content-tab-generate" class="content-tab hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="font-size:18px;margin:0;">Generate Content</h2>
          </div>

          <div class="content-gen-options" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
              <input type="checkbox" id="gen-enable-qa" checked /> Enable QA Review
            </label>
            <div class="form-group" style="margin:0;max-width:160px;">
              <label style="font-size:12px;">QA Threshold</label>
              <input type="number" id="gen-qa-threshold" value="70" min="0" max="100" style="padding:6px 10px;" />
            </div>
            <div class="form-group" style="margin:0;max-width:200px;">
              <label style="font-size:12px;">Output Folder (optional)</label>
              <input type="text" id="gen-output-folder" placeholder="Drive folder ID" style="padding:6px 10px;" />
            </div>
          </div>

          <div id="content-gen-pages">
            <div class="empty-state"><p>Select a client to see pages available for generation</p></div>
          </div>

          <div id="content-gen-actions" class="hidden" style="margin-top:16px;display:flex;gap:8px;">
            <button class="btn btn-primary" onclick="generateSelectedContent()">Generate Selected</button>
            <button class="btn btn-ghost" onclick="generateAllContent()">Generate All</button>
            <span id="gen-selected-count" style="color:var(--text-muted);font-size:13px;line-height:36px;margin-left:8px;"></span>
          </div>

          <!-- Progress Section -->
          <div id="content-gen-progress" class="hidden" style="margin-top:24px;">
            <h3 style="font-size:15px;margin-bottom:12px;">Generation Progress</h3>
            <div class="content-progress-bar-container" style="margin-bottom:16px;">
              <div class="content-progress-bar" id="content-progress-bar" style="width:0%"></div>
            </div>
            <div id="content-gen-status" style="font-size:13px;color:var(--text-muted);margin-bottom:12px;"></div>
            <div id="content-gen-results"></div>
          </div>
        </div>

        <!-- Planning Sheet Tab -->
        <div id="content-tab-sheet" class="content-tab hidden">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="font-size:18px;margin:0;">Planning Sheet</h2>
            <div style="display:flex;gap:8px;">
              <div class="filter-pills">
                <button class="pill pill-active" onclick="switchSheetSubTab('tracking')" data-sheet-tab="tracking">Content Tracking</button>
                <button class="pill" onclick="switchSheetSubTab('sitemap')" data-sheet-tab="sitemap">Topical Sitemap</button>
                <button class="pill" onclick="switchSheetSubTab('deliverables')" data-sheet-tab="deliverables">Deliverables</button>
              </div>
              <a id="sheet-open-link" href="#" target="_blank" class="btn btn-ghost btn-sm hidden" style="font-size:12px;">Open in Sheets</a>
            </div>
          </div>
          <div id="content-sheet-body">
            <div class="empty-state"><p>No planning sheet configured for this client. Set it in Settings.</p></div>
          </div>
        </div>

        <!-- Runs Tab -->
        <div id="content-tab-runs" class="content-tab hidden">
          <h2 style="font-size:18px;margin-bottom:16px;">Run History</h2>
          <div id="content-runs-body">
            <div class="empty-state"><p>No content generation runs yet</p></div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div id="content-tab-settings" class="content-tab hidden">
          <h2 style="font-size:18px;margin-bottom:16px;">Client Content Settings</h2>
          <div id="content-settings-body">
            <div class="empty-state"><p>Select a client to configure settings</p></div>
          </div>
        </div>
      </div>`;
}

export function getContentViewCss(): string {
  return `
    /* Content Manager Styles */
    .content-controls {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .content-plan-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .content-plan-table th {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 2px solid var(--border);
      color: var(--text-muted);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content-plan-table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }
    .content-plan-table tr:hover {
      background: var(--surface-2);
    }
    .content-plan-table .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .type-badge.core { background: rgba(99,102,241,0.15); color: #818cf8; }
    .type-badge.service { background: rgba(16,185,129,0.15); color: #34d399; }
    .type-badge.area { background: rgba(245,158,11,0.15); color: #fbbf24; }
    .type-badge.support { background: rgba(107,114,128,0.15); color: #9ca3af; }
    .type-badge.blog { background: rgba(236,72,153,0.15); color: #f472b6; }
    .pill-purple { background: rgba(168,85,247,0.15); color: #c084fc; }

    .sheet-status-done { color: #34d399; }
    .sheet-status-pending { color: #fbbf24; }

    .qa-grade {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .qa-grade.A { background: rgba(16,185,129,0.2); color: #34d399; }
    .qa-grade.B { background: rgba(99,102,241,0.2); color: #818cf8; }
    .qa-grade.C { background: rgba(245,158,11,0.2); color: #fbbf24; }
    .qa-grade.D, .qa-grade.F { background: rgba(239,68,68,0.2); color: #f87171; }

    .content-progress-bar-container {
      height: 6px;
      background: var(--surface-2);
      border-radius: 3px;
      overflow: hidden;
    }
    .content-progress-bar {
      height: 100%;
      background: var(--primary);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .content-result-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--surface-2);
      border-radius: var(--radius-sm);
      margin-bottom: 6px;
      font-size: 13px;
    }
    .content-result-card .status-icon { font-size: 16px; }

    .calendar-month-group {
      margin-bottom: 20px;
    }
    .calendar-month-group h3 {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }

    .content-settings-form {
      max-width: 500px;
    }
    .content-settings-form .form-group {
      margin-bottom: 16px;
    }
    .content-settings-form .form-group label {
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
      display: block;
    }
    .content-settings-form .form-group input {
      width: 100%;
    }
  `;
}

export function getContentViewJs(): string {
  return `
    // ─── Content Manager ────────────────────────────────
    let contentClients = [];
    let contentCurrentSlug = null;
    let contentPlan = null;
    let contentCalendar = null;
    let contentGenPollTimer = null;

    async function loadContentClients() {
      try {
        contentClients = await api("/content-management/clients");
        const sel = document.getElementById("content-client-select");
        const opts = contentClients.map(c =>
          '<option value="' + c.slug + '">' + escapeHtml(c.name) + (c.hasContentProfile ? '' : ' (no profile)') + '</option>'
        ).join("");
        sel.innerHTML = '<option value="">Select a client...</option>' + opts;
        if (contentCurrentSlug) {
          sel.value = contentCurrentSlug;
        }
      } catch (e) { console.error("Failed to load content clients:", e); }
    }

    function onContentClientChange(slug) {
      contentCurrentSlug = slug;
      contentPlan = null;
      contentCalendar = null;
      const tabs = document.getElementById("content-tabs");
      const info = document.getElementById("content-client-info");
      if (!slug) {
        tabs.classList.add("hidden");
        info.classList.add("hidden");
        document.querySelectorAll(".content-tab").forEach(t => t.classList.add("hidden"));
        return;
      }
      tabs.classList.remove("hidden");
      info.classList.remove("hidden");
      info.style.display = "flex";
      const client = contentClients.find(c => c.slug === slug);
      const profileBadge = document.getElementById("content-client-profile-badge");
      const folderBadge = document.getElementById("content-client-folder-badge");
      const sheetBadge = document.getElementById("content-client-sheet-badge");
      profileBadge.classList.toggle("hidden", !client?.hasContentProfile);
      folderBadge.classList.toggle("hidden", !client?.hasFulfillmentFolder);
      sheetBadge.classList.toggle("hidden", !client?.hasPlanningSheet);
      switchContentTab("plan");
    }

    function switchContentTab(tab) {
      document.querySelectorAll(".content-tab").forEach(t => t.classList.add("hidden"));
      document.querySelectorAll("[data-content-tab]").forEach(p => p.classList.remove("pill-active"));
      const tabEl = document.getElementById("content-tab-" + tab);
      if (tabEl) tabEl.classList.remove("hidden");
      const pill = document.querySelector('[data-content-tab="' + tab + '"]');
      if (pill) pill.classList.add("pill-active");

      if (tab === "plan") loadContentPlan();
      if (tab === "calendar") loadContentCalendarView();
      if (tab === "generate") loadGenerateView();
      if (tab === "sheet") loadSheetView();
      if (tab === "runs") loadContentRuns();
      if (tab === "settings") loadContentSettings();
    }

    async function loadContentPlan() {
      if (!contentCurrentSlug) return;
      const body = document.getElementById("content-plan-body");
      body.innerHTML = '<div class="empty-state"><p>Loading content plan...</p></div>';
      try {
        contentPlan = await api("/content-management/clients/" + contentCurrentSlug + "/plan");
        renderContentPlan(contentPlan);
      } catch (e) {
        body.innerHTML = '<div class="empty-state"><p>Error: ' + escapeHtml(e.message || "Failed to load plan") + '</p></div>';
      }
    }

    function renderContentPlan(plan) {
      const body = document.getElementById("content-plan-body");
      if (!plan?.sitemap?.length) {
        body.innerHTML = '<div class="empty-state"><p>No pages in sitemap. Configure the client content profile first.</p></div>';
        return;
      }

      const groups = {};
      for (const page of plan.sitemap) {
        const t = page.type || "other";
        if (!groups[t]) groups[t] = [];
        groups[t].push(page);
      }

      let html = '<table class="content-plan-table"><thead><tr><th>Page</th><th>Path</th><th>Type</th><th>Meta Title</th></tr></thead><tbody>';
      const order = ["core", "service", "area", "support"];
      for (const type of order) {
        if (!groups[type]) continue;
        for (const page of groups[type]) {
          html += '<tr>';
          html += '<td style="font-weight:500;">' + escapeHtml(page.name) + '</td>';
          html += '<td style="color:var(--text-muted);font-family:var(--font-mono);font-size:12px;">' + escapeHtml(page.path) + '</td>';
          html += '<td><span class="type-badge ' + type + '">' + type + '</span></td>';
          html += '<td style="font-size:12px;color:var(--text-muted);">' + escapeHtml(page.metaTitle || "") + '</td>';
          html += '</tr>';
        }
      }
      html += '</tbody></table>';
      body.innerHTML = html;
      document.getElementById("content-plan-count").textContent = plan.sitemap.length + " pages";
    }

    function loadContentCalendarView() {
      const body = document.getElementById("content-calendar-body");
      if (contentCalendar) {
        renderCalendar(contentCalendar);
        return;
      }
      body.innerHTML = '<div class="empty-state"><p>Click "Generate 12-Month Calendar" to create an AI-powered editorial calendar for this client.</p></div>';
    }

    async function generateCalendar() {
      if (!contentCurrentSlug) return;
      const btn = document.getElementById("gen-calendar-btn");
      const body = document.getElementById("content-calendar-body");
      btn.disabled = true;
      btn.textContent = "Generating...";
      body.innerHTML = '<div class="empty-state"><p>Generating editorial calendar with AI... This may take 30-60 seconds.</p></div>';
      try {
        contentCalendar = await api("/content-management/clients/" + contentCurrentSlug + "/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        renderCalendar(contentCalendar);
      } catch (e) {
        body.innerHTML = '<div class="empty-state"><p>Error: ' + escapeHtml(e.message || "Failed to generate calendar") + '</p></div>';
      } finally {
        btn.disabled = false;
        btn.textContent = "Generate 12-Month Calendar";
      }
    }

    function renderCalendar(strategy) {
      const body = document.getElementById("content-calendar-body");
      if (!strategy?.calendar?.length) {
        body.innerHTML = '<div class="empty-state"><p>No calendar entries generated.</p></div>';
        return;
      }

      const months = {};
      for (const item of strategy.calendar) {
        const m = item.targetMonth || "Unscheduled";
        if (!months[m]) months[m] = [];
        months[m].push(item);
      }

      let html = '';
      for (const [month, items] of Object.entries(months)) {
        html += '<div class="calendar-month-group"><h3>' + escapeHtml(String(month)) + '</h3>';
        html += '<table class="content-plan-table"><thead><tr><th>Title</th><th>Type</th><th>Primary Keyword</th><th>Parent Page</th></tr></thead><tbody>';
        for (const item of items) {
          html += '<tr>';
          html += '<td style="font-weight:500;">' + escapeHtml(item.title || item.name || "") + '</td>';
          html += '<td><span class="type-badge blog">' + escapeHtml(item.type || "blog") + '</span></td>';
          html += '<td style="font-size:12px;">' + escapeHtml(item.primaryKeyword || "") + '</td>';
          html += '<td style="font-size:12px;color:var(--text-muted);">' + escapeHtml(item.parentServicePage || "") + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table></div>';
      }

      if (strategy.summary) {
        html = '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">' +
          '<div class="agent-card" style="flex:1;min-width:140px;padding:14px;"><div style="font-size:24px;font-weight:600;">' + (strategy.summary.totalPages || 0) + '</div><div style="font-size:12px;color:var(--text-muted);">Total Pages</div></div>' +
          '<div class="agent-card" style="flex:1;min-width:140px;padding:14px;"><div style="font-size:24px;font-weight:600;">' + (strategy.summary.blogPosts || 0) + '</div><div style="font-size:12px;color:var(--text-muted);">Blog Posts</div></div>' +
          '<div class="agent-card" style="flex:1;min-width:140px;padding:14px;"><div style="font-size:24px;font-weight:600;">' + (strategy.summary.caseStudies || 0) + '</div><div style="font-size:12px;color:var(--text-muted);">Case Studies</div></div>' +
          '</div>' + html;
      }

      body.innerHTML = html;
    }

    async function loadGenerateView() {
      if (!contentCurrentSlug) return;
      const container = document.getElementById("content-gen-pages");
      const actions = document.getElementById("content-gen-actions");

      if (!contentPlan) {
        try {
          contentPlan = await api("/content-management/clients/" + contentCurrentSlug + "/plan");
        } catch (e) {
          container.innerHTML = '<div class="empty-state"><p>Failed to load content plan.</p></div>';
          return;
        }
      }

      if (!contentPlan?.factoryPages?.length) {
        container.innerHTML = '<div class="empty-state"><p>No pages available for generation.</p></div>';
        actions.classList.add("hidden");
        return;
      }

      // Pre-fill output folder from client config
      const client = contentClients.find(c => c.slug === contentCurrentSlug);
      const folderInput = document.getElementById("gen-output-folder");
      if (client?.fulfillmentFolderId && !folderInput.value) {
        folderInput.value = client.fulfillmentFolderId;
      } else if (client?.outputFolder && !folderInput.value) {
        folderInput.value = client.outputFolder;
      }

      let html = '<table class="content-plan-table"><thead><tr><th style="width:32px;"><input type="checkbox" id="gen-select-all" onchange="toggleAllGenPages(this.checked)" checked /></th><th>Page</th><th>Type</th><th>Slug</th></tr></thead><tbody>';
      for (const page of contentPlan.factoryPages) {
        html += '<tr>';
        html += '<td><input type="checkbox" class="gen-page-check" value="' + escapeHtml(page.id) + '" checked onchange="updateGenCount()" /></td>';
        html += '<td style="font-weight:500;">' + escapeHtml(page.title) + '</td>';
        html += '<td><span class="type-badge ' + (page.type === "website-page" ? "core" : "blog") + '">' + escapeHtml(page.type) + '</span></td>';
        html += '<td style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono);">' + escapeHtml(page.slug) + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table>';
      container.innerHTML = html;
      actions.classList.remove("hidden");
      updateGenCount();
    }

    function toggleAllGenPages(checked) {
      document.querySelectorAll(".gen-page-check").forEach(cb => cb.checked = checked);
      updateGenCount();
    }

    function updateGenCount() {
      const checked = document.querySelectorAll(".gen-page-check:checked").length;
      const total = document.querySelectorAll(".gen-page-check").length;
      document.getElementById("gen-selected-count").textContent = checked + " of " + total + " selected";
    }

    async function generateSelectedContent() {
      const selected = Array.from(document.querySelectorAll(".gen-page-check:checked")).map(cb => cb.value);
      if (!selected.length) { alert("Select at least one page to generate."); return; }
      await triggerGeneration(selected);
    }

    async function generateAllContent() {
      await triggerGeneration(null);
    }

    async function triggerGeneration(pageNames) {
      if (!contentCurrentSlug) return;
      const enableQA = document.getElementById("gen-enable-qa").checked;
      const qaThreshold = parseInt(document.getElementById("gen-qa-threshold").value) || 70;
      const outputFolder = document.getElementById("gen-output-folder").value.trim() || undefined;

      const progressEl = document.getElementById("content-gen-progress");
      const statusEl = document.getElementById("content-gen-status");
      const resultsEl = document.getElementById("content-gen-results");
      const barEl = document.getElementById("content-progress-bar");
      progressEl.classList.remove("hidden");
      statusEl.textContent = "Starting content generation...";
      resultsEl.innerHTML = "";
      barEl.style.width = "0%";

      const pageCount = pageNames ? pageNames.length : (contentPlan?.factoryPages?.length || 0);
      if (!confirm("This will generate " + pageCount + " pages using AI. Each page costs ~1 API call" + (enableQA ? " + 1 QA review call" : "") + ". Continue?")) {
        progressEl.classList.add("hidden");
        return;
      }

      try {
        const result = await api("/content-management/clients/" + contentCurrentSlug + "/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageNames: pageNames || undefined,
            enableQA,
            qaPassThreshold: qaThreshold,
            outputFolderId: outputFolder,
          })
        });

        // Poll for progress
        pollGenerationProgress(result.runId);
      } catch (e) {
        statusEl.textContent = "Error: " + (e.message || "Generation failed");
      }
    }

    function pollGenerationProgress(runId) {
      if (contentGenPollTimer) clearInterval(contentGenPollTimer);
      const statusEl = document.getElementById("content-gen-status");
      const resultsEl = document.getElementById("content-gen-results");
      const barEl = document.getElementById("content-progress-bar");

      contentGenPollTimer = setInterval(async () => {
        try {
          const run = await api("/content-factory/status/" + runId);
          if (!run) return;

          const total = run.totalPages || 1;
          const done = (run.completedPages || 0) + (run.failedPages || 0);
          const pct = Math.round((done / total) * 100);
          barEl.style.width = pct + "%";
          statusEl.textContent = run.status + " — " + done + "/" + total + " pages processed";

          // Render per-page results
          if (run.pages?.length) {
            let rhtml = "";
            for (const page of run.pages) {
              const icon = page.status === "success" ? "&#9989;" : page.status === "failed" ? "&#10060;" : "&#9203;";
              rhtml += '<div class="content-result-card">';
              rhtml += '<span class="status-icon">' + icon + '</span>';
              rhtml += '<span style="flex:1;font-weight:500;">' + escapeHtml(page.title) + '</span>';
              if (page.qa?.grade) {
                rhtml += '<span class="qa-grade ' + page.qa.grade + '">' + page.qa.grade + ' (' + page.qa.overall + '%)</span>';
              }
              if (page.docUrl) {
                rhtml += '<a href="' + page.docUrl + '" target="_blank" style="color:var(--primary);font-size:12px;">Open Doc</a>';
              }
              rhtml += '</div>';
            }
            resultsEl.innerHTML = rhtml;
          }

          if (run.status === "completed" || run.status === "failed") {
            clearInterval(contentGenPollTimer);
            contentGenPollTimer = null;
            if (run.folderUrl) {
              statusEl.innerHTML = statusEl.textContent + ' — <a href="' + run.folderUrl + '" target="_blank" style="color:var(--primary);">Open Output Folder</a>';
            }
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      }, 3000);
    }

    async function loadContentRuns() {
      const body = document.getElementById("content-runs-body");
      try {
        const runs = await api("/content-factory/runs");
        if (!runs?.length) {
          body.innerHTML = '<div class="empty-state"><p>No content generation runs yet.</p></div>';
          return;
        }

        let html = '<table class="content-plan-table"><thead><tr><th>Date</th><th>Client</th><th>Pages</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        for (const run of runs) {
          const date = run.startedAt ? new Date(run.startedAt).toLocaleString() : "—";
          const statusClass = run.status === "completed" ? "color:#34d399" : run.status === "failed" ? "color:#f87171" : "color:#fbbf24";
          html += '<tr>';
          html += '<td style="font-size:12px;">' + escapeHtml(date) + '</td>';
          html += '<td>' + escapeHtml(run.clientName || "—") + '</td>';
          html += '<td>' + (run.completedPages || 0) + '/' + (run.totalPages || 0) + '</td>';
          html += '<td style="' + statusClass + ';font-weight:500;">' + escapeHtml(run.status) + '</td>';
          html += '<td>';
          if (run.folderUrl) html += '<a href="' + run.folderUrl + '" target="_blank" style="color:var(--primary);font-size:12px;">Folder</a>';
          html += '</td>';
          html += '</tr>';
        }
        html += '</tbody></table>';
        body.innerHTML = html;
      } catch (e) {
        body.innerHTML = '<div class="empty-state"><p>Error loading runs: ' + escapeHtml(e.message || "") + '</p></div>';
      }
    }

    async function loadContentSettings() {
      const body = document.getElementById("content-settings-body");
      if (!contentCurrentSlug) {
        body.innerHTML = '<div class="empty-state"><p>Select a client first.</p></div>';
        return;
      }

      try {
        const config = await api("/content-management/clients/" + contentCurrentSlug);
        let html = '<div class="content-settings-form">';
        html += '<div class="form-group"><label>Client Name</label><input type="text" value="' + escapeHtml(config.name || "") + '" disabled /></div>';
        html += '<div class="form-group"><label>Provider</label><input type="text" value="' + escapeHtml(config.provider || "") + '" disabled /></div>';
        html += '<div class="form-group"><label>Fulfillment Folder ID</label><input type="text" id="settings-fulfillment-folder" value="' + escapeHtml(config.fulfillmentFolderId || "") + '" placeholder="Google Drive folder ID for deliverables" /></div>';
        html += '<div class="form-group"><label>Planning Sheet ID</label><input type="text" id="settings-planning-sheet" value="' + escapeHtml(config.planningSheetId || "") + '" placeholder="Google Sheets ID for content tracking" /></div>';
        html += '<div class="form-group"><label>Output Folder ID</label><input type="text" value="' + escapeHtml(config.outputFolder || "") + '" disabled /><small style="color:var(--text-muted);font-size:11px;">Set in client JSON config</small></div>';
        html += '<div class="form-group"><label>Content Profile</label>';
        if (config.contentProfile) {
          html += '<div style="font-size:12px;color:var(--text-muted);background:var(--surface-2);padding:10px;border-radius:var(--radius-sm);max-height:200px;overflow:auto;"><pre style="margin:0;white-space:pre-wrap;">' + escapeHtml(JSON.stringify(config.contentProfile, null, 2)) + '</pre></div>';
        } else {
          html += '<span style="color:var(--text-muted);font-size:13px;">Not configured. Add contentProfile to data/clients/' + escapeHtml(contentCurrentSlug) + '.json</span>';
        }
        html += '</div>';
        html += '<button class="btn btn-primary" onclick="saveContentSettings()">Save Settings</button>';
        html += '</div>';
        body.innerHTML = html;
      } catch (e) {
        body.innerHTML = '<div class="empty-state"><p>Error: ' + escapeHtml(e.message || "") + '</p></div>';
      }
    }

    // ─── Planning Sheet ───────────────────────────────
    let sheetCurrentSubTab = "tracking";

    async function loadSheetView() {
      const body = document.getElementById("content-sheet-body");
      const client = contentClients.find(c => c.slug === contentCurrentSlug);
      const link = document.getElementById("sheet-open-link");
      if (!client?.hasPlanningSheet) {
        body.innerHTML = '<div class="empty-state"><p>No planning sheet configured. Go to Settings to add one.</p></div>';
        link.classList.add("hidden");
        return;
      }
      link.href = "https://docs.google.com/spreadsheets/d/" + client.planningSheetId;
      link.classList.remove("hidden");
      switchSheetSubTab(sheetCurrentSubTab);
    }

    function switchSheetSubTab(tab) {
      sheetCurrentSubTab = tab;
      document.querySelectorAll("[data-sheet-tab]").forEach(p => p.classList.remove("pill-active"));
      const pill = document.querySelector('[data-sheet-tab="' + tab + '"]');
      if (pill) pill.classList.add("pill-active");

      if (tab === "tracking") loadContentTracking();
      if (tab === "sitemap") loadTopicalSitemap();
      if (tab === "deliverables") loadDeliverables();
    }

    async function loadContentTracking() {
      const body = document.getElementById("content-sheet-body");
      body.innerHTML = '<div class="empty-state"><p>Loading content tracking...</p></div>';
      try {
        const data = await api("/content-management/clients/" + contentCurrentSlug + "/sheet/content-tracking");
        if (!data.rows?.length) {
          body.innerHTML = '<div class="empty-state"><p>No content tracking entries found.</p></div>';
          return;
        }
        let html = '<table class="content-plan-table"><thead><tr>';
        html += '<th>Topic</th><th>Date</th><th>Type</th><th>Title</th><th>Keyword</th><th>Assigned</th><th>Status</th>';
        html += '</tr></thead><tbody>';
        for (const row of data.rows) {
          const completed = (row["Completed"] || "").toUpperCase() === "TRUE";
          html += '<tr>';
          html += '<td><span class="type-badge service">' + escapeHtml(row["Service Topic"] || "") + '</span></td>';
          html += '<td style="font-size:12px;white-space:nowrap;">' + escapeHtml(row["Scheduled (m/yyyy)"] || "") + '</td>';
          html += '<td style="font-size:12px;">' + escapeHtml(row["Type"] || "") + '</td>';
          html += '<td style="font-weight:500;">' + escapeHtml(row["Title (<65 Characters)"] || "") + '</td>';
          html += '<td style="font-size:12px;color:var(--text-muted);">' + escapeHtml(row["Focus SEO Keyword(s)"] || "") + '</td>';
          html += '<td style="font-size:12px;">' + escapeHtml(row["Assigned To"] || "Unassigned") + '</td>';
          html += '<td class="' + (completed ? "sheet-status-done" : "sheet-status-pending") + '" style="font-weight:500;">' + (completed ? "Done" : "Pending") + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table>';
        body.innerHTML = html;
      } catch (e) {
        body.innerHTML = '<div class="empty-state"><p>Error: ' + escapeHtml(e.message || "") + '</p></div>';
      }
    }

    async function loadTopicalSitemap() {
      const body = document.getElementById("content-sheet-body");
      body.innerHTML = '<div class="empty-state"><p>Loading topical sitemap...</p></div>';
      try {
        const data = await api("/content-management/clients/" + contentCurrentSlug + "/sheet/sitemap");
        if (!data.rows?.length) {
          body.innerHTML = '<div class="empty-state"><p>No sitemap entries found.</p></div>';
          return;
        }
        let html = '<table class="content-plan-table"><thead><tr>';
        html += '<th>Page</th><th>URL</th><th>SEO Keywords</th><th>SEO Score</th><th>Title</th><th>Words</th>';
        html += '</tr></thead><tbody>';
        for (const row of data.rows) {
          const score = parseInt(row["SEO Score"] || row["SEO Score "] || "0");
          const scoreColor = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
          html += '<tr>';
          html += '<td style="font-weight:500;">' + escapeHtml(row["Page"] || "") + '</td>';
          html += '<td style="font-size:11px;font-family:var(--font-mono);color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">';
          if (row["URL"]) html += '<a href="' + escapeHtml(row["URL"]) + '" target="_blank" style="color:var(--primary);">' + escapeHtml(row["URL"].replace("https://","")) + '</a>';
          html += '</td>';
          html += '<td style="font-size:12px;">' + escapeHtml(row["SEO Keywords"] || row["SEO Keywords "] || "") + '</td>';
          html += '<td style="font-weight:600;color:' + scoreColor + ';">' + (score || "—") + '</td>';
          html += '<td style="font-size:12px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(row["Title (Max 60 Ch / 580 Px)"] || "") + '</td>';
          html += '<td style="font-size:12px;">' + escapeHtml(row["Word Count"] || "") + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table>';
        body.innerHTML = html;
      } catch (e) {
        body.innerHTML = '<div class="empty-state"><p>Error: ' + escapeHtml(e.message || "") + '</p></div>';
      }
    }

    async function loadDeliverables() {
      const body = document.getElementById("content-sheet-body");
      body.innerHTML = '<div class="empty-state"><p>Loading deliverables...</p></div>';
      try {
        const data = await api("/content-management/clients/" + contentCurrentSlug + "/sheet?tab=Deliverables");
        if (!data.values?.length) {
          body.innerHTML = '<div class="empty-state"><p>No deliverables data found.</p></div>';
          return;
        }
        let html = '<table class="content-plan-table"><thead><tr>';
        const headers = data.values[0] || [];
        for (const h of headers) html += '<th>' + escapeHtml(h) + '</th>';
        html += '</tr></thead><tbody>';
        for (let i = 1; i < data.values.length; i++) {
          const row = data.values[i];
          if (!row?.length || !row.some(c => c?.trim())) continue;
          html += '<tr>';
          for (let j = 0; j < headers.length; j++) {
            const val = row[j] || "";
            const isBool = val.toUpperCase() === "TRUE" || val.toUpperCase() === "FALSE";
            if (isBool) {
              html += '<td style="text-align:center;">' + (val.toUpperCase() === "TRUE" ? '<span style="color:#34d399;">&#10003;</span>' : '<span style="color:#6b7280;">—</span>') + '</td>';
            } else {
              html += '<td style="font-size:13px;">' + escapeHtml(val) + '</td>';
            }
          }
          html += '</tr>';
        }
        html += '</tbody></table>';
        body.innerHTML = html;
      } catch (e) {
        body.innerHTML = '<div class="empty-state"><p>Error: ' + escapeHtml(e.message || "") + '</p></div>';
      }
    }

    async function saveContentSettings() {
      if (!contentCurrentSlug) return;
      const fulfillmentFolder = document.getElementById("settings-fulfillment-folder")?.value?.trim();
      const planningSheet = document.getElementById("settings-planning-sheet")?.value?.trim();
      try {
        await api("/content-management/clients/" + contentCurrentSlug + "/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fulfillmentFolderId: fulfillmentFolder || undefined,
            planningSheetId: planningSheet || undefined,
          })
        });
        alert("Settings saved!");
        loadContentClients(); // Refresh badges
      } catch (e) {
        alert("Error saving: " + (e.message || "Unknown error"));
      }
    }
  `;
}
