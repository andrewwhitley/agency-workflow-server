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
            <div style="display:flex;gap:8px;">
              <button class="btn btn-ghost btn-sm hidden" id="enrich-seo-btn" onclick="enrichCalendarWithSEO()">Enrich with SEO Data</button>
              <button class="btn btn-primary btn-sm" id="gen-calendar-btn" onclick="generateCalendar()">Generate 12-Month Calendar</button>
            </div>
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

          <!-- Keyword Research Section -->
          <div id="content-keyword-research" style="margin-top:32px;border-top:1px solid var(--border);padding-top:20px;">
            <h3 style="font-size:15px;margin-bottom:12px;">Keyword Research</h3>
            <div style="display:flex;gap:8px;margin-bottom:16px;">
              <input type="text" id="keyword-seed-input" placeholder="Enter a seed keyword (e.g. chiropractic care)" style="flex:1;padding:8px 12px;" />
              <button class="btn btn-primary btn-sm" id="keyword-suggest-btn" onclick="runKeywordSuggestions()">Get Suggestions</button>
            </div>
            <div id="keyword-suggest-results"></div>
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
            <h2 style="font-size:18px;margin:0;">Planning Data</h2>
            <div style="display:flex;gap:8px;align-items:center;">
              <span id="sheet-sync-status" style="font-size:11px;color:var(--text-muted);"></span>
              <div class="filter-pills">
                <button class="pill pill-active" onclick="switchSheetSubTab('tracking')" data-sheet-tab="tracking">Content Tracking</button>
                <button class="pill" onclick="switchSheetSubTab('sitemap')" data-sheet-tab="sitemap">Topical Sitemap</button>
                <button class="pill" onclick="switchSheetSubTab('deliverables')" data-sheet-tab="deliverables">Deliverables</button>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="importFromSheet()" id="sheet-import-btn" style="font-size:12px;">Import from Sheet</button>
              <button class="btn btn-ghost btn-sm" onclick="syncToSheet()" id="sheet-sync-btn" style="font-size:12px;">Sync to Sheet</button>
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

    .seo-vol-high { color: #34d399; font-weight: 600; }
    .seo-vol-med { color: #fbbf24; font-weight: 600; }
    .seo-vol-low { color: #6b7280; }
    .seo-diff-easy { color: #34d399; font-weight: 600; }
    .seo-diff-med { color: #fbbf24; font-weight: 600; }
    .seo-diff-hard { color: #f87171; font-weight: 600; }

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
      const enrichBtn = document.getElementById("enrich-seo-btn");
      if (!strategy?.calendar?.length) {
        body.innerHTML = '<div class="empty-state"><p>No calendar entries generated.</p></div>';
        if (enrichBtn) enrichBtn.classList.add("hidden");
        return;
      }

      // Show enrich button when calendar exists
      if (enrichBtn) enrichBtn.classList.remove("hidden");

      // Check if any items have SEO metrics
      const hasMetrics = strategy.calendar.some(function(item) { return item.seoMetrics; });

      const months = {};
      for (const item of strategy.calendar) {
        const m = item.targetMonth || "Unscheduled";
        if (!months[m]) months[m] = [];
        months[m].push(item);
      }

      let html = '';
      for (const [month, items] of Object.entries(months)) {
        html += '<div class="calendar-month-group"><h3>' + escapeHtml(String(month)) + '</h3>';
        html += '<table class="content-plan-table"><thead><tr><th>Title</th><th>Type</th><th>Primary Keyword</th>';
        if (hasMetrics) html += '<th>Vol</th><th>Diff</th><th>CPC</th>';
        html += '<th>Parent Page</th></tr></thead><tbody>';
        for (const item of items) {
          html += '<tr>';
          html += '<td style="font-weight:500;">' + escapeHtml(item.title || item.name || "") + '</td>';
          html += '<td><span class="type-badge blog">' + escapeHtml(item.type || "blog") + '</span></td>';
          html += '<td style="font-size:12px;">' + escapeHtml(item.primaryKeyword || "") + '</td>';
          if (hasMetrics) {
            var seo = item.seoMetrics || {};
            var vol = seo.primaryKeywordVolume;
            var diff = seo.primaryKeywordDifficulty;
            var cpc = seo.primaryKeywordCpc;
            var volClass = vol > 100 ? "seo-vol-high" : vol > 10 ? "seo-vol-med" : "seo-vol-low";
            var diffClass = diff != null ? (diff < 30 ? "seo-diff-easy" : diff < 60 ? "seo-diff-med" : "seo-diff-hard") : "";
            html += '<td class="' + volClass + '" style="font-size:12px;">' + (vol != null ? vol.toLocaleString() : "—") + '</td>';
            html += '<td class="' + diffClass + '" style="font-size:12px;">' + (diff != null ? diff : "—") + '</td>';
            html += '<td style="font-size:12px;color:var(--text-muted);">' + (cpc != null ? "$" + cpc.toFixed(2) : "—") + '</td>';
          }
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

    async function enrichCalendarWithSEO() {
      if (!contentCalendar?.calendar?.length) return;
      var btn = document.getElementById("enrich-seo-btn");
      btn.disabled = true;
      btn.textContent = "Enriching...";

      try {
        // Collect all unique keywords (primary + secondary)
        var keywordSet = {};
        for (var item of contentCalendar.calendar) {
          if (item.primaryKeyword) keywordSet[item.primaryKeyword.toLowerCase()] = true;
          if (item.secondaryKeywords) {
            for (var sk of item.secondaryKeywords) {
              keywordSet[sk.toLowerCase()] = true;
            }
          }
        }
        var allKeywords = Object.keys(keywordSet);
        if (!allKeywords.length) { alert("No keywords to enrich."); return; }

        var result = await api("/content-management/keywords/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keywords: allKeywords })
        });

        // Build lookup map
        var metricsMap = {};
        for (var m of (result.keywords || [])) {
          metricsMap[m.keyword.toLowerCase()] = m;
        }

        // Attach metrics to calendar items
        var now = new Date().toISOString();
        for (var item of contentCalendar.calendar) {
          var pk = (item.primaryKeyword || "").toLowerCase();
          var pkData = metricsMap[pk];
          var secondaryVols = {};
          if (item.secondaryKeywords) {
            for (var sk of item.secondaryKeywords) {
              var skData = metricsMap[sk.toLowerCase()];
              if (skData) secondaryVols[sk] = skData.searchVolume;
            }
          }
          item.seoMetrics = {
            primaryKeywordVolume: pkData ? pkData.searchVolume : undefined,
            primaryKeywordDifficulty: pkData ? pkData.keywordDifficulty : undefined,
            primaryKeywordCpc: pkData ? pkData.cpc : undefined,
            primaryKeywordCompetition: pkData ? pkData.competitionLevel : undefined,
            secondaryKeywordVolumes: Object.keys(secondaryVols).length ? secondaryVols : undefined,
            enrichedAt: now,
          };
        }

        renderCalendar(contentCalendar);
      } catch (e) {
        alert("SEO enrichment failed: " + (e.message || "Unknown error"));
      } finally {
        btn.disabled = false;
        btn.textContent = "Enrich with SEO Data";
      }
    }

    async function runKeywordSuggestions() {
      var seed = document.getElementById("keyword-seed-input").value.trim();
      if (!seed) { alert("Enter a seed keyword."); return; }
      var btn = document.getElementById("keyword-suggest-btn");
      var results = document.getElementById("keyword-suggest-results");
      btn.disabled = true;
      btn.textContent = "Searching...";
      results.innerHTML = '<div class="empty-state"><p>Fetching suggestions...</p></div>';

      try {
        var data = await api("/content-management/keywords/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seed: seed, limit: 50 })
        });

        if (!data.keywords?.length) {
          results.innerHTML = '<div class="empty-state"><p>No suggestions found for "' + escapeHtml(seed) + '".</p></div>';
          return;
        }

        var html = '<table class="content-plan-table"><thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>CPC</th><th>Competition</th></tr></thead><tbody>';
        for (var kw of data.keywords) {
          var vol = kw.searchVolume || 0;
          var diff = kw.keywordDifficulty;
          var volClass = vol > 100 ? "seo-vol-high" : vol > 10 ? "seo-vol-med" : "seo-vol-low";
          var diffClass = diff != null ? (diff < 30 ? "seo-diff-easy" : diff < 60 ? "seo-diff-med" : "seo-diff-hard") : "";
          html += '<tr>';
          html += '<td style="font-weight:500;">' + escapeHtml(kw.keyword) + '</td>';
          html += '<td class="' + volClass + '">' + vol.toLocaleString() + '</td>';
          html += '<td class="' + diffClass + '">' + (diff != null ? diff : "—") + '</td>';
          html += '<td style="color:var(--text-muted);">$' + (kw.cpc || 0).toFixed(2) + '</td>';
          html += '<td>' + escapeHtml(kw.competitionLevel || "—") + '</td>';
          html += '</tr>';
        }
        html += '</tbody></table>';
        results.innerHTML = html;
      } catch (e) {
        results.innerHTML = '<div class="empty-state"><p>Error: ' + escapeHtml(e.message || "Failed to get suggestions") + '</p></div>';
      } finally {
        btn.disabled = false;
        btn.textContent = "Get Suggestions";
      }
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

    // ─── Planning Data (DB-backed) ─────────────────────
    let sheetCurrentSubTab = "tracking";
    let sheetCurrentData = null;

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
      loadPlanningTab(tab);
    }

    function updateSyncStatus(data) {
      const el = document.getElementById("sheet-sync-status");
      if (!el) return;
      if (data?.lastSyncedFromSheet) {
        const ago = timeAgo(data.lastSyncedFromSheet);
        el.textContent = "Imported " + ago;
      } else {
        el.textContent = "";
      }
    }

    function timeAgo(dateStr) {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return mins + "m ago";
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + "h ago";
      const days = Math.floor(hrs / 24);
      return days + "d ago";
    }

    function renderPlanningTable(data, emptyMsg) {
      if (data?.needsImport) {
        return '<div class="empty-state"><p>No data imported yet. Click "Import from Sheet" to load data from Google Sheets.</p></div>';
      }
      if (!data?.headers?.length || !data?.rows?.length) {
        return '<div class="empty-state"><p>' + escapeHtml(emptyMsg) + '</p></div>';
      }
      let html = '<div style="overflow-x:auto;"><table class="content-plan-table"><thead><tr>';
      html += '<th style="width:40px;"></th>';
      for (const h of data.headers) {
        html += '<th>' + escapeHtml(h) + '</th>';
      }
      html += '</tr></thead><tbody>';
      for (const row of data.rows) {
        const rowId = row._id || "";
        const isEmpty = data.headers.every(function(h) { return !(row[h] || "").trim(); });
        if (isEmpty) continue;
        html += '<tr data-row-id="' + escapeHtml(rowId) + '">';
        html += '<td style="text-align:center;"><button class="btn-icon" onclick="deletePlanningRow(\\x27' + escapeHtml(rowId) + '\\x27)" title="Delete row" style="opacity:0.4;font-size:14px;">&times;</button></td>';
        for (const h of data.headers) {
          const val = row[h] || "";
          const upper = val.toUpperCase();
          if (upper === "TRUE" || upper === "FALSE") {
            html += '<td style="text-align:center;cursor:pointer;" onclick="toggleBoolCell(this, \\x27' + escapeHtml(rowId) + '\\x27, \\x27' + escapeHtml(h) + '\\x27, \\x27' + upper + '\\x27)">';
            html += (upper === "TRUE" ? '<span style="color:#34d399;">&#10003;</span>' : '<span style="color:#6b7280;">—</span>');
            html += '</td>';
          } else if (val.length > 120) {
            html += '<td style="font-size:12px;max-width:300px;"><details><summary style="cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;">' + escapeHtml(val.slice(0, 80)) + '…</summary><div contenteditable="true" class="editable-cell" data-row-id="' + escapeHtml(rowId) + '" data-col="' + escapeHtml(h) + '" style="white-space:pre-wrap;margin-top:6px;">' + escapeHtml(val) + '</div></details></td>';
          } else {
            html += '<td><span contenteditable="true" class="editable-cell" data-row-id="' + escapeHtml(rowId) + '" data-col="' + escapeHtml(h) + '" style="font-size:12px;display:block;min-width:40px;outline:none;border-bottom:1px solid transparent;transition:border-color 0.2s;" onfocus="this.style.borderColor=\\x27var(--primary)\\x27" onblur="this.style.borderColor=\\x27transparent\\x27;saveCellEdit(this)">' + escapeHtml(val) + '</span></td>';
          }
        }
        html += '</tr>';
      }
      html += '</tbody></table></div>';
      html += '<div style="margin-top:12px;"><button class="btn btn-ghost btn-sm" onclick="addPlanningRow()">+ Add Row</button></div>';
      return html;
    }

    async function saveCellEdit(el) {
      const rowId = el.getAttribute("data-row-id");
      const col = el.getAttribute("data-col");
      const newVal = el.textContent.trim();
      if (!rowId || !col) return;
      try {
        el.style.opacity = "0.5";
        await api("/content-management/clients/" + contentCurrentSlug + "/planning/" + sheetCurrentSubTab + "/rows/" + rowId, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { [col]: newVal } })
        });
        el.style.opacity = "1";
      } catch (e) {
        el.style.opacity = "1";
        el.style.borderColor = "#f87171";
        console.error("Save failed:", e);
      }
    }

    async function toggleBoolCell(td, rowId, col, current) {
      const newVal = current === "TRUE" ? "FALSE" : "TRUE";
      try {
        await api("/content-management/clients/" + contentCurrentSlug + "/planning/" + sheetCurrentSubTab + "/rows/" + rowId, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { [col]: newVal } })
        });
        // Reload the tab to get clean re-render
        loadPlanningTab(sheetCurrentSubTab);
      } catch (e) {
        console.error("Toggle failed:", e);
      }
    }

    async function deletePlanningRow(rowId) {
      if (!confirm("Delete this row?")) return;
      try {
        await api("/content-management/clients/" + contentCurrentSlug + "/planning/" + sheetCurrentSubTab + "/rows/" + rowId, {
          method: "DELETE"
        });
        loadPlanningTab(sheetCurrentSubTab);
      } catch (e) {
        alert("Error deleting row: " + (e.message || ""));
      }
    }

    async function addPlanningRow() {
      if (!sheetCurrentData?.headers?.length) return;
      const data = {};
      sheetCurrentData.headers.forEach(function(h) { data[h] = ""; });
      try {
        await api("/content-management/clients/" + contentCurrentSlug + "/planning/" + sheetCurrentSubTab + "/rows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: data })
        });
        loadPlanningTab(sheetCurrentSubTab);
      } catch (e) {
        alert("Error adding row: " + (e.message || ""));
      }
    }

    async function importFromSheet() {
      if (!confirm("Import data from Google Sheet? This will replace current database data for all tabs.")) return;
      const btn = document.getElementById("sheet-import-btn");
      btn.textContent = "Importing...";
      btn.disabled = true;
      try {
        const result = await api("/content-management/clients/" + contentCurrentSlug + "/planning/import", {
          method: "POST"
        });
        const counts = result.imported || {};
        const summary = Object.entries(counts).map(function(e) { return e[0] + ": " + e[1] + " rows"; }).join(", ");
        alert("Import complete! " + summary);
        loadPlanningTab(sheetCurrentSubTab);
      } catch (e) {
        alert("Import failed: " + (e.message || ""));
      } finally {
        btn.textContent = "Import from Sheet";
        btn.disabled = false;
      }
    }

    async function syncToSheet() {
      if (!confirm("Sync current data back to Google Sheet? This will overwrite the sheet.")) return;
      const btn = document.getElementById("sheet-sync-btn");
      btn.textContent = "Syncing...";
      btn.disabled = true;
      try {
        const result = await api("/content-management/clients/" + contentCurrentSlug + "/planning/sync-back", {
          method: "POST"
        });
        const counts = result.synced || {};
        const summary = Object.entries(counts).map(function(e) { return e[0] + ": " + e[1] + " rows"; }).join(", ");
        alert("Sync complete! " + summary);
      } catch (e) {
        alert("Sync failed: " + (e.message || ""));
      } finally {
        btn.textContent = "Sync to Sheet";
        btn.disabled = false;
      }
    }

    async function loadPlanningTab(tab) {
      const body = document.getElementById("content-sheet-body");
      body.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';
      try {
        const data = await api("/content-management/clients/" + contentCurrentSlug + "/planning/" + tab);
        sheetCurrentData = data;
        updateSyncStatus(data);
        body.innerHTML = renderPlanningTable(data, "No data found for this tab.");
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
