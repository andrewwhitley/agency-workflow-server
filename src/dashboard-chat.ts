/**
 * Chat workspace view for the dashboard.
 * Returns HTML and JS to be embedded in the main dashboard.
 */

export function getChatViewHtml(): string {
  return `
      <!-- ═══ Workspace (Chat) View ═══ -->
      <div id="view-workspace" class="hidden">
        <div class="workspace-layout">
          <!-- Thread Sidebar -->
          <div class="thread-sidebar">
            <div class="thread-sidebar-header">
              <h3>Conversations</h3>
              <button class="btn btn-primary btn-sm" onclick="openNewThreadDialog()">+ New</button>
            </div>
            <div class="thread-search-box">
              <input type="text" placeholder="Search threads..." id="thread-search" oninput="filterThreads(this.value)" />
            </div>
            <div id="thread-list" class="thread-list"></div>
          </div>

          <!-- Chat Area -->
          <div class="chat-area" id="chat-area">
            <div class="mobile-chat-header">
              <button onclick="showMobileThreadList()">&#8592; Threads</button>
              <span id="mobile-chat-title" style="font-weight:600;font-size:14px;"></span>
            </div>
            <div id="chat-empty-state" class="chat-empty-state">
              <div style="font-size:48px;margin-bottom:16px;">&#128172;</div>
              <h2>AI Workspace</h2>
              <p style="color:var(--text-muted);margin-bottom:24px;">Start a conversation with an AI agent</p>
              <div id="template-cards" class="template-cards"></div>
            </div>

            <div id="chat-active" class="hidden" style="display:flex;flex-direction:column;height:100%;">
              <!-- Chat Header -->
              <div class="chat-header-bar">
                <div>
                  <div class="chat-thread-title" id="chat-thread-title">Thread</div>
                  <div class="chat-thread-meta" id="chat-thread-meta"></div>
                </div>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-ghost btn-sm" onclick="exportThread()" title="Export as Markdown">Export</button>
                  <button class="btn btn-ghost btn-sm" onclick="deleteCurrentThread()" title="Delete thread" style="color:var(--red);">Delete</button>
                </div>
              </div>

              <!-- Messages -->
              <div class="chat-messages" id="chat-messages"></div>

              <!-- Token usage -->
              <div class="chat-token-usage hidden" id="chat-token-usage"></div>

              <!-- Input -->
              <div class="chat-input-area">
                <textarea
                  id="chat-input"
                  class="chat-textarea"
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  rows="1"
                  onkeydown="handleChatKeydown(event)"
                  oninput="autoResizeTextarea(this)"
                ></textarea>
                <button class="btn btn-primary chat-send-btn" id="chat-send-btn" onclick="sendMessage()">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- New Thread Dialog -->
      <div class="modal-overlay" id="new-thread-overlay" onclick="if(event.target===this)closeNewThreadDialog()">
        <div class="modal" style="max-width:500px;">
          <h2>New Conversation</h2>
          <div class="subtitle">Choose an agent and optionally assign a client</div>
          <div class="form-group">
            <label>Agent *</label>
            <select id="new-thread-agent"></select>
          </div>
          <div class="form-group">
            <label>Client (optional)</label>
            <input type="text" id="new-thread-client" placeholder="e.g. Acme Corp" />
          </div>
          <div id="template-quick-start" style="margin-bottom:16px;"></div>
          <div class="btn-row">
            <button class="btn btn-primary" onclick="createNewThread()">Start Conversation</button>
            <button class="btn btn-ghost" onclick="closeNewThreadDialog()">Cancel</button>
          </div>
        </div>
      </div>
  `;
}

