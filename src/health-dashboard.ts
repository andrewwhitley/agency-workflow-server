/**
 * Health Dashboard SPA — Functional Medicine Family Health Dashboard.
 * All HTML/CSS/JS is inline in TypeScript (no separate frontend build).
 */

import type { SessionUser } from "./oauth.js";

// ─── Helpers ────────────────────────────────────────────────

function getStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --surface2: #283548;
      --border: #334155;
      --primary: #10b981;
      --primary-hover: #059669;
      --primary-muted: rgba(16,185,129,0.15);
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --accent-muted: rgba(99,102,241,0.15);
      --text: #f1f5f9;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --danger: #ef4444;
      --danger-hover: #dc2626;
      --warning: #f59e0b;
      --success: #10b981;
      --optimal: #10b981;
      --acceptable: #f59e0b;
      --out-of-range: #ef4444;
      --sidebar-width: 280px;
      --topbar-height: 0px;
      --radius: 12px;
      --radius-sm: 8px;
      --shadow: 0 4px 24px rgba(0,0,0,0.3);
    }

    html, body {
      height: 100%; width: 100%; overflow: hidden;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg); color: var(--text);
      font-size: 14px; line-height: 1.6;
    }

    a { color: var(--primary); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ─── Layout ─────────────────────────────── */
    .app { display: flex; height: 100vh; overflow: hidden; }

    .sidebar {
      width: var(--sidebar-width); min-width: var(--sidebar-width);
      background: var(--surface); border-right: 1px solid var(--border);
      display: flex; flex-direction: column; height: 100vh;
      overflow: hidden; transition: transform 0.3s ease;
      z-index: 100;
    }

    .sidebar-header {
      padding: 20px 20px 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 10px;
    }

    .sidebar-logo {
      font-size: 20px; font-weight: 700; color: var(--primary);
      display: flex; align-items: center; gap: 8px;
    }

    .sidebar-logo .heart { color: #ef4444; font-size: 22px; }

    .sidebar-section { padding: 12px 16px 4px; }
    .sidebar-section-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted); margin-bottom: 6px;
    }

    .sidebar-members {
      flex: 0 0 auto; max-height: 200px; overflow-y: auto;
      padding: 8px 12px;
    }

    .member-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; border-radius: var(--radius-sm);
      cursor: pointer; transition: background 0.15s; margin-bottom: 2px;
    }
    .member-item:hover { background: var(--surface2); }
    .member-item.active { background: var(--primary-muted); color: var(--primary); }

    .member-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 13px; color: #fff; flex-shrink: 0;
    }

    .member-name { font-size: 13px; font-weight: 500; }
    .member-role { font-size: 11px; color: var(--text-muted); }

    .sidebar-nav {
      flex: 1 1 auto; overflow-y: auto; padding: 8px 12px;
    }

    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: var(--radius-sm);
      cursor: pointer; transition: background 0.15s;
      font-size: 13px; font-weight: 500; color: var(--text-secondary);
      margin-bottom: 1px;
    }
    .nav-item:hover { background: var(--surface2); color: var(--text); }
    .nav-item.active { background: var(--primary-muted); color: var(--primary); }
    .nav-icon { width: 18px; text-align: center; font-size: 15px; }

    .sidebar-footer {
      padding: 12px 16px; border-top: 1px solid var(--border);
      display: flex; align-items: center; gap: 10px;
    }

    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--accent); display: flex; align-items: center;
      justify-content: center; font-weight: 600; font-size: 12px;
      overflow: hidden;
    }
    .user-avatar img { width: 100%; height: 100%; object-fit: cover; }

    .user-info { flex: 1; min-width: 0; }
    .user-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .logout-btn {
      font-size: 11px; color: var(--text-muted); background: none;
      border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px;
    }
    .logout-btn:hover { color: var(--danger); background: rgba(239,68,68,0.1); }

    .add-member-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: calc(100% - 24px); margin: 8px 12px;
      padding: 8px; border-radius: var(--radius-sm);
      background: var(--primary-muted); color: var(--primary);
      border: 1px dashed var(--primary); cursor: pointer;
      font-size: 12px; font-weight: 600; transition: background 0.15s;
    }
    .add-member-btn:hover { background: rgba(16,185,129,0.25); }

    /* ─── Main Content ───────────────────────── */
    .main {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      background: var(--bg); padding: 0;
    }

    .main-header {
      padding: 20px 32px 0;
      display: flex; align-items: center; justify-content: space-between;
    }

    .main-header h1 {
      font-size: 22px; font-weight: 700;
      display: flex; align-items: center; gap: 10px;
    }

    .main-content { padding: 20px 32px 32px; }

    .view { display: none; }
    .view.active { display: block; }

    /* ─── Cards ──────────────────────────────── */
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px; margin-bottom: 16px;
    }

    .card-title {
      font-size: 14px; font-weight: 600; margin-bottom: 12px;
      display: flex; align-items: center; gap: 8px; color: var(--text-secondary);
    }

    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }

    .stat-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 0; border-bottom: 1px solid var(--border);
    }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { font-size: 12px; color: var(--text-muted); }
    .stat-value { font-size: 13px; font-weight: 600; }

    /* ─── Badges ─────────────────────────────── */
    .badge {
      display: inline-block; padding: 2px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 600;
    }
    .badge-primary { background: var(--primary-muted); color: var(--primary); }
    .badge-accent { background: var(--accent-muted); color: var(--accent); }
    .badge-success { background: rgba(16,185,129,0.15); color: var(--optimal); }
    .badge-warning { background: rgba(245,158,11,0.15); color: var(--acceptable); }
    .badge-danger { background: rgba(239,68,68,0.15); color: var(--out-of-range); }
    .badge-neutral { background: var(--surface2); color: var(--text-secondary); }

    .tag {
      display: inline-block; padding: 3px 10px; border-radius: 6px;
      font-size: 12px; background: var(--surface2); color: var(--text-secondary);
      margin: 2px 4px 2px 0;
    }

    .role-badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .role-adult { background: var(--accent-muted); color: var(--accent); }
    .role-child { background: rgba(245,158,11,0.15); color: var(--warning); }

    /* ─── Buttons ────────────────────────────── */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 8px 16px; border-radius: var(--radius-sm);
      font-size: 13px; font-weight: 600; border: none; cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      font-family: inherit;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--primary-hover); }

    .btn-accent { background: var(--accent); color: #fff; }
    .btn-accent:hover:not(:disabled) { background: var(--accent-hover); }

    .btn-outline {
      background: transparent; border: 1px solid var(--border); color: var(--text-secondary);
    }
    .btn-outline:hover:not(:disabled) { background: var(--surface2); color: var(--text); }

    .btn-danger { background: var(--danger); color: #fff; }
    .btn-danger:hover:not(:disabled) { background: var(--danger-hover); }

    .btn-sm { padding: 5px 12px; font-size: 12px; }
    .btn-icon { padding: 6px 8px; }

    /* ─── Forms ──────────────────────────────── */
    .form-group { margin-bottom: 14px; }
    .form-label {
      display: block; font-size: 12px; font-weight: 600;
      margin-bottom: 4px; color: var(--text-secondary);
    }
    .form-hint { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .form-input, .form-select, .form-textarea {
      width: 100%; padding: 8px 12px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: var(--bg);
      color: var(--text); font-size: 13px; font-family: inherit;
      transition: border-color 0.15s;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none; border-color: var(--primary);
    }
    .form-textarea { resize: vertical; min-height: 70px; }
    .form-select { appearance: auto; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

    /* ─── Modal ──────────────────────────────── */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: none; align-items: flex-start; justify-content: center;
      z-index: 1000; padding: 40px 20px; overflow-y: auto;
    }
    .modal-overlay.active { display: flex; }

    .modal {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); width: 100%; max-width: 600px;
      padding: 24px; box-shadow: var(--shadow);
    }
    .modal-wide { max-width: 800px; }

    .modal-title {
      font-size: 18px; font-weight: 700; margin-bottom: 20px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .modal-close {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 20px; padding: 4px 8px; border-radius: 4px;
    }
    .modal-close:hover { color: var(--text); background: var(--surface2); }

    .modal-actions {
      display: flex; justify-content: flex-end; gap: 10px;
      margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);
    }

    /* ─── Toast ──────────────────────────────── */
    .toast-container {
      position: fixed; top: 20px; right: 20px; z-index: 2000;
      display: flex; flex-direction: column; gap: 8px;
    }
    .toast {
      padding: 10px 18px; border-radius: var(--radius-sm);
      font-size: 13px; font-weight: 500; box-shadow: var(--shadow);
      animation: slideIn 0.3s ease;
    }
    .toast-success { background: var(--primary); color: #fff; }
    .toast-error { background: var(--danger); color: #fff; }
    .toast-info { background: var(--accent); color: #fff; }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    /* ─── Welcome ────────────────────────────── */
    .welcome {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; min-height: 60vh; text-align: center;
    }
    .welcome-icon { font-size: 64px; margin-bottom: 20px; }
    .welcome h2 { font-size: 24px; margin-bottom: 8px; }
    .welcome p { color: var(--text-secondary); margin-bottom: 24px; max-width: 400px; }

    /* ─── Profile ────────────────────────────── */
    .profile-header {
      display: flex; align-items: center; gap: 20px;
      margin-bottom: 20px; padding: 20px;
      background: var(--surface); border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    .profile-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    .profile-info { flex: 1; }
    .profile-name { font-size: 22px; font-weight: 700; }
    .profile-meta { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }

    .goals-list { list-style: none; }
    .goals-list li {
      padding: 6px 0; font-size: 13px;
      display: flex; align-items: flex-start; gap: 8px;
    }
    .goals-list li::before { content: "\\2713"; color: var(--primary); font-weight: 700; }

    /* ─── Lab Results ────────────────────────── */
    .lab-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); margin-bottom: 12px; overflow: hidden;
    }
    .lab-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; cursor: pointer; transition: background 0.15s;
    }
    .lab-header:hover { background: var(--surface2); }
    .lab-date { font-weight: 600; font-size: 14px; }
    .lab-meta { font-size: 12px; color: var(--text-muted); }
    .lab-toggle { color: var(--text-muted); transition: transform 0.2s; font-size: 16px; }
    .lab-toggle.open { transform: rotate(180deg); }

    .lab-body { display: none; padding: 0 18px 14px; }
    .lab-body.open { display: block; }

    .marker-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    .marker-row:last-child { border-bottom: none; }
    .marker-name { font-weight: 500; flex: 1; }
    .marker-value { font-weight: 600; margin: 0 12px; }
    .marker-unit { color: var(--text-muted); font-size: 12px; margin-right: 10px; min-width: 50px; }
    .marker-range { font-size: 11px; color: var(--text-muted); min-width: 100px; text-align: right; margin-right: 10px; }

    .marker-trend-btn {
      background: none; border: none; color: var(--accent);
      cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px;
    }
    .marker-trend-btn:hover { background: var(--accent-muted); }

    /* ─── Markers dynamic entry ──────────────── */
    .marker-entry {
      display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px;
      align-items: end; margin-bottom: 8px; padding: 10px;
      background: var(--bg); border-radius: var(--radius-sm);
    }
    .marker-entry .form-group { margin-bottom: 0; }

    .add-marker-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px; color: var(--primary); cursor: pointer;
      background: none; border: 1px dashed var(--border); border-radius: var(--radius-sm);
      font-size: 12px; font-weight: 600; width: 100%; justify-content: center;
      margin-top: 4px;
    }
    .add-marker-btn:hover { border-color: var(--primary); background: var(--primary-muted); }

    /* ─── Chart container ────────────────────── */
    .chart-container {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px; margin-bottom: 16px;
    }
    .chart-container canvas { max-height: 300px; }

    /* ─── Symptoms ───────────────────────────── */
    .symptom-card {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 18px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius);
      margin-bottom: 8px;
    }
    .symptom-severity {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    .symptom-info { flex: 1; }
    .symptom-name { font-weight: 600; font-size: 14px; }
    .symptom-meta { font-size: 12px; color: var(--text-muted); }
    .symptom-delete {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 16px; padding: 4px;
    }
    .symptom-delete:hover { color: var(--danger); }

    /* ─── Protocols ──────────────────────────── */
    .protocol-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px; margin-bottom: 10px;
    }
    .protocol-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 8px;
    }
    .protocol-name { font-weight: 600; font-size: 14px; }
    .protocol-detail { font-size: 12px; color: var(--text-secondary); }
    .protocol-actions { display: flex; gap: 6px; }

    .status-dot {
      display: inline-block; width: 8px; height: 8px;
      border-radius: 50%; margin-right: 6px;
    }
    .status-active { background: var(--primary); }
    .status-paused { background: var(--warning); }
    .status-completed { background: var(--text-muted); }

    /* ─── Diet ───────────────────────────────── */
    .diet-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 14px 18px; margin-bottom: 8px;
    }
    .diet-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 6px;
    }
    .diet-type {
      font-weight: 600; font-size: 13px; text-transform: capitalize;
    }
    .diet-date { font-size: 12px; color: var(--text-muted); }
    .diet-description { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
    .diet-tags { display: flex; flex-wrap: wrap; gap: 4px; }
    .diet-energy { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .diet-delete {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 14px; padding: 2px 4px;
    }
    .diet-delete:hover { color: var(--danger); }

    /* ─── Chat ───────────────────────────────── */
    .chat-layout { display: flex; height: calc(100vh - 100px); gap: 0; }

    .chat-sidebar {
      width: 260px; min-width: 260px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius) 0 0 var(--radius);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .chat-sidebar-header {
      padding: 14px 16px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .chat-sidebar-header h3 { font-size: 14px; font-weight: 600; }
    .chat-list { flex: 1; overflow-y: auto; padding: 8px; }

    .chat-list-item {
      padding: 10px 12px; border-radius: var(--radius-sm);
      cursor: pointer; margin-bottom: 4px; transition: background 0.15s;
    }
    .chat-list-item:hover { background: var(--surface2); }
    .chat-list-item.active { background: var(--primary-muted); }
    .chat-list-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .chat-list-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .chat-list-actions { display: flex; gap: 4px; margin-top: 4px; }

    .chat-main {
      flex: 1; display: flex; flex-direction: column;
      border: 1px solid var(--border); border-left: none;
      border-radius: 0 var(--radius) var(--radius) 0;
      background: var(--bg); overflow: hidden;
    }

    .chat-messages {
      flex: 1; overflow-y: auto; padding: 20px;
      display: flex; flex-direction: column; gap: 12px;
    }

    .chat-msg {
      max-width: 80%; padding: 12px 16px; border-radius: 12px;
      font-size: 13px; line-height: 1.6; white-space: pre-wrap;
      word-wrap: break-word;
    }
    .chat-msg-user {
      align-self: flex-end; background: var(--primary);
      color: #fff; border-bottom-right-radius: 4px;
    }
    .chat-msg-assistant {
      align-self: flex-start; background: var(--surface);
      border: 1px solid var(--border); border-bottom-left-radius: 4px;
    }
    .chat-msg-typing {
      align-self: flex-start; background: var(--surface);
      border: 1px solid var(--border); border-bottom-left-radius: 4px;
      color: var(--text-muted); font-style: italic;
    }

    .chat-input-area {
      padding: 12px 16px; border-top: 1px solid var(--border);
      display: flex; gap: 10px; align-items: flex-end;
      background: var(--surface);
    }
    .chat-input {
      flex: 1; padding: 10px 14px; border-radius: var(--radius-sm);
      border: 1px solid var(--border); background: var(--bg);
      color: var(--text); font-size: 13px; font-family: inherit;
      resize: none; max-height: 120px; min-height: 40px;
    }
    .chat-input:focus { outline: none; border-color: var(--primary); }

    .chat-empty {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: var(--text-muted); gap: 8px;
    }
    .chat-empty-icon { font-size: 48px; }

    /* ─── Knowledge ──────────────────────────── */
    .knowledge-card {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 18px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius);
      margin-bottom: 8px;
    }
    .knowledge-icon { font-size: 28px; }
    .knowledge-info { flex: 1; }
    .knowledge-title { font-weight: 600; font-size: 14px; }
    .knowledge-meta { font-size: 12px; color: var(--text-muted); }
    .knowledge-delete {
      background: none; border: none; color: var(--text-muted);
      cursor: pointer; font-size: 16px; padding: 4px;
    }
    .knowledge-delete:hover { color: var(--danger); }

    /* ─── Empty state ────────────────────────── */
    .empty-state {
      text-align: center; padding: 40px 20px; color: var(--text-muted);
    }
    .empty-state-icon { font-size: 40px; margin-bottom: 12px; }
    .empty-state p { font-size: 13px; margin-bottom: 16px; }

    /* ─── Loading ─────────────────────────────── */
    .spinner {
      display: inline-block; width: 18px; height: 18px;
      border: 2px solid var(--border); border-top-color: var(--primary);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .loading-center {
      display: flex; align-items: center; justify-content: center;
      padding: 40px; gap: 10px; color: var(--text-muted);
    }

    /* ─── Section header ─────────────────────── */
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .section-header h2 { font-size: 18px; font-weight: 700; }

    .section-filter {
      display: flex; gap: 8px; align-items: center;
    }
    .section-filter select { padding: 6px 10px; font-size: 12px; }

    /* ─── Mobile ──────────────────────────────── */
    .mobile-toggle {
      display: none; position: fixed; top: 12px; left: 12px;
      z-index: 200; background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-sm); padding: 8px 10px; cursor: pointer;
      color: var(--text); font-size: 18px;
    }

    @media (max-width: 768px) {
      .mobile-toggle { display: block; }
      .sidebar {
        position: fixed; top: 0; left: 0; bottom: 0;
        transform: translateX(-100%);
      }
      .sidebar.open { transform: translateX(0); }
      .sidebar-backdrop {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 99; display: none;
      }
      .sidebar-backdrop.active { display: block; }
      .main-content { padding: 20px 16px; }
      .main-header { padding: 16px 16px 0; padding-left: 52px; }
      .chat-layout { flex-direction: column; height: calc(100vh - 140px); }
      .chat-sidebar { width: 100%; min-width: unset; border-radius: var(--radius) var(--radius) 0 0; max-height: 200px; }
      .chat-main { border-left: 1px solid var(--border); border-radius: 0 0 var(--radius) var(--radius); }
      .form-row { grid-template-columns: 1fr; }
      .form-row-3 { grid-template-columns: 1fr; }
      .marker-entry { grid-template-columns: 1fr 1fr; }
    }

    /* ─── Scrollbar ──────────────────────────── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
  `;
}


function getScript(): string {
  return `
    /* ─── State ──────────────────────────────── */
    var state = {
      members: [],
      currentMember: null,
      currentView: 'profile',
      labs: [],
      symptoms: [],
      protocols: [],
      diet: [],
      references: null,
      charts: {},
      conversations: [],
      currentConversation: null,
      chatMessages: [],
      streaming: false
    };

    /* ─── Utilities ──────────────────────────── */
    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function api(path, opts) {
      var defaults = { headers: { 'Content-Type': 'application/json' } };
      var merged = Object.assign({}, defaults, opts || {});
      if (opts && opts.headers) {
        merged.headers = Object.assign({}, defaults.headers, opts.headers);
      }
      return fetch('/api/health' + path, merged).then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'Request failed'); });
        return r.json();
      });
    }

    function showToast(msg, type) {
      var container = document.getElementById('toast-container');
      var toast = document.createElement('div');
      toast.className = 'toast toast-' + (type || 'info');
      toast.textContent = msg;
      container.appendChild(toast);
      setTimeout(function() { toast.remove(); }, 4000);
    }

    function showModal(html) {
      var overlay = document.getElementById('modal-overlay');
      document.getElementById('modal-content').innerHTML = html;
      overlay.classList.add('active');
    }

    function hideModal() {
      document.getElementById('modal-overlay').classList.remove('active');
      document.getElementById('modal-content').innerHTML = '';
    }

    function formatDate(d) {
      if (!d) return '';
      var dt = new Date(d);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function calcAge(dob) {
      if (!dob) return null;
      var birth = new Date(dob);
      var now = new Date();
      var age = now.getFullYear() - birth.getFullYear();
      var m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return age;
    }

    function heightDisplay(inches) {
      if (!inches) return '';
      var ft = Math.floor(inches / 12);
      var ins = inches % 12;
      return ft + "'" + ins + '"';
    }

    function severityColor(sev) {
      if (sev <= 3) return 'var(--primary)';
      if (sev <= 6) return 'var(--warning)';
      return 'var(--danger)';
    }

    function markerStatusBadge(value, optLow, optHigh, convLow, convHigh) {
      var v = parseFloat(value);
      if (isNaN(v)) return '<span class="badge badge-neutral">N/A</span>';
      if (optLow != null && optHigh != null && v >= optLow && v <= optHigh) {
        return '<span class="badge badge-success">Optimal</span>';
      }
      if (convLow != null && convHigh != null && v >= convLow && v <= convHigh) {
        return '<span class="badge badge-warning">Acceptable</span>';
      }
      return '<span class="badge badge-danger">Out of Range</span>';
    }

    function destroyChart(name) {
      if (state.charts[name]) {
        state.charts[name].destroy();
        delete state.charts[name];
      }
    }

    /* ─── View Switching ─────────────────────── */
    function showView(name) {
      state.currentView = name;
      var views = document.querySelectorAll('.view');
      for (var i = 0; i < views.length; i++) {
        views[i].classList.remove('active');
      }
      var target = document.getElementById('view-' + name);
      if (target) target.classList.add('active');

      var navItems = document.querySelectorAll('.nav-item');
      for (var i = 0; i < navItems.length; i++) {
        navItems[i].classList.remove('active');
      }
      var activeNav = document.querySelector('.nav-item[data-view="' + name + '"]');
      if (activeNav) activeNav.classList.add('active');

      if (name === 'profile') loadProfile();
      else if (name === 'labs') loadLabs();
      else if (name === 'symptoms') loadSymptoms();
      else if (name === 'protocols') loadProtocols();
      else if (name === 'diet') loadDiet();
      else if (name === 'trends') renderTrends();
      else if (name === 'chat') loadChat();
      else if (name === 'knowledge') loadKnowledge();

      closeMobileSidebar();
    }

    /* ─── Mobile Sidebar ─────────────────────── */
    function toggleMobileSidebar() {
      document.querySelector('.sidebar').classList.toggle('open');
      document.querySelector('.sidebar-backdrop').classList.toggle('active');
    }

    function closeMobileSidebar() {
      document.querySelector('.sidebar').classList.remove('open');
      document.querySelector('.sidebar-backdrop').classList.remove('active');
    }

    /* ─── Members ────────────────────────────── */
    function loadMembers() {
      return api('/family').then(function(data) {
        state.members = data;
        renderMembers();
      }).catch(function(err) {
        showToast('Failed to load family members', 'error');
      });
    }

    function renderMembers() {
      var container = document.getElementById('members-list');
      var html = '';
      for (var i = 0; i < state.members.length; i++) {
        var m = state.members[i];
        var active = state.currentMember && state.currentMember.id === m.id ? ' active' : '';
        var color = m.avatar_color || '#10b981';
        var initial = m.name ? m.name.charAt(0).toUpperCase() : '?';
        html += '<div class="member-item' + active + '" onclick="selectMember(\'' + m.id + '\')">';
        html += '<div class="member-avatar" style="background:' + esc(color) + '">' + esc(initial) + '</div>';
        html += '<div><div class="member-name">' + esc(m.name) + '</div>';
        html += '<div class="member-role">' + esc(m.role || '') + '</div></div>';
        html += '</div>';
      }
      container.innerHTML = html;

      var navEl = document.getElementById('member-nav');
      navEl.style.display = state.currentMember ? 'block' : 'none';

      var welcomeView = document.getElementById('view-welcome');
      if (!state.currentMember && state.members.length === 0) {
        welcomeView.classList.add('active');
      } else if (!state.currentMember && state.members.length > 0) {
        selectMember(state.members[0].id);
      }
    }

    function selectMember(id) {
      var m = null;
      for (var i = 0; i < state.members.length; i++) {
        if (state.members[i].id === id) { m = state.members[i]; break; }
      }
      if (!m) return;
      state.currentMember = m;
      renderMembers();
      document.getElementById('view-welcome').classList.remove('active');
      showView(state.currentView || 'profile');
    }

    function showAddMemberForm(existingMember) {
      var m = existingMember || {};
      var isEdit = !!m.id;
      var title = isEdit ? 'Edit Family Member' : 'Add Family Member';

      var feet = '';
      var inches = '';
      if (m.height_inches) {
        feet = Math.floor(m.height_inches / 12);
        inches = m.height_inches % 12;
      }

      var html = '<div class="modal">';
      html += '<div class="modal-title"><span>' + title + '</span><button class="modal-close" onclick="hideModal()">&times;</button></div>';

      html += '<div class="form-group"><label class="form-label">Name *</label>';
      html += '<input class="form-input" id="fm-name" value="' + esc(m.name || '') + '" placeholder="Full name" /></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Date of Birth</label>';
      html += '<input class="form-input" type="date" id="fm-dob" value="' + esc(m.date_of_birth ? m.date_of_birth.substring(0,10) : '') + '" /></div>';
      html += '<div class="form-group"><label class="form-label">Sex</label>';
      html += '<select class="form-select" id="fm-sex"><option value="">Select...</option>';
      html += '<option value="male"' + (m.sex==='male'?' selected':'') + '>Male</option>';
      html += '<option value="female"' + (m.sex==='female'?' selected':'') + '>Female</option>';
      html += '</select></div></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Role</label>';
      html += '<select class="form-select" id="fm-role"><option value="adult"' + (m.role==='adult'||!m.role?' selected':'') + '>Adult</option>';
      html += '<option value="child"' + (m.role==='child'?' selected':'') + '>Child</option></select></div>';
      html += '<div class="form-group"><label class="form-label">Blood Type</label>';
      html += '<select class="form-select" id="fm-blood"><option value="">Select...</option>';
      var btypes = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
      for (var i = 0; i < btypes.length; i++) {
        html += '<option value="' + btypes[i] + '"' + (m.blood_type===btypes[i]?' selected':'') + '>' + btypes[i] + '</option>';
      }
      html += '</select></div></div>';

      html += '<div class="form-row-3">';
      html += '<div class="form-group"><label class="form-label">Height (ft)</label>';
      html += '<input class="form-input" type="number" id="fm-feet" min="0" max="8" value="' + esc(feet) + '" placeholder="5" /></div>';
      html += '<div class="form-group"><label class="form-label">Height (in)</label>';
      html += '<input class="form-input" type="number" id="fm-inches" min="0" max="11" value="' + esc(inches) + '" placeholder="6" /></div>';
      html += '<div class="form-group"><label class="form-label">Weight (lbs)</label>';
      html += '<input class="form-input" type="number" id="fm-weight" value="' + esc(m.weight_lbs || '') + '" placeholder="150" /></div>';
      html += '</div>';

      html += '<div class="form-group"><label class="form-label">Allergies</label>';
      html += '<input class="form-input" id="fm-allergies" value="' + esc((m.allergies || []).join(', ')) + '" placeholder="Comma-separated" />';
      html += '<div class="form-hint">Separate multiple allergies with commas</div></div>';

      html += '<div class="form-group"><label class="form-label">Conditions</label>';
      html += '<input class="form-input" id="fm-conditions" value="' + esc((m.conditions || []).join(', ')) + '" placeholder="Comma-separated" /></div>';

      html += '<div class="form-group"><label class="form-label">Medications</label>';
      html += '<input class="form-input" id="fm-medications" value="' + esc((m.medications || []).join(', ')) + '" placeholder="Comma-separated" /></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Primary Doctor</label>';
      html += '<input class="form-input" id="fm-doctor" value="' + esc(m.primary_doctor || '') + '" /></div>';
      html += '<div class="form-group"><label class="form-label">Insurance Provider</label>';
      html += '<input class="form-input" id="fm-insurance" value="' + esc(m.insurance_provider || '') + '" /></div>';
      html += '</div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Insurance Policy #</label>';
      html += '<input class="form-input" id="fm-policy" value="' + esc(m.insurance_policy || '') + '" /></div>';
      html += '<div class="form-group"><label class="form-label">Insurance Group #</label>';
      html += '<input class="form-input" id="fm-group" value="' + esc(m.insurance_group || '') + '" /></div>';
      html += '</div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Pharmacy Name</label>';
      html += '<input class="form-input" id="fm-pharmacy" value="' + esc(m.pharmacy_name || '') + '" /></div>';
      html += '<div class="form-group"><label class="form-label">Pharmacy Phone</label>';
      html += '<input class="form-input" id="fm-pharmaphone" value="' + esc(m.pharmacy_phone || '') + '" /></div>';
      html += '</div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Emergency Contact Name</label>';
      html += '<input class="form-input" id="fm-ecname" value="' + esc(m.emergency_contact_name || '') + '" /></div>';
      html += '<div class="form-group"><label class="form-label">Emergency Contact Phone</label>';
      html += '<input class="form-input" id="fm-ecphone" value="' + esc(m.emergency_contact_phone || '') + '" /></div>';
      html += '</div>';

      html += '<div class="form-group"><label class="form-label">Address</label>';
      html += '<textarea class="form-textarea" id="fm-address" rows="2">' + esc(m.address || '') + '</textarea></div>';

      html += '<div class="form-group"><label class="form-label">Health Goals</label>';
      html += '<textarea class="form-textarea" id="fm-goals" rows="3" placeholder="One goal per line">' + esc((m.health_goals || []).join('\\n')) + '</textarea></div>';

      html += '<div class="form-group"><label class="form-label">Notes</label>';
      html += '<textarea class="form-textarea" id="fm-notes" rows="2">' + esc(m.notes || '') + '</textarea></div>';

      html += '<div class="modal-actions">';
      html += '<button class="btn btn-outline" onclick="hideModal()">Cancel</button>';
      html += '<button class="btn btn-primary" onclick="saveMember(' + (isEdit ? "'" + m.id + "'" : 'null') + ')">Save</button>';
      html += '</div></div>';

      showModal(html);
    }

    function saveMember(existingId) {
      var name = document.getElementById('fm-name').value.trim();
      if (!name) { showToast('Name is required', 'error'); return; }

      var feet = parseInt(document.getElementById('fm-feet').value) || 0;
      var inches = parseInt(document.getElementById('fm-inches').value) || 0;
      var totalInches = (feet * 12) + inches;

      function parseList(val) {
        return val.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
      }

      var body = {
        name: name,
        date_of_birth: document.getElementById('fm-dob').value || null,
        sex: document.getElementById('fm-sex').value || null,
        role: document.getElementById('fm-role').value || 'adult',
        blood_type: document.getElementById('fm-blood').value || '',
        height_inches: totalInches || null,
        weight_lbs: parseFloat(document.getElementById('fm-weight').value) || null,
        allergies: parseList(document.getElementById('fm-allergies').value),
        conditions: parseList(document.getElementById('fm-conditions').value),
        medications: parseList(document.getElementById('fm-medications').value),
        primary_doctor: document.getElementById('fm-doctor').value.trim(),
        insurance_provider: document.getElementById('fm-insurance').value.trim(),
        insurance_policy: document.getElementById('fm-policy').value.trim(),
        insurance_group: document.getElementById('fm-group').value.trim(),
        pharmacy_name: document.getElementById('fm-pharmacy').value.trim(),
        pharmacy_phone: document.getElementById('fm-pharmaphone').value.trim(),
        emergency_contact_name: document.getElementById('fm-ecname').value.trim(),
        emergency_contact_phone: document.getElementById('fm-ecphone').value.trim(),
        address: document.getElementById('fm-address').value.trim(),
        health_goals: document.getElementById('fm-goals').value.split('\\n').map(function(s){return s.trim();}).filter(function(s){return s.length>0;}),
        notes: document.getElementById('fm-notes').value.trim()
      };

      var method = existingId ? 'PUT' : 'POST';
      var path = existingId ? '/family/' + existingId : '/family';

      api(path, { method: method, body: JSON.stringify(body) })
        .then(function(result) {
          hideModal();
          showToast(existingId ? 'Member updated' : 'Member added', 'success');
          return loadMembers().then(function() {
            if (result && result.id) selectMember(result.id);
          });
        })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    function showEditProfileForm() {
      if (!state.currentMember) return;
      showAddMemberForm(state.currentMember);
    }

    /* ─── Profile View ───────────────────────── */
    function loadProfile() {
      if (!state.currentMember) return;
      renderProfile();
    }

    function renderProfile() {
      var m = state.currentMember;
      if (!m) return;
      var container = document.getElementById('profile-content');
      var age = calcAge(m.date_of_birth);
      var ageStr = age !== null ? ', ' + age + ' years old' : '';
      var color = m.avatar_color || '#10b981';
      var initial = m.name ? m.name.charAt(0).toUpperCase() : '?';

      var html = '<div class="profile-header">';
      html += '<div class="profile-avatar" style="background:' + esc(color) + '">' + esc(initial) + '</div>';
      html += '<div class="profile-info">';
      html += '<div class="profile-name">' + esc(m.name) + '</div>';
      html += '<div class="profile-meta">' + esc(m.sex || '') + ageStr + ' ';
      html += '<span class="role-badge role-' + esc(m.role || 'adult') + '">' + esc(m.role || 'adult') + '</span>';
      html += '</div></div>';
      html += '<button class="btn btn-outline btn-sm" onclick="showEditProfileForm()">Edit Profile</button>';
      html += '</div>';

      html += '<div class="card-grid">';

      // Vitals card
      html += '<div class="card"><div class="card-title">&#9825; Vitals</div>';
      html += '<div class="stat-row"><span class="stat-label">Height</span><span class="stat-value">' + esc(heightDisplay(m.height_inches)) + '</span></div>';
      html += '<div class="stat-row"><span class="stat-label">Weight</span><span class="stat-value">' + (m.weight_lbs ? esc(m.weight_lbs) + ' lbs' : '') + '</span></div>';
      html += '<div class="stat-row"><span class="stat-label">Blood Type</span><span class="stat-value">' + esc(m.blood_type || '-') + '</span></div>';
      if (m.date_of_birth) {
        html += '<div class="stat-row"><span class="stat-label">Date of Birth</span><span class="stat-value">' + formatDate(m.date_of_birth) + '</span></div>';
      }
      html += '</div>';

      // Emergency info card
      html += '<div class="card"><div class="card-title">&#9888; Emergency Info</div>';
      html += '<div class="stat-row"><span class="stat-label">Insurance</span><span class="stat-value">' + esc(m.insurance_provider || '-') + '</span></div>';
      if (m.insurance_policy) {
        html += '<div class="stat-row"><span class="stat-label">Policy #</span><span class="stat-value">' + esc(m.insurance_policy) + '</span></div>';
      }
      html += '<div class="stat-row"><span class="stat-label">Doctor</span><span class="stat-value">' + esc(m.primary_doctor || '-') + '</span></div>';
      html += '<div class="stat-row"><span class="stat-label">Pharmacy</span><span class="stat-value">' + esc(m.pharmacy_name || '-') + '</span></div>';
      if (m.pharmacy_phone) {
        html += '<div class="stat-row"><span class="stat-label">Pharmacy Phone</span><span class="stat-value">' + esc(m.pharmacy_phone) + '</span></div>';
      }
      html += '<div class="stat-row"><span class="stat-label">Emergency Contact</span><span class="stat-value">' + esc(m.emergency_contact_name || '-') + '</span></div>';
      if (m.emergency_contact_phone) {
        html += '<div class="stat-row"><span class="stat-label">Emergency Phone</span><span class="stat-value">' + esc(m.emergency_contact_phone) + '</span></div>';
      }
      if (m.address) {
        html += '<div class="stat-row"><span class="stat-label">Address</span><span class="stat-value" style="white-space:pre-line">' + esc(m.address) + '</span></div>';
      }
      html += '</div>';

      html += '</div>';

      // Medical card
      html += '<div class="card"><div class="card-title">&#9764; Medical Info</div>';
      html += '<div style="margin-bottom:10px"><span class="stat-label">Allergies</span><div style="margin-top:4px">';
      if (m.allergies && m.allergies.length > 0) {
        for (var i = 0; i < m.allergies.length; i++) {
          html += '<span class="tag">' + esc(m.allergies[i]) + '</span>';
        }
      } else { html += '<span style="color:var(--text-muted);font-size:12px">None listed</span>'; }
      html += '</div></div>';

      html += '<div style="margin-bottom:10px"><span class="stat-label">Conditions</span><div style="margin-top:4px">';
      if (m.conditions && m.conditions.length > 0) {
        for (var i = 0; i < m.conditions.length; i++) {
          html += '<span class="tag">' + esc(m.conditions[i]) + '</span>';
        }
      } else { html += '<span style="color:var(--text-muted);font-size:12px">None listed</span>'; }
      html += '</div></div>';

      html += '<div><span class="stat-label">Medications</span><div style="margin-top:4px">';
      if (m.medications && m.medications.length > 0) {
        for (var i = 0; i < m.medications.length; i++) {
          html += '<span class="tag">' + esc(m.medications[i]) + '</span>';
        }
      } else { html += '<span style="color:var(--text-muted);font-size:12px">None listed</span>'; }
      html += '</div></div>';
      html += '</div>';

      // Health goals card
      if (m.health_goals && m.health_goals.length > 0) {
        html += '<div class="card"><div class="card-title">&#127919; Health Goals</div>';
        html += '<ul class="goals-list">';
        for (var i = 0; i < m.health_goals.length; i++) {
          html += '<li>' + esc(m.health_goals[i]) + '</li>';
        }
        html += '</ul></div>';
      }

      if (m.notes) {
        html += '<div class="card"><div class="card-title">&#128221; Notes</div>';
        html += '<p style="font-size:13px;color:var(--text-secondary);white-space:pre-line">' + esc(m.notes) + '</p></div>';
      }

      container.innerHTML = html;
    }

    /* ─── Labs View ──────────────────────────── */
    function loadLabs() {
      if (!state.currentMember) return;
      var container = document.getElementById('labs-content');
      container.innerHTML = '<div class="loading-center"><div class="spinner"></div> Loading lab results...</div>';
      api('/labs?memberId=' + state.currentMember.id)
        .then(function(data) {
          state.labs = data;
          renderLabs();
        })
        .catch(function(err) { container.innerHTML = '<div class="empty-state"><p>Failed to load lab results</p></div>'; });
    }

    function renderLabs() {
      var container = document.getElementById('labs-content');
      if (state.labs.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128300;</div>';
        container.innerHTML += '<p>No lab results yet. Add your first lab panel to start tracking.</p>';
        container.innerHTML += '<button class="btn btn-primary" onclick="showAddLabForm()">+ Add Lab Result</button></div>';
        return;
      }

      var html = '';
      for (var i = 0; i < state.labs.length; i++) {
        var lab = state.labs[i];
        html += '<div class="lab-card">';
        html += '<div class="lab-header" onclick="toggleLab(this)">';
        html += '<div><div class="lab-date">' + formatDate(lab.test_date) + '</div>';
        html += '<div class="lab-meta">' + esc(lab.test_type || lab.lab_name || 'Lab Panel');
        var markerCount = lab.markers ? lab.markers.length : 0;
        html += ' &middot; ' + markerCount + ' marker' + (markerCount !== 1 ? 's' : '') + '</div></div>';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<button class="btn btn-outline btn-sm btn-icon" onclick="event.stopPropagation();deleteLab(\'' + lab.id + '\')" title="Delete">&#128465;</button>';
        html += '<span class="lab-toggle">&#9660;</span>';
        html += '</div></div>';

        html += '<div class="lab-body">';
        if (lab.markers && lab.markers.length > 0) {
          for (var j = 0; j < lab.markers.length; j++) {
            var mk = lab.markers[j];
            html += '<div class="marker-row">';
            html += '<span class="marker-name">' + esc(mk.name) + '</span>';
            html += '<span class="marker-value">' + esc(mk.value) + '</span>';
            html += '<span class="marker-unit">' + esc(mk.unit) + '</span>';
            html += '<span class="marker-range">opt: ' + esc(mk.optimal_low) + '-' + esc(mk.optimal_high) + '</span>';
            html += markerStatusBadge(mk.value, mk.optimal_low, mk.optimal_high, mk.conventional_low, mk.conventional_high);
            html += '<button class="marker-trend-btn" onclick="renderLabTrend(\'' + esc(mk.name) + '\')" title="Trend">&#128200;</button>';
            html += '</div>';
          }
        } else {
          html += '<div style="padding:10px;color:var(--text-muted);font-size:13px">No markers recorded</div>';
        }
        if (lab.notes) {
          html += '<div style="padding:8px 0;font-size:12px;color:var(--text-secondary)">Notes: ' + esc(lab.notes) + '</div>';
        }
        html += '</div></div>';
      }

      html += '<div id="lab-trend-chart" class="chart-container" style="display:none"><canvas id="lab-trend-canvas"></canvas></div>';
      container.innerHTML = html;
    }

    function toggleLab(el) {
      var body = el.nextElementSibling;
      var toggle = el.querySelector('.lab-toggle');
      body.classList.toggle('open');
      toggle.classList.toggle('open');
    }

    function deleteLab(id) {
      if (!confirm('Delete this lab result? This cannot be undone.')) return;
      api('/labs/' + id, { method: 'DELETE' })
        .then(function() { showToast('Lab result deleted', 'success'); loadLabs(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    function showAddLabForm() {
      if (!state.currentMember) return;
      var today = new Date().toISOString().split('T')[0];

      var markerNames = '';
      if (state.references && state.references.markers) {
        var keys = Object.keys(state.references.markers);
        for (var i = 0; i < keys.length; i++) {
          markerNames += '<option value="' + esc(keys[i]) + '">';
        }
      }

      var html = '<div class="modal modal-wide">';
      html += '<div class="modal-title"><span>Add Lab Result</span><button class="modal-close" onclick="hideModal()">&times;</button></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Test Date *</label>';
      html += '<input class="form-input" type="date" id="lab-date" value="' + today + '" /></div>';
      html += '<div class="form-group"><label class="form-label">Lab Name</label>';
      html += '<input class="form-input" id="lab-name" placeholder="Quest, LabCorp, etc." /></div>';
      html += '</div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Test Type</label>';
      html += '<input class="form-input" id="lab-type" placeholder="Comprehensive Metabolic, Thyroid, etc." /></div>';
      html += '<div class="form-group"><label class="form-label">Notes</label>';
      html += '<input class="form-input" id="lab-notes" placeholder="Optional notes" /></div>';
      html += '</div>';

      html += '<div style="margin-top:16px;margin-bottom:8px;font-weight:600;font-size:14px">Markers</div>';
      html += '<datalist id="marker-names">' + markerNames + '</datalist>';
      html += '<div id="marker-entries">';
      html += buildMarkerEntry(0);
      html += '</div>';
      html += '<button class="add-marker-btn" onclick="addMarkerEntry()">+ Add Another Marker</button>';

      html += '<div class="modal-actions">';
      html += '<button class="btn btn-outline" onclick="hideModal()">Cancel</button>';
      html += '<button class="btn btn-primary" onclick="saveLab()">Save Lab Result</button>';
      html += '</div></div>';

      showModal(html);
    }

    var markerEntryCount = 1;

    function buildMarkerEntry(idx) {
      var html = '<div class="marker-entry" id="marker-entry-' + idx + '">';
      html += '<div class="form-group"><label class="form-label">Marker Name</label>';
      html += '<input class="form-input marker-name-input" list="marker-names" placeholder="e.g. TSH, Vitamin D" onchange="autoFillUnit(this,' + idx + ')" /></div>';
      html += '<div class="form-group"><label class="form-label">Value</label>';
      html += '<input class="form-input marker-value-input" type="number" step="any" placeholder="0.00" /></div>';
      html += '<div class="form-group"><label class="form-label">Unit</label>';
      html += '<input class="form-input marker-unit-input" placeholder="auto" /></div>';
      html += '<button class="btn btn-outline btn-sm btn-icon" onclick="removeMarkerEntry(' + idx + ')" style="margin-bottom:2px" title="Remove">&times;</button>';
      html += '</div>';
      return html;
    }

    function addMarkerEntry() {
      var container = document.getElementById('marker-entries');
      var div = document.createElement('div');
      div.innerHTML = buildMarkerEntry(markerEntryCount);
      container.appendChild(div.firstChild);
      markerEntryCount++;
    }

    function removeMarkerEntry(idx) {
      var el = document.getElementById('marker-entry-' + idx);
      if (el) el.remove();
    }

    function autoFillUnit(input, idx) {
      if (!state.references || !state.references.markers) return;
      var name = input.value;
      var ref = state.references.markers[name];
      if (ref) {
        var entry = document.getElementById('marker-entry-' + idx);
        if (entry) {
          var unitInput = entry.querySelector('.marker-unit-input');
          if (unitInput && !unitInput.value) unitInput.value = ref.unit;
        }
      }
    }

    function saveLab() {
      var testDate = document.getElementById('lab-date').value;
      if (!testDate) { showToast('Test date is required', 'error'); return; }

      var entries = document.querySelectorAll('.marker-entry');
      var markers = [];
      for (var i = 0; i < entries.length; i++) {
        var nameInput = entries[i].querySelector('.marker-name-input');
        var valueInput = entries[i].querySelector('.marker-value-input');
        var unitInput = entries[i].querySelector('.marker-unit-input');
        if (nameInput.value && valueInput.value) {
          markers.push({
            name: nameInput.value.trim(),
            value: parseFloat(valueInput.value),
            unit: unitInput.value.trim()
          });
        }
      }

      var body = {
        family_member_id: state.currentMember.id,
        test_date: testDate,
        lab_name: document.getElementById('lab-name').value.trim(),
        test_type: document.getElementById('lab-type').value.trim(),
        notes: document.getElementById('lab-notes').value.trim(),
        markers: markers
      };

      api('/labs', { method: 'POST', body: JSON.stringify(body) })
        .then(function() {
          hideModal();
          showToast('Lab result added', 'success');
          loadLabs();
        })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    function renderLabTrend(markerName) {
      if (!state.currentMember) return;
      var chartDiv = document.getElementById('lab-trend-chart');
      if (!chartDiv) return;
      chartDiv.style.display = 'block';
      chartDiv.scrollIntoView({ behavior: 'smooth' });

      api('/markers/trends?memberId=' + state.currentMember.id + '&marker=' + encodeURIComponent(markerName))
        .then(function(data) {
          if (data.length === 0) {
            showToast('No trend data for ' + markerName, 'info');
            return;
          }
          destroyChart('labTrend');
          var canvas = document.getElementById('lab-trend-canvas');
          var ctx = canvas.getContext('2d');

          var labels = data.map(function(d) { return formatDate(d.test_date); });
          var values = data.map(function(d) { return parseFloat(d.value); });

          var datasets = [
            { label: markerName, data: values, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 5 }
          ];

          if (data[0].optimal_low != null && data[0].optimal_high != null) {
            datasets.push({
              label: 'Optimal Low', data: data.map(function() { return data[0].optimal_low; }),
              borderColor: 'rgba(16,185,129,0.3)', borderDash: [5,5], pointRadius: 0, fill: false
            });
            datasets.push({
              label: 'Optimal High', data: data.map(function() { return data[0].optimal_high; }),
              borderColor: 'rgba(16,185,129,0.3)', borderDash: [5,5], pointRadius: 0, fill: '-1',
              backgroundColor: 'rgba(16,185,129,0.05)'
            });
          }

          state.charts['labTrend'] = new Chart(ctx, {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
              responsive: true,
              plugins: {
                title: { display: true, text: markerName + ' Trend', color: '#f1f5f9', font: { size: 14 } },
                legend: { labels: { color: '#94a3b8', font: { size: 11 } } }
              },
              scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51,65,85,0.5)' } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51,65,85,0.5)' } }
              }
            }
          });
        })
        .catch(function(err) { showToast('Failed to load trend', 'error'); });
    }

    /* ─── Symptoms View ──────────────────────── */
    function loadSymptoms() {
      if (!state.currentMember) return;
      var container = document.getElementById('symptoms-content');
      container.innerHTML = '<div class="loading-center"><div class="spinner"></div> Loading symptoms...</div>';
      api('/symptoms?memberId=' + state.currentMember.id)
        .then(function(data) {
          state.symptoms = data;
          renderSymptoms();
        })
        .catch(function(err) { container.innerHTML = '<div class="empty-state"><p>Failed to load symptoms</p></div>'; });
    }

    function renderSymptoms() {
      var container = document.getElementById('symptoms-content');
      if (state.symptoms.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128203;</div>';
        container.innerHTML += '<p>No symptoms logged yet. Start tracking to identify patterns.</p>';
        container.innerHTML += '<button class="btn btn-primary" onclick="showAddSymptomForm()">+ Log Symptom</button></div>';
        return;
      }

      var html = '<div id="symptom-chart-area" class="chart-container" style="margin-bottom:20px"><canvas id="symptom-chart-canvas"></canvas></div>';

      for (var i = 0; i < state.symptoms.length; i++) {
        var s = state.symptoms[i];
        var sColor = severityColor(s.severity);
        html += '<div class="symptom-card">';
        html += '<div class="symptom-severity" style="background:' + sColor + '20;color:' + sColor + '">' + esc(s.severity) + '</div>';
        html += '<div class="symptom-info">';
        html += '<div class="symptom-name">' + esc(s.symptom) + '</div>';
        html += '<div class="symptom-meta">' + formatDate(s.logged_date);
        if (s.body_system) html += ' &middot; ' + esc(s.body_system);
        if (s.notes) html += ' &middot; ' + esc(s.notes);
        html += '</div></div>';
        html += '<button class="symptom-delete" onclick="deleteSymptom(\'' + s.id + '\')" title="Delete">&#128465;</button>';
        html += '</div>';
      }

      container.innerHTML = html;
      renderSymptomChart();
    }

    function renderSymptomChart() {
      if (state.symptoms.length < 2) return;
      destroyChart('symptomChart');
      var canvas = document.getElementById('symptom-chart-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');

      var recent = state.symptoms.slice(0, 20).reverse();
      var labels = recent.map(function(s) { return formatDate(s.logged_date); });
      var values = recent.map(function(s) { return s.severity; });
      var colors = recent.map(function(s) { return severityColor(s.severity); });

      state.charts['symptomChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Severity',
            data: values,
            backgroundColor: colors.map(function(c) { return c + '40'; }),
            borderColor: colors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Recent Symptom Severity', color: '#f1f5f9', font: { size: 14 } },
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#64748b', maxRotation: 45 }, grid: { color: 'rgba(51,65,85,0.5)' } },
            y: { min: 0, max: 10, ticks: { color: '#64748b', stepSize: 2 }, grid: { color: 'rgba(51,65,85,0.5)' } }
          }
        }
      });
    }

    function showAddSymptomForm() {
      if (!state.currentMember) return;
      var today = new Date().toISOString().split('T')[0];
      var systems = state.references && state.references.bodySystems ? state.references.bodySystems : [];

      var html = '<div class="modal">';
      html += '<div class="modal-title"><span>Log Symptom</span><button class="modal-close" onclick="hideModal()">&times;</button></div>';

      html += '<div class="form-group"><label class="form-label">Symptom *</label>';
      html += '<input class="form-input" id="sym-name" placeholder="e.g. Headache, Fatigue, Brain fog" /></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Severity (1-10) *</label>';
      html += '<select class="form-select" id="sym-severity">';
      for (var i = 1; i <= 10; i++) {
        html += '<option value="' + i + '"' + (i===5?' selected':'') + '>' + i + (i<=3?' (mild)':i<=6?' (moderate)':' (severe)') + '</option>';
      }
      html += '</select></div>';

      html += '<div class="form-group"><label class="form-label">Body System</label>';
      html += '<select class="form-select" id="sym-system"><option value="">Select...</option>';
      for (var i = 0; i < systems.length; i++) {
        html += '<option value="' + esc(systems[i]) + '">' + esc(systems[i]) + '</option>';
      }
      html += '</select></div></div>';

      html += '<div class="form-group"><label class="form-label">Date</label>';
      html += '<input class="form-input" type="date" id="sym-date" value="' + today + '" /></div>';

      html += '<div class="form-group"><label class="form-label">Notes</label>';
      html += '<textarea class="form-textarea" id="sym-notes" rows="2" placeholder="Any additional details, triggers, etc."></textarea></div>';

      html += '<div class="modal-actions">';
      html += '<button class="btn btn-outline" onclick="hideModal()">Cancel</button>';
      html += '<button class="btn btn-primary" onclick="saveSymptom()">Log Symptom</button>';
      html += '</div></div>';

      showModal(html);
    }

    function saveSymptom() {
      var symptom = document.getElementById('sym-name').value.trim();
      if (!symptom) { showToast('Symptom name is required', 'error'); return; }

      var body = {
        family_member_id: state.currentMember.id,
        symptom: symptom,
        severity: parseInt(document.getElementById('sym-severity').value),
        body_system: document.getElementById('sym-system').value,
        logged_date: document.getElementById('sym-date').value,
        notes: document.getElementById('sym-notes').value.trim()
      };

      api('/symptoms', { method: 'POST', body: JSON.stringify(body) })
        .then(function() { hideModal(); showToast('Symptom logged', 'success'); loadSymptoms(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    function deleteSymptom(id) {
      if (!confirm('Delete this symptom entry?')) return;
      api('/symptoms/' + id, { method: 'DELETE' })
        .then(function() { showToast('Symptom deleted', 'success'); loadSymptoms(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    /* ─── Protocols View ─────────────────────── */
    function loadProtocols() {
      if (!state.currentMember) return;
      var container = document.getElementById('protocols-content');
      container.innerHTML = '<div class="loading-center"><div class="spinner"></div> Loading protocols...</div>';
      api('/protocols?memberId=' + state.currentMember.id)
        .then(function(data) {
          state.protocols = data;
          renderProtocols();
        })
        .catch(function(err) { container.innerHTML = '<div class="empty-state"><p>Failed to load protocols</p></div>'; });
    }

    function renderProtocols() {
      var container = document.getElementById('protocols-content');
      if (state.protocols.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128138;</div>';
        container.innerHTML += '<p>No protocols yet. Add supplements, diet plans, or lifestyle changes.</p>';
        container.innerHTML += '<button class="btn btn-primary" onclick="showAddProtocolForm()">+ Add Protocol</button></div>';
        return;
      }

      var grouped = { active: [], paused: [], completed: [] };
      for (var i = 0; i < state.protocols.length; i++) {
        var p = state.protocols[i];
        var status = p.status || 'active';
        if (!grouped[status]) grouped[status] = [];
        grouped[status].push(p);
      }

      var html = '';
      var sections = ['active', 'paused', 'completed'];
      var sectionLabels = { active: 'Active Protocols', paused: 'Paused', completed: 'Completed' };

      for (var s = 0; s < sections.length; s++) {
        var sec = sections[s];
        var items = grouped[sec];
        if (!items || items.length === 0) continue;

        html += '<div style="margin-bottom:20px">';
        html += '<h3 style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-bottom:10px">';
        html += '<span class="status-dot status-' + sec + '"></span>' + sectionLabels[sec] + ' (' + items.length + ')</h3>';

        for (var i = 0; i < items.length; i++) {
          var p = items[i];
          html += '<div class="protocol-card">';
          html += '<div class="protocol-header">';
          html += '<div><span class="protocol-name">' + esc(p.name) + '</span>';
          html += ' <span class="badge badge-neutral">' + esc(p.category || '') + '</span></div>';
          html += '<div class="protocol-actions">';
          if (p.status === 'active') {
            html += '<button class="btn btn-outline btn-sm" onclick="updateProtocolStatus(\'' + p.id + '\',\'paused\')">Pause</button>';
          } else if (p.status === 'paused') {
            html += '<button class="btn btn-outline btn-sm" onclick="updateProtocolStatus(\'' + p.id + '\',\'active\')">Resume</button>';
          }
          if (p.status !== 'completed') {
            html += '<button class="btn btn-outline btn-sm" onclick="updateProtocolStatus(\'' + p.id + '\',\'completed\')">Complete</button>';
          }
          html += '<button class="btn btn-outline btn-sm btn-icon" onclick="deleteProtocol(\'' + p.id + '\')" title="Delete">&#128465;</button>';
          html += '</div></div>';

          if (p.description) html += '<div class="protocol-detail">' + esc(p.description) + '</div>';
          if (p.dosage || p.frequency) {
            html += '<div class="protocol-detail" style="margin-top:4px">';
            if (p.dosage) html += '<strong>Dosage:</strong> ' + esc(p.dosage) + ' ';
            if (p.frequency) html += '<strong>Frequency:</strong> ' + esc(p.frequency);
            html += '</div>';
          }
          if (p.start_date) html += '<div class="protocol-detail" style="margin-top:4px">Started: ' + formatDate(p.start_date) + '</div>';
          if (p.notes) html += '<div class="protocol-detail" style="margin-top:4px;font-style:italic">' + esc(p.notes) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }

      container.innerHTML = html;
    }

    function showAddProtocolForm() {
      if (!state.currentMember) return;
      var today = new Date().toISOString().split('T')[0];
      var categories = state.references && state.references.protocolCategories ? state.references.protocolCategories : [];

      var html = '<div class="modal">';
      html += '<div class="modal-title"><span>Add Protocol</span><button class="modal-close" onclick="hideModal()">&times;</button></div>';

      html += '<div class="form-group"><label class="form-label">Protocol Name *</label>';
      html += '<input class="form-input" id="proto-name" placeholder="e.g. Vitamin D3, Elimination Diet" /></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Category</label>';
      html += '<select class="form-select" id="proto-category">';
      for (var i = 0; i < categories.length; i++) {
        html += '<option value="' + esc(categories[i]) + '">' + esc(categories[i]) + '</option>';
      }
      html += '</select></div>';
      html += '<div class="form-group"><label class="form-label">Status</label>';
      html += '<select class="form-select" id="proto-status">';
      html += '<option value="active">Active</option><option value="paused">Paused</option>';
      html += '</select></div></div>';

      html += '<div class="form-group"><label class="form-label">Description</label>';
      html += '<textarea class="form-textarea" id="proto-desc" rows="2" placeholder="What is this protocol for?"></textarea></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Dosage</label>';
      html += '<input class="form-input" id="proto-dosage" placeholder="e.g. 5000 IU" /></div>';
      html += '<div class="form-group"><label class="form-label">Frequency</label>';
      html += '<input class="form-input" id="proto-freq" placeholder="e.g. Daily, Twice daily" /></div>';
      html += '</div>';

      html += '<div class="form-group"><label class="form-label">Start Date</label>';
      html += '<input class="form-input" type="date" id="proto-start" value="' + today + '" /></div>';

      html += '<div class="form-group"><label class="form-label">Notes</label>';
      html += '<textarea class="form-textarea" id="proto-notes" rows="2"></textarea></div>';

      html += '<div class="modal-actions">';
      html += '<button class="btn btn-outline" onclick="hideModal()">Cancel</button>';
      html += '<button class="btn btn-primary" onclick="saveProtocol()">Save Protocol</button>';
      html += '</div></div>';

      showModal(html);
    }

    function saveProtocol() {
      var name = document.getElementById('proto-name').value.trim();
      if (!name) { showToast('Protocol name is required', 'error'); return; }

      var body = {
        family_member_id: state.currentMember.id,
        name: name,
        category: document.getElementById('proto-category').value,
        description: document.getElementById('proto-desc').value.trim(),
        dosage: document.getElementById('proto-dosage').value.trim(),
        frequency: document.getElementById('proto-freq').value.trim(),
        start_date: document.getElementById('proto-start').value || null,
        status: document.getElementById('proto-status').value,
        notes: document.getElementById('proto-notes').value.trim()
      };

      api('/protocols', { method: 'POST', body: JSON.stringify(body) })
        .then(function() { hideModal(); showToast('Protocol added', 'success'); loadProtocols(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    function updateProtocolStatus(id, newStatus) {
      api('/protocols/' + id, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })
        .then(function() { showToast('Protocol updated', 'success'); loadProtocols(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    function deleteProtocol(id) {
      if (!confirm('Delete this protocol?')) return;
      api('/protocols/' + id, { method: 'DELETE' })
        .then(function() { showToast('Protocol deleted', 'success'); loadProtocols(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    /* ─── Diet View ──────────────────────────── */
    function loadDiet() {
      if (!state.currentMember) return;
      var container = document.getElementById('diet-content');
      container.innerHTML = '<div class="loading-center"><div class="spinner"></div> Loading diet log...</div>';
      api('/diet?memberId=' + state.currentMember.id)
        .then(function(data) {
          state.diet = data;
          renderDiet();
        })
        .catch(function(err) { container.innerHTML = '<div class="empty-state"><p>Failed to load diet log</p></div>'; });
    }

    function renderDiet() {
      var container = document.getElementById('diet-content');
      if (state.diet.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#127869;</div>';
        container.innerHTML += '<p>No meals logged yet. Start tracking to identify food sensitivities.</p>';
        container.innerHTML += '<button class="btn btn-primary" onclick="showAddDietForm()">+ Log Meal</button></div>';
        return;
      }

      var html = '';
      var currentDate = '';
      for (var i = 0; i < state.diet.length; i++) {
        var d = state.diet[i];
        var dateStr = formatDate(d.logged_date);
        if (dateStr !== currentDate) {
          if (currentDate) html += '</div>';
          currentDate = dateStr;
          html += '<div style="margin-bottom:16px"><div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;padding:4px 0;border-bottom:1px solid var(--border)">' + esc(dateStr) + '</div>';
        }

        html += '<div class="diet-card">';
        html += '<div class="diet-header">';
        html += '<div class="diet-type">' + esc(d.meal_type || 'meal') + '</div>';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        if (d.energy_level) html += '<span class="badge badge-neutral">Energy: ' + esc(d.energy_level) + '/10</span>';
        html += '<button class="diet-delete" onclick="deleteDiet(\'' + d.id + '\')" title="Delete">&#128465;</button>';
        html += '</div></div>';
        html += '<div class="diet-description">' + esc(d.description) + '</div>';

        if (d.tags && d.tags.length > 0) {
          html += '<div class="diet-tags">';
          for (var j = 0; j < d.tags.length; j++) {
            html += '<span class="tag">' + esc(d.tags[j]) + '</span>';
          }
          html += '</div>';
        }

        if (d.reactions) {
          html += '<div class="diet-energy" style="color:var(--warning)">Reaction: ' + esc(d.reactions) + '</div>';
        }
        if (d.notes) {
          html += '<div class="diet-energy">' + esc(d.notes) + '</div>';
        }
        html += '</div>';
      }
      if (currentDate) html += '</div>';

      container.innerHTML = html;
    }

    function showAddDietForm() {
      if (!state.currentMember) return;
      var today = new Date().toISOString().split('T')[0];
      var mealTypes = state.references && state.references.mealTypes ? state.references.mealTypes : ['breakfast','lunch','dinner','snack','beverage'];
      var dietTags = state.references && state.references.dietTags ? state.references.dietTags : [];

      var html = '<div class="modal">';
      html += '<div class="modal-title"><span>Log Meal</span><button class="modal-close" onclick="hideModal()">&times;</button></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Meal Type</label>';
      html += '<select class="form-select" id="diet-type">';
      for (var i = 0; i < mealTypes.length; i++) {
        html += '<option value="' + esc(mealTypes[i]) + '">' + esc(mealTypes[i]) + '</option>';
      }
      html += '</select></div>';
      html += '<div class="form-group"><label class="form-label">Date</label>';
      html += '<input class="form-input" type="date" id="diet-date" value="' + today + '" /></div>';
      html += '</div>';

      html += '<div class="form-group"><label class="form-label">Description *</label>';
      html += '<textarea class="form-textarea" id="diet-desc" rows="3" placeholder="What did you eat?"></textarea></div>';

      html += '<div class="form-group"><label class="form-label">Tags</label>';
      html += '<input class="form-input" id="diet-tags" placeholder="Comma-separated, e.g. gluten-free, organic" />';
      if (dietTags.length > 0) {
        html += '<div class="form-hint" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">';
        for (var i = 0; i < dietTags.length; i++) {
          html += '<span class="tag" style="cursor:pointer;font-size:11px" onclick="addDietTag(\'' + esc(dietTags[i]) + '\')">' + esc(dietTags[i]) + '</span>';
        }
        html += '</div>';
      }
      html += '</div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Energy Level (1-10)</label>';
      html += '<select class="form-select" id="diet-energy"><option value="">N/A</option>';
      for (var i = 1; i <= 10; i++) {
        html += '<option value="' + i + '">' + i + '</option>';
      }
      html += '</select></div>';
      html += '<div class="form-group"><label class="form-label">Reactions</label>';
      html += '<input class="form-input" id="diet-reactions" placeholder="Any adverse reactions?" /></div>';
      html += '</div>';

      html += '<div class="form-group"><label class="form-label">Notes</label>';
      html += '<textarea class="form-textarea" id="diet-notes" rows="2"></textarea></div>';

      html += '<div class="modal-actions">';
      html += '<button class="btn btn-outline" onclick="hideModal()">Cancel</button>';
      html += '<button class="btn btn-primary" onclick="saveDiet()">Log Meal</button>';
      html += '</div></div>';

      showModal(html);
    }

    function addDietTag(tag) {
      var input = document.getElementById('diet-tags');
      var current = input.value.trim();
      if (current && current.indexOf(tag) === -1) {
        input.value = current + ', ' + tag;
      } else if (!current) {
        input.value = tag;
      }
    }

    function saveDiet() {
      var desc = document.getElementById('diet-desc').value.trim();
      if (!desc) { showToast('Description is required', 'error'); return; }

      var tagsStr = document.getElementById('diet-tags').value;
      var tags = tagsStr.split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });
      var energy = document.getElementById('diet-energy').value;

      var body = {
        family_member_id: state.currentMember.id,
        logged_date: document.getElementById('diet-date').value,
        meal_type: document.getElementById('diet-type').value,
        description: desc,
        tags: tags,
        reactions: document.getElementById('diet-reactions').value.trim(),
        energy_level: energy ? parseInt(energy) : null,
        notes: document.getElementById('diet-notes').value.trim()
      };

      api('/diet', { method: 'POST', body: JSON.stringify(body) })
        .then(function() { hideModal(); showToast('Meal logged', 'success'); loadDiet(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    function deleteDiet(id) {
      if (!confirm('Delete this meal entry?')) return;
      api('/diet/' + id, { method: 'DELETE' })
        .then(function() { showToast('Meal deleted', 'success'); loadDiet(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    /* ─── Trends View ────────────────────────── */
    function renderTrends() {
      if (!state.currentMember) return;
      var container = document.getElementById('trends-content');

      container.innerHTML = '<div class="loading-center"><div class="spinner"></div> Loading trend data...</div>';

      api('/labs?memberId=' + state.currentMember.id)
        .then(function(labs) {
          state.labs = labs;
          if (labs.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128200;</div>';
            container.innerHTML += '<p>Add lab results to see marker trends over time.</p></div>';
            return;
          }

          var markerMap = {};
          for (var i = 0; i < labs.length; i++) {
            if (!labs[i].markers) continue;
            for (var j = 0; j < labs[i].markers.length; j++) {
              var mk = labs[i].markers[j];
              if (!markerMap[mk.name]) markerMap[mk.name] = [];
              markerMap[mk.name].push({ date: labs[i].test_date, value: parseFloat(mk.value), optLow: mk.optimal_low, optHigh: mk.optimal_high });
            }
          }

          var markerNames = Object.keys(markerMap).sort();
          var trendMarkers = markerNames.filter(function(name) { return markerMap[name].length >= 2; });

          if (trendMarkers.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#128200;</div>';
            container.innerHTML += '<p>Need at least 2 lab results with the same marker to show trends.</p></div>';
            return;
          }

          var html = '<div class="form-group"><label class="form-label">Select Markers to Chart</label>';
          html += '<select class="form-select" id="trend-select" multiple style="min-height:120px">';
          for (var i = 0; i < trendMarkers.length; i++) {
            var sel = i < 3 ? ' selected' : '';
            html += '<option value="' + esc(trendMarkers[i]) + '"' + sel + '>' + esc(trendMarkers[i]) + ' (' + markerMap[trendMarkers[i]].length + ' points)</option>';
          }
          html += '</select></div>';
          html += '<button class="btn btn-primary btn-sm" onclick="drawTrendChart()" style="margin-bottom:16px">Update Chart</button>';
          html += '<div class="chart-container"><canvas id="trends-canvas"></canvas></div>';

          container.innerHTML = html;

          window._trendData = markerMap;
          drawTrendChart();
        })
        .catch(function(err) { container.innerHTML = '<div class="empty-state"><p>Failed to load trends</p></div>'; });
    }

    function drawTrendChart() {
      var select = document.getElementById('trend-select');
      if (!select) return;
      var selected = [];
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].selected) selected.push(select.options[i].value);
      }
      if (selected.length === 0) return;

      destroyChart('trends');
      var canvas = document.getElementById('trends-canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');

      var chartColors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
      var datasets = [];

      for (var i = 0; i < selected.length; i++) {
        var name = selected[i];
        var points = window._trendData[name];
        if (!points) continue;
        points.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
        var color = chartColors[i % chartColors.length];
        datasets.push({
          label: name,
          data: points.map(function(p) { return { x: p.date, y: p.value }; }),
          borderColor: color,
          backgroundColor: color + '20',
          fill: false,
          tension: 0.3,
          pointRadius: 5,
          pointHoverRadius: 7
        });
      }

      state.charts['trends'] = new Chart(ctx, {
        type: 'line',
        data: { datasets: datasets },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            title: { display: true, text: 'Marker Trends Over Time', color: '#f1f5f9', font: { size: 16 } },
            legend: { labels: { color: '#94a3b8', font: { size: 12 } } }
          },
          scales: {
            x: {
              type: 'time',
              time: { unit: 'month', displayFormats: { month: 'MMM yyyy' } },
              ticks: { color: '#64748b' },
              grid: { color: 'rgba(51,65,85,0.5)' }
            },
            y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(51,65,85,0.5)' } }
          }
        }
      });
    }

    /* ─── Chat View ──────────────────────────── */
    function loadChat() {
      if (!state.currentMember) return;
      loadConversations();
    }

    function loadConversations() {
      if (!state.currentMember) return;
      api('/chat/conversations?memberId=' + state.currentMember.id)
        .then(function(data) {
          state.conversations = data;
          renderChatSidebar();
          if (state.currentConversation) {
            var found = false;
            for (var i = 0; i < data.length; i++) {
              if (data[i].id === state.currentConversation) { found = true; break; }
            }
            if (found) loadMessages(state.currentConversation);
            else { state.currentConversation = null; state.chatMessages = []; renderChatArea(); }
          } else {
            renderChatArea();
          }
        })
        .catch(function(err) { showToast('Failed to load conversations', 'error'); });
    }

    function renderChatSidebar() {
      var list = document.getElementById('chat-list');
      if (!list) return;
      if (state.conversations.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px">No conversations yet. Send a message to start.</div>';
        return;
      }
      var html = '';
      for (var i = 0; i < state.conversations.length; i++) {
        var c = state.conversations[i];
        var active = state.currentConversation === c.id ? ' active' : '';
        html += '<div class="chat-list-item' + active + '" onclick="selectConversation(\'' + c.id + '\')">';
        html += '<div class="chat-list-title">' + esc(c.title || 'New Conversation') + '</div>';
        html += '<div class="chat-list-meta">' + formatDate(c.updated_at) + ' &middot; ' + (c.message_count || 0) + ' msgs</div>';
        html += '<div class="chat-list-actions">';
        html += '<button class="btn btn-outline btn-sm btn-icon" onclick="event.stopPropagation();deleteConversation(\'' + c.id + '\')" title="Delete" style="padding:2px 6px;font-size:11px">&#128465;</button>';
        html += '</div></div>';
      }
      list.innerHTML = html;
    }

    function selectConversation(id) {
      state.currentConversation = id;
      renderChatSidebar();
      loadMessages(id);
    }

    function loadMessages(conversationId) {
      api('/chat/conversations/' + conversationId + '/messages')
        .then(function(data) {
          state.chatMessages = data;
          renderChatArea();
        })
        .catch(function(err) { showToast('Failed to load messages', 'error'); });
    }

    function renderChatArea() {
      var area = document.getElementById('chat-messages');
      if (!area) return;

      if (!state.currentConversation && state.chatMessages.length === 0) {
        area.innerHTML = '<div class="chat-empty"><div class="chat-empty-icon">&#129302;</div>';
        area.innerHTML += '<div style="font-size:16px;font-weight:600">AI Wellness Assistant</div>';
        area.innerHTML += '<div style="font-size:13px;max-width:400px">Ask about lab results, get protocol recommendations, discuss symptoms, or get personalized health guidance.</div></div>';
        return;
      }

      var html = '';
      for (var i = 0; i < state.chatMessages.length; i++) {
        var msg = state.chatMessages[i];
        var cls = msg.role === 'user' ? 'chat-msg-user' : 'chat-msg-assistant';
        html += '<div class="chat-msg ' + cls + '">' + formatChatContent(msg.content) + '</div>';
      }
      area.innerHTML = html;
      area.scrollTop = area.scrollHeight;
    }

    function formatChatContent(text) {
      if (!text) return '';
      var escaped = esc(text);
      escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
      escaped = escaped.replace(/^- (.+)/gm, '&#8226; $1');
      escaped = escaped.replace(/^### (.+)/gm, '<strong style="font-size:14px">$1</strong>');
      escaped = escaped.replace(/^## (.+)/gm, '<strong style="font-size:15px">$1</strong>');
      return escaped;
    }

    function newConversation() {
      state.currentConversation = null;
      state.chatMessages = [];
      renderChatSidebar();
      renderChatArea();
      var input = document.getElementById('chat-input');
      if (input) input.focus();
    }

    function deleteConversation(id) {
      if (!confirm('Delete this conversation?')) return;
      api('/chat/conversations/' + id, { method: 'DELETE' })
        .then(function() {
          showToast('Conversation deleted', 'success');
          if (state.currentConversation === id) {
            state.currentConversation = null;
            state.chatMessages = [];
          }
          loadConversations();
        })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    async function sendChatMessage() {
      var input = document.getElementById('chat-input');
      var message = input.value.trim();
      if (!message || state.streaming || !state.currentMember) return;

      state.streaming = true;
      input.value = '';
      input.disabled = true;
      var sendBtn = document.getElementById('chat-send-btn');
      if (sendBtn) sendBtn.disabled = true;

      state.chatMessages.push({ role: 'user', content: message });
      renderChatArea();

      var area = document.getElementById('chat-messages');
      var typingEl = document.createElement('div');
      typingEl.className = 'chat-msg chat-msg-typing';
      typingEl.id = 'chat-typing';
      typingEl.textContent = 'Thinking...';
      area.appendChild(typingEl);
      area.scrollTop = area.scrollHeight;

      var payload = {
        message: message,
        family_member_id: state.currentMember.id,
        conversation_id: state.currentConversation || undefined
      };

      try {
        var res = await fetch('/api/health/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var fullText = '';
        var gotConvId = false;

        typingEl.className = 'chat-msg chat-msg-assistant';
        typingEl.innerHTML = '';

        while (true) {
          var result = await reader.read();
          if (result.done) break;

          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\\n\\n');
          buffer = lines.pop() || '';

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line.startsWith('data: ')) continue;
            var jsonStr = line.substring(6);
            try {
              var event = JSON.parse(jsonStr);
              if (event.type === 'text') {
                fullText += event.content;
                typingEl.innerHTML = formatChatContent(fullText);
                area.scrollTop = area.scrollHeight;
                if (!gotConvId && event.conversationId) {
                  state.currentConversation = event.conversationId;
                  gotConvId = true;
                }
              } else if (event.type === 'done') {
                if (event.content && !gotConvId) {
                  state.currentConversation = event.content;
                }
              } else if (event.type === 'error') {
                showToast('Chat error: ' + event.content, 'error');
              }
            } catch (e) { /* ignore parse errors */ }
          }
        }

        state.chatMessages.push({ role: 'assistant', content: fullText });
        typingEl.id = '';
        loadConversations();

      } catch (err) {
        showToast('Failed to send message', 'error');
        var typing = document.getElementById('chat-typing');
        if (typing) typing.remove();
      }

      state.streaming = false;
      input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }

    function handleChatKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    }

    /* ─── Knowledge View ─────────────────────── */
    function loadKnowledge() {
      var container = document.getElementById('knowledge-content');
      container.innerHTML = '<div class="loading-center"><div class="spinner"></div> Loading knowledge base...</div>';
      api('/knowledge')
        .then(function(data) {
          renderKnowledge(data);
        })
        .catch(function(err) { container.innerHTML = '<div class="empty-state"><p>Failed to load knowledge base</p></div>'; });
    }

    function renderKnowledge(docs) {
      var container = document.getElementById('knowledge-content');
      var html = '<div style="margin-bottom:16px">';
      html += '<button class="btn btn-primary" onclick="showUploadKnowledgeForm()">+ Upload Document</button>';
      html += '</div>';

      if (!docs || docs.length === 0) {
        html += '<div class="empty-state"><div class="empty-state-icon">&#128218;</div>';
        html += '<p>No documents uploaded yet. Upload functional medicine resources, protocols, or reference materials to enhance AI recommendations.</p></div>';
        container.innerHTML = html;
        return;
      }

      for (var i = 0; i < docs.length; i++) {
        var d = docs[i];
        var icon = d.doc_type === 'protocol' ? '&#128203;' : d.doc_type === 'research' ? '&#128300;' : '&#128196;';
        html += '<div class="knowledge-card">';
        html += '<div class="knowledge-icon">' + icon + '</div>';
        html += '<div class="knowledge-info">';
        html += '<div class="knowledge-title">' + esc(d.title) + '</div>';
        html += '<div class="knowledge-meta">';
        html += esc(d.doc_type || 'reference');
        if (d.category) html += ' &middot; ' + esc(d.category);
        html += ' &middot; ' + formatDate(d.created_at);
        html += '</div></div>';
        html += '<button class="knowledge-delete" onclick="deleteKnowledge(\'' + d.id + '\')" title="Delete">&#128465;</button>';
        html += '</div>';
      }

      container.innerHTML = html;
    }

    function showUploadKnowledgeForm() {
      var html = '<div class="modal">';
      html += '<div class="modal-title"><span>Upload Document</span><button class="modal-close" onclick="hideModal()">&times;</button></div>';

      html += '<div class="form-group"><label class="form-label">File *</label>';
      html += '<input class="form-input" type="file" id="kb-file" accept=".txt,.md,.pdf" onchange="handleKbFileSelect()" />';
      html += '<div class="form-hint">Supported: .txt, .md, .pdf</div></div>';

      html += '<div class="form-group"><label class="form-label">Title *</label>';
      html += '<input class="form-input" id="kb-title" placeholder="Document title" /></div>';

      html += '<div class="form-row">';
      html += '<div class="form-group"><label class="form-label">Category</label>';
      html += '<input class="form-input" id="kb-category" placeholder="e.g. Thyroid, Gut Health" /></div>';
      html += '<div class="form-group"><label class="form-label">Document Type</label>';
      html += '<select class="form-select" id="kb-type">';
      html += '<option value="reference">Reference</option>';
      html += '<option value="protocol">Protocol</option>';
      html += '<option value="research">Research</option>';
      html += '<option value="personal">Personal Notes</option>';
      html += '</select></div></div>';

      html += '<div id="kb-preview" style="display:none;margin-top:10px;padding:10px;background:var(--bg);border-radius:var(--radius-sm);max-height:150px;overflow-y:auto;font-size:12px;color:var(--text-muted)"></div>';

      html += '<div class="modal-actions">';
      html += '<button class="btn btn-outline" onclick="hideModal()">Cancel</button>';
      html += '<button class="btn btn-primary" id="kb-upload-btn" onclick="uploadKnowledge()" disabled>Upload</button>';
      html += '</div></div>';

      showModal(html);
    }

    var kbFileContent = '';

    function handleKbFileSelect() {
      var fileInput = document.getElementById('kb-file');
      var file = fileInput.files[0];
      if (!file) return;

      var titleInput = document.getElementById('kb-title');
      if (!titleInput.value) {
        titleInput.value = file.name.replace(/\.[^.]+$/, '');
      }

      var preview = document.getElementById('kb-preview');
      var uploadBtn = document.getElementById('kb-upload-btn');

      if (file.name.endsWith('.pdf')) {
        preview.style.display = 'block';
        preview.textContent = 'PDF files will be processed server-side. File: ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
        var reader = new FileReader();
        reader.onload = function(e) {
          var base64 = e.target.result.split(',')[1];
          kbFileContent = 'PDF_BASE64:' + base64;
          uploadBtn.disabled = false;
        };
        reader.readAsDataURL(file);
      } else {
        var reader = new FileReader();
        reader.onload = function(e) {
          kbFileContent = e.target.result;
          preview.style.display = 'block';
          preview.textContent = kbFileContent.substring(0, 500) + (kbFileContent.length > 500 ? '...' : '');
          uploadBtn.disabled = false;
        };
        reader.readAsText(file);
      }
    }

    function uploadKnowledge() {
      var title = document.getElementById('kb-title').value.trim();
      if (!title) { showToast('Title is required', 'error'); return; }
      if (!kbFileContent) { showToast('Please select a file', 'error'); return; }

      var fileInput = document.getElementById('kb-file');
      var filename = fileInput.files[0] ? fileInput.files[0].name : '';

      var body = {
        title: title,
        filename: filename,
        content: kbFileContent,
        doc_type: document.getElementById('kb-type').value,
        category: document.getElementById('kb-category').value.trim()
      };

      var uploadBtn = document.getElementById('kb-upload-btn');
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Uploading...';

      api('/knowledge', { method: 'POST', body: JSON.stringify(body) })
        .then(function() {
          hideModal();
          kbFileContent = '';
          showToast('Document uploaded', 'success');
          loadKnowledge();
        })
        .catch(function(err) {
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Upload';
          showToast(err.message, 'error');
        });
    }

    function deleteKnowledge(id) {
      if (!confirm('Delete this document?')) return;
      api('/knowledge/' + id, { method: 'DELETE' })
        .then(function() { showToast('Document deleted', 'success'); loadKnowledge(); })
        .catch(function(err) { showToast(err.message, 'error'); });
    }

    /* ─── Init ───────────────────────────────── */
    function init() {
      api('/references').then(function(data) {
        state.references = data;
      }).catch(function() {});

      loadMembers();

      document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) hideModal();
      });

      document.querySelector('.sidebar-backdrop').addEventListener('click', function() {
        closeMobileSidebar();
      });
    }

    document.addEventListener('DOMContentLoaded', init);
  `;
}

function getLayoutHtml(user?: SessionUser): string {
  const userName = user ? user.name : 'User';
  const userEmail = user ? user.email : '';
  const userPicture = user ? user.picture : '';
  const avatarHtml = userPicture
    ? `<img src="${userPicture}" alt="" referrerpolicy="no-referrer" />`
    : userName.charAt(0).toUpperCase();

  return `
    <div class="sidebar-backdrop"></div>
    <button class="mobile-toggle" onclick="toggleMobileSidebar()">&#9776;</button>

    <div class="app">
      <nav class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <span class="heart">&#9829;</span>
            <span>OptimalHealth</span>
          </div>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">Family Members</div>
        </div>
        <div class="sidebar-members" id="members-list">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>
        <button class="add-member-btn" onclick="showAddMemberForm()">+ Add Family Member</button>

        <div id="member-nav" style="display:none">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Health Data</div>
          </div>
          <div class="sidebar-nav">
            <div class="nav-item active" data-view="profile" onclick="showView('profile')">
              <span class="nav-icon">&#128100;</span> Profile &amp; Vitals
            </div>
            <div class="nav-item" data-view="labs" onclick="showView('labs')">
              <span class="nav-icon">&#128300;</span> Lab Results
            </div>
            <div class="nav-item" data-view="symptoms" onclick="showView('symptoms')">
              <span class="nav-icon">&#128203;</span> Symptoms
            </div>
            <div class="nav-item" data-view="protocols" onclick="showView('protocols')">
              <span class="nav-icon">&#128138;</span> Protocols
            </div>
            <div class="nav-item" data-view="diet" onclick="showView('diet')">
              <span class="nav-icon">&#127869;</span> Diet
            </div>
            <div class="nav-item" data-view="trends" onclick="showView('trends')">
              <span class="nav-icon">&#128200;</span> Trends
            </div>
            <div class="nav-item" data-view="chat" onclick="showView('chat')">
              <span class="nav-icon">&#129302;</span> AI Wellness
            </div>
          </div>
        </div>

        <div style="margin-top:auto">
          <div class="sidebar-section">
            <div class="sidebar-section-title">Resources</div>
          </div>
          <div style="padding:0 12px 8px">
            <div class="nav-item" data-view="knowledge" onclick="showView('knowledge')">
              <span class="nav-icon">&#128218;</span> Knowledge Base
            </div>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="user-avatar">${avatarHtml}</div>
          <div class="user-info">
            <div class="user-name">${userName}</div>
            <div class="user-email">${userEmail}</div>
          </div>
          <a href="/auth/logout" class="logout-btn">Logout</a>
        </div>
      </nav>

      <div class="main">
        <!-- Welcome / No member state -->
        <div class="view" id="view-welcome">
          <div class="welcome">
            <div class="welcome-icon">&#127793;</div>
            <h2>Welcome to OptimalHealth</h2>
            <p>Your family's functional medicine health dashboard. Track labs, symptoms, protocols, and diet — all analyzed through the lens of optimal health.</p>
            <button class="btn btn-primary" onclick="showAddMemberForm()" style="font-size:15px;padding:12px 24px">+ Add Your First Family Member</button>
          </div>
        </div>

        <!-- Profile View -->
        <div class="view" id="view-profile">
          <div class="main-header">
            <h1>&#128100; Profile &amp; Vitals</h1>
          </div>
          <div class="main-content" id="profile-content"></div>
        </div>

        <!-- Labs View -->
        <div class="view" id="view-labs">
          <div class="main-header">
            <h1>&#128300; Lab Results</h1>
            <button class="btn btn-primary btn-sm" onclick="showAddLabForm()">+ Add Lab Result</button>
          </div>
          <div class="main-content" id="labs-content"></div>
        </div>

        <!-- Symptoms View -->
        <div class="view" id="view-symptoms">
          <div class="main-header">
            <h1>&#128203; Symptoms</h1>
            <button class="btn btn-primary btn-sm" onclick="showAddSymptomForm()">+ Log Symptom</button>
          </div>
          <div class="main-content" id="symptoms-content"></div>
        </div>

        <!-- Protocols View -->
        <div class="view" id="view-protocols">
          <div class="main-header">
            <h1>&#128138; Protocols</h1>
            <button class="btn btn-primary btn-sm" onclick="showAddProtocolForm()">+ Add Protocol</button>
          </div>
          <div class="main-content" id="protocols-content"></div>
        </div>

        <!-- Diet View -->
        <div class="view" id="view-diet">
          <div class="main-header">
            <h1>&#127869; Diet Log</h1>
            <button class="btn btn-primary btn-sm" onclick="showAddDietForm()">+ Log Meal</button>
          </div>
          <div class="main-content" id="diet-content"></div>
        </div>

        <!-- Trends View -->
        <div class="view" id="view-trends">
          <div class="main-header">
            <h1>&#128200; Trends</h1>
          </div>
          <div class="main-content" id="trends-content"></div>
        </div>

        <!-- Chat View -->
        <div class="view" id="view-chat">
          <div class="main-header">
            <h1>&#129302; AI Wellness Assistant</h1>
          </div>
          <div class="main-content" style="padding-bottom:0">
            <div class="chat-layout">
              <div class="chat-sidebar">
                <div class="chat-sidebar-header">
                  <h3>Conversations</h3>
                  <button class="btn btn-outline btn-sm" onclick="newConversation()">+ New</button>
                </div>
                <div class="chat-list" id="chat-list"></div>
              </div>
              <div class="chat-main">
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-input-area">
                  <textarea class="chat-input" id="chat-input" placeholder="Ask about your health, labs, symptoms..." rows="1" onkeydown="handleChatKeydown(event)"></textarea>
                  <button class="btn btn-primary" id="chat-send-btn" onclick="sendChatMessage()">Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Knowledge View -->
        <div class="view" id="view-knowledge">
          <div class="main-header">
            <h1>&#128218; Knowledge Base</h1>
          </div>
          <div class="main-content" id="knowledge-content"></div>
        </div>
      </div>
    </div>

    <!-- Modal overlay -->
    <div class="modal-overlay" id="modal-overlay">
      <div id="modal-content"></div>
    </div>

    <!-- Toast container -->
    <div class="toast-container" id="toast-container"></div>
  `;
}

// ─── Exported Functions ────────────────────────────────────────

export function getDashboardHtml(user?: SessionUser): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OptimalHealth Dashboard</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#127793;</text></svg>" />
  <style>${getStyles()}</style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3"></script>
</head>
<body>
${getLayoutHtml(user)}
<script>${getScript()}</script>
</body>
</html>`;
}

export function getLoginPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OptimalHealth — Sign In</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#127793;</text></svg>" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif; background: #0f172a; color: #f1f5f9;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
    }
    .login-card {
      background: #1e293b; border: 1px solid #334155; border-radius: 16px;
      padding: 48px; max-width: 420px; width: 100%; text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }
    .login-logo { font-size: 48px; margin-bottom: 16px; }
    .login-title {
      font-size: 28px; font-weight: 700; color: #10b981; margin-bottom: 8px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .login-title .heart { color: #ef4444; }
    .login-subtitle { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
    .google-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 12px;
      background: #fff; color: #1f2937; padding: 12px 32px; border-radius: 8px;
      font-size: 15px; font-weight: 600; text-decoration: none;
      transition: box-shadow 0.2s, transform 0.1s;
      border: 1px solid #e5e7eb;
    }
    .google-btn:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.3); transform: translateY(-1px); text-decoration: none; }
    .google-icon { width: 20px; height: 20px; }
    .login-footer { margin-top: 32px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="login-logo">&#127793;</div>
    <div class="login-title">
      <span class="heart">&#9829;</span> OptimalHealth
    </div>
    <p class="login-subtitle">Functional Medicine Family Dashboard</p>
    <a href="/auth/google" class="google-btn">
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Sign in with Google
    </a>
    <div class="login-footer">
      Secure authentication powered by Google OAuth 2.0
    </div>
  </div>
</body>
</html>`;
}

export function getAccessDeniedHtml(email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OptimalHealth — Access Denied</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#127793;</text></svg>" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif; background: #0f172a; color: #f1f5f9;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
    }
    .card {
      background: #1e293b; border: 1px solid #334155; border-radius: 16px;
      padding: 48px; max-width: 440px; width: 100%; text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin-bottom: 12px; color: #ef4444; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 8px; line-height: 1.6; }
    .email { color: #f1f5f9; font-weight: 600; background: #0f172a; padding: 4px 12px; border-radius: 6px; display: inline-block; margin: 8px 0; }
    .link {
      display: inline-block; margin-top: 24px; padding: 10px 24px;
      background: #6366f1; color: #fff; border-radius: 8px;
      text-decoration: none; font-weight: 600; font-size: 14px;
      transition: background 0.2s;
    }
    .link:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#128274;</div>
    <h1>Access Denied</h1>
    <p>The email address</p>
    <div class="email">${email}</div>
    <p>is not authorized to access this dashboard. Please contact the administrator to request access.</p>
    <a href="/auth/login" class="link">Try a Different Account</a>
  </div>
</body>
</html>`;
}