export function getChatViewCss(): string {
  return `
    /* ── Workspace Layout ────────────────────────────── */

    .workspace-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      height: 100vh;
      margin: -32px -40px;
      overflow: hidden;
    }

    .mobile-chat-header {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .mobile-chat-header button {
      background: none;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      padding: 4px 10px;
      cursor: pointer;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .workspace-layout {
        grid-template-columns: 1fr;
        margin: -20px -16px;
      }
      .thread-sidebar {
        position: absolute;
        inset: 0;
        z-index: 10;
        background: var(--bg);
      }
      .thread-sidebar.hidden-mobile { display: none; }
      .chat-area.hidden-mobile { display: none; }
      .mobile-chat-header { display: flex; }
    }

    /* ── Thread Sidebar ──────────────────────────────── */

    .thread-sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .thread-sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }

    .thread-sidebar-header h3 {
      font-size: 14px;
      font-weight: 600;
    }

    .thread-search-box {
      padding: 8px 12px;
    }

    .thread-search-box input {
      width: 100%;
      padding: 8px 12px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      font-family: inherit;
      font-size: 12px;
      outline: none;
    }

    .thread-search-box input:focus { border-color: var(--accent); }

    .thread-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 8px;
    }

    .thread-item {
      padding: 12px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
      margin-bottom: 2px;
    }

    .thread-item:hover { background: var(--surface-2); }
    .thread-item.active { background: var(--accent); color: white; }

    .thread-item-title {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .thread-item-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--text-dim);
    }

    .thread-item.active .thread-item-meta { color: rgba(255,255,255,0.7); }

    .thread-item-client {
      background: var(--surface-3);
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .thread-item.active .thread-item-client { background: rgba(255,255,255,0.2); }

    /* ── Chat Area ───────────────────────────────────── */

    .chat-area {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 40px;
    }

    .template-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      max-width: 600px;
      width: 100%;
    }

    .template-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 16px;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }

    .template-card:hover { border-color: var(--accent); transform: translateY(-1px); }

    .template-card-name {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .template-card-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* ── Chat Header ─────────────────────────────────── */

    .chat-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .chat-thread-title {
      font-size: 15px;
      font-weight: 600;
    }

    .chat-thread-meta {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 2px;
    }

    /* ── Messages ────────────────────────────────────── */

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .chat-msg {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13.5px;
      line-height: 1.6;
      word-wrap: break-word;
    }

    .chat-msg.user {
      align-self: flex-end;
      background: var(--accent);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .chat-msg.assistant {
      align-self: flex-start;
      background: var(--surface);
      border: 1px solid var(--border);
      border-bottom-left-radius: 4px;
    }

    .chat-msg.assistant .copy-btn {
      display: none;
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 2px 8px;
      font-size: 10px;
      background: var(--surface-3);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
    }

    .chat-msg.assistant {
      position: relative;
    }

    .chat-msg.assistant:hover .copy-btn { display: block; }

    .chat-msg-time {
      font-size: 10px;
      color: var(--text-dim);
      margin-top: 4px;
    }

    .chat-msg.user .chat-msg-time { color: rgba(255,255,255,0.5); }

    .chat-streaming-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      animation: pulse 1s infinite;
    }

    /* ── Markdown in messages ─────────────────────────── */

    .chat-msg.assistant code {
      background: var(--surface-2);
      padding: 1px 5px;
      border-radius: 3px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }

    .chat-msg.assistant pre {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 12px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .chat-msg.assistant pre code {
      background: none;
      padding: 0;
    }

    .chat-msg.assistant strong { font-weight: 600; }
    .chat-msg.assistant em { font-style: italic; }

    .chat-msg.assistant ul, .chat-msg.assistant ol {
      padding-left: 20px;
      margin: 4px 0;
    }

    /* ── Token Usage ─────────────────────────────────── */

    .chat-token-usage {
      padding: 4px 20px;
      font-size: 10px;
      color: var(--text-dim);
      text-align: right;
      background: var(--surface);
      border-top: 1px solid var(--border);
    }

    /* ── Input Area ──────────────────────────────────── */

    .chat-input-area {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px 20px;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }

    .chat-textarea {
      flex: 1;
      padding: 10px 14px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text);
      font-family: inherit;
      font-size: 13.5px;
      outline: none;
      resize: none;
      max-height: 150px;
      line-height: 1.5;
    }

    .chat-textarea:focus { border-color: var(--accent); }

    .chat-send-btn {
      height: 40px;
      flex-shrink: 0;
    }
  `;
}

export function getChatViewJs(): string {
  return `
    // ─── Mobile Thread/Chat Toggle ─────────────────────
    function showMobileChat() {
      document.querySelector(".thread-sidebar")?.classList.add("hidden-mobile");
      document.querySelector(".chat-area")?.classList.remove("hidden-mobile");
    }
    function showMobileThreadList() {
      document.querySelector(".thread-sidebar")?.classList.remove("hidden-mobile");
      document.querySelector(".chat-area")?.classList.add("hidden-mobile");
    }

    // ─── Chat State ──────────────────────────────────────
    let chatThreads = [];
    let currentThreadId = null;
    let chatAgents = [];
    let chatTemplates = [];
    let isStreaming = false;
    let allThreadsCache = [];

    // ─── Chat Init ───────────────────────────────────────
    async function initChat() {
      try {
        [chatAgents, chatThreads, chatTemplates] = await Promise.all([
          api("/agents"),
          api("/threads?archived=false"),
          api("/thread-templates").catch(() => []),
        ]);
        allThreadsCache = chatThreads;
        renderThreadList();
        renderTemplateCards();
      } catch (err) {
        console.error("Failed to init chat:", err);
      }
    }

    // ─── Thread List ─────────────────────────────────────
    function renderThreadList() {
      const list = document.getElementById("thread-list");
      if (!chatThreads.length) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px;">No conversations yet</div>';
        return;
      }
      list.innerHTML = chatThreads.map(t => {
        const timeAgo = getTimeAgo(t.last_message_at || t.created_at);
        return \`<div class="thread-item \${t.id === currentThreadId ? 'active' : ''}" onclick="openThread('\${t.id}')">
          <div class="thread-item-title">\${escapeHtml(t.title || 'New conversation')}</div>
          <div class="thread-item-meta">
            \${t.client ? '<span class="thread-item-client">' + escapeHtml(t.client) + '</span>' : ''}
            <span>\${t.agent_name || 'Agent'}</span>
            <span style="margin-left:auto;">\${timeAgo}</span>
            <span>\${t.message_count || 0} msgs</span>
          </div>
        </div>\`;
      }).join("");
    }

    function filterThreads(query) {
      if (!query) {
        chatThreads = allThreadsCache;
      } else {
        const q = query.toLowerCase();
        chatThreads = allThreadsCache.filter(t =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.client || '').toLowerCase().includes(q) ||
          (t.agent_name || '').toLowerCase().includes(q)
        );
      }
      renderThreadList();
    }

    // ─── Template Cards ──────────────────────────────────
    function renderTemplateCards() {
      const container = document.getElementById("template-cards");
      if (!container) return;

      let html = '<div class="template-card" onclick="openNewThreadDialog()">' +
        '<div class="template-card-name">+ Blank Conversation</div>' +
        '<div class="template-card-desc">Start a new chat with any agent</div></div>';

      html += chatTemplates.map(t =>
        \`<div class="template-card" onclick="createFromTemplate('\${t.id}')">
          <div class="template-card-name">\${escapeHtml(t.name)}</div>
          <div class="template-card-desc">\${escapeHtml(t.description)}</div>
        </div>\`
      ).join("");

      container.innerHTML = html;
    }

    // ─── Open Thread ─────────────────────────────────────
    async function openThread(threadId) {
      currentThreadId = threadId;
      renderThreadList();

      document.getElementById("chat-empty-state").classList.add("hidden");
      const active = document.getElementById("chat-active");
      active.classList.remove("hidden");
      active.style.display = "flex";

      const thread = chatThreads.find(t => t.id === threadId);
      const title = thread?.title || "New conversation";
      document.getElementById("chat-thread-title").textContent = title;
      document.getElementById("chat-thread-meta").textContent =
        (thread?.agent_name || "Agent") + (thread?.client ? " \u2022 " + thread.client : "");

      // Update mobile header and switch to chat view
      const mobileTitleEl = document.getElementById("mobile-chat-title");
      if (mobileTitleEl) mobileTitleEl.textContent = title;
      showMobileChat();

      // Load messages
      try {
        const messages = await api("/threads/" + threadId + "/messages");
        renderMessages(messages);
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    }

    // ─── Render Messages ─────────────────────────────────
    function renderMessages(messages) {
      const container = document.getElementById("chat-messages");
      container.innerHTML = messages.map(m => \`
        <div class="chat-msg \${m.role}">
          \${m.role === 'assistant' ? '<button class="copy-btn" onclick="copyMessage(this)">Copy</button>' : ''}
          <div class="chat-msg-content">\${m.role === 'assistant' ? renderMarkdown(m.content) : escapeHtml(m.content)}</div>
          <div class="chat-msg-time">\${new Date(m.created_at).toLocaleTimeString()}</div>
        </div>
      \`).join("");
      container.scrollTop = container.scrollHeight;
    }

    // ─── Send Message ────────────────────────────────────
    async function sendMessage() {
      if (isStreaming || !currentThreadId) return;
      const input = document.getElementById("chat-input");
      const content = input.value.trim();
      if (!content) return;

      input.value = "";
      input.style.height = "auto";
      isStreaming = true;

      const sendBtn = document.getElementById("chat-send-btn");
      sendBtn.disabled = true;
      sendBtn.textContent = "...";

      // Add user message to UI
      const container = document.getElementById("chat-messages");
      container.innerHTML += \`
        <div class="chat-msg user">
          <div class="chat-msg-content">\${escapeHtml(content)}</div>
          <div class="chat-msg-time">\${new Date().toLocaleTimeString()}</div>
        </div>
      \`;
      container.scrollTop = container.scrollHeight;

      // Add streaming assistant message
      container.innerHTML += \`
        <div class="chat-msg assistant" id="streaming-msg">
          <div class="chat-msg-content"><span class="chat-streaming-indicator"></span></div>
        </div>
      \`;
      container.scrollTop = container.scrollHeight;

      try {
        const response = await fetch("/api/threads/" + currentThreadId + "/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (response.status === 401) { window.location.href = "/auth/login"; return; }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";
        let lastUsage = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              if (event.type === "text") {
                fullText += event.content;
                const msgEl = document.getElementById("streaming-msg");
                if (msgEl) {
                  msgEl.querySelector(".chat-msg-content").innerHTML = renderMarkdown(fullText);
                  container.scrollTop = container.scrollHeight;
                }
              } else if (event.type === "done") {
                lastUsage = event.usage;
              } else if (event.type === "error") {
                const msgEl = document.getElementById("streaming-msg");
                if (msgEl) {
                  msgEl.querySelector(".chat-msg-content").innerHTML =
                    '<span style="color:var(--red);">Error: ' + escapeHtml(event.content) + '</span>';
                }
              }
            } catch { /* skip malformed lines */ }
          }
        }

        // Finalize streaming message
        const msgEl = document.getElementById("streaming-msg");
        if (msgEl) {
          msgEl.removeAttribute("id");
          msgEl.innerHTML = '<button class="copy-btn" onclick="copyMessage(this)">Copy</button>' +
            '<div class="chat-msg-content">' + renderMarkdown(fullText) + '</div>' +
            '<div class="chat-msg-time">' + new Date().toLocaleTimeString() + '</div>';
        }

        // Show token usage
        if (lastUsage) {
          const usageEl = document.getElementById("chat-token-usage");
          usageEl.classList.remove("hidden");
          usageEl.textContent = "Tokens: " + lastUsage.input_tokens + " in / " + lastUsage.output_tokens + " out";
        }

        // Refresh thread list (title may have been auto-generated)
        setTimeout(async () => {
          chatThreads = await api("/threads?archived=false");
          allThreadsCache = chatThreads;
          renderThreadList();
        }, 1000);

      } catch (err) {
        console.error("Send message error:", err);
        const msgEl = document.getElementById("streaming-msg");
        if (msgEl) {
          msgEl.querySelector(".chat-msg-content").innerHTML =
            '<span style="color:var(--red);">Failed to send message</span>';
          msgEl.removeAttribute("id");
        }
      }

      isStreaming = false;
      sendBtn.disabled = false;
      sendBtn.textContent = "Send";
    }

    function handleChatKeydown(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }

    function autoResizeTextarea(el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 150) + "px";
    }

    // ─── New Thread ──────────────────────────────────────
    function openNewThreadDialog() {
      const select = document.getElementById("new-thread-agent");
      select.innerHTML = chatAgents.map(a =>
        '<option value="' + a.id + '">' + escapeHtml(a.name) + ' - ' + escapeHtml(a.description || '') + '</option>'
      ).join("");

      // Template quick-start buttons
      const quickStart = document.getElementById("template-quick-start");
      if (chatTemplates.length) {
        quickStart.innerHTML = '<div class="nav-label" style="margin-bottom:8px;">Quick Start Templates</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          chatTemplates.map(t =>
            '<button class="pill" onclick="closeNewThreadDialog();createFromTemplate(\\'' + t.id + '\\')">' + escapeHtml(t.name) + '</button>'
          ).join("") + '</div>';
      } else {
        quickStart.innerHTML = "";
      }

      document.getElementById("new-thread-overlay").classList.add("open");
    }

    function closeNewThreadDialog() {
      document.getElementById("new-thread-overlay").classList.remove("open");
    }

    async function createNewThread() {
      const agentId = document.getElementById("new-thread-agent").value;
      const client = document.getElementById("new-thread-client").value.trim();

      try {
        const thread = await apiPost("/threads", {
          agent_id: agentId,
          client: client || undefined,
        });
        closeNewThreadDialog();
        chatThreads = await api("/threads?archived=false");
        allThreadsCache = chatThreads;
        renderThreadList();
        openThread(thread.id);
      } catch (err) {
        console.error("Create thread error:", err);
        alert("Failed to create thread");
      }
    }

    async function createFromTemplate(templateId) {
      try {
        const result = await apiPost("/threads/from-template/" + templateId, {});
        chatThreads = await api("/threads?archived=false");
        allThreadsCache = chatThreads;
        renderThreadList();
        openThread(result.thread.id);
      } catch (err) {
        console.error("Create from template error:", err);
        alert("Failed to create from template");
      }
    }

    // ─── Thread Actions ──────────────────────────────────
    async function deleteCurrentThread() {
      if (!currentThreadId) return;
      if (!confirm("Delete this conversation? This cannot be undone.")) return;

      try {
        await fetch("/api/threads/" + currentThreadId, { method: "DELETE" });
        currentThreadId = null;
        chatThreads = await api("/threads?archived=false");
        allThreadsCache = chatThreads;
        renderThreadList();
        document.getElementById("chat-active").classList.add("hidden");
        document.getElementById("chat-active").style.display = "none";
        document.getElementById("chat-empty-state").classList.remove("hidden");
      } catch (err) {
        console.error("Delete thread error:", err);
      }
    }

    async function exportThread() {
      if (!currentThreadId) return;
      try {
        const messages = await api("/threads/" + currentThreadId + "/messages");
        const thread = chatThreads.find(t => t.id === currentThreadId);
        let md = "# " + (thread?.title || "Conversation") + "\\n\\n";
        md += "Agent: " + (thread?.agent_name || "Unknown") + "\\n";
        if (thread?.client) md += "Client: " + thread.client + "\\n";
        md += "Date: " + new Date().toLocaleDateString() + "\\n\\n---\\n\\n";

        for (const m of messages) {
          md += "**" + (m.role === "user" ? "User" : "Assistant") + "** (" + new Date(m.created_at).toLocaleTimeString() + "):\\n\\n";
          md += m.content + "\\n\\n---\\n\\n";
        }

        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = (thread?.title || "conversation") + ".md";
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Export error:", err);
      }
    }

    function copyMessage(btn) {
      const content = btn.parentElement.querySelector(".chat-msg-content").textContent;
      navigator.clipboard.writeText(content).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 1500);
      });
    }

    // ─── Simple Markdown Renderer ────────────────────────
    function renderMarkdown(text) {
      let html = escapeHtml(text);

      // Code blocks
      html = html.replace(/` + '`' + '`' + '`' + `([\\s\\S]*?)` + '`' + '`' + '`' + `/g, '<pre><code>$1</code></pre>');

      // Inline code
      html = html.replace(/` + '`' + `([^` + '`' + `]+)` + '`' + `/g, '<code>$1</code>');

      // Bold
      html = html.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');

      // Italic
      html = html.replace(/\\*(.+?)\\*/g, '<em>$1</em>');

      // Line breaks
      html = html.replace(/\\n/g, '<br/>');

      return html;
    }

    // ─── Helpers ─────────────────────────────────────────
    function getTimeAgo(dateStr) {
      if (!dateStr) return "";
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "now";
      if (mins < 60) return mins + "m";
      const hours = Math.floor(mins / 60);
      if (hours < 24) return hours + "h";
      const days = Math.floor(hours / 24);
      if (days < 7) return days + "d";
      return new Date(dateStr).toLocaleDateString();
    }
  `;
}
