/**
 * Functional Medicine Family Health Dashboard — Complete SPA
 * All HTML/CSS/JS is inline in these exported functions.
 */

// ── Shared styles ────────────────────────────────────────────

function sharedStyles(): string {
  return `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: system-ui, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f172a; color: #e2e8f0; line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }
      a { color: #10b981; text-decoration: none; }
      a:hover { text-decoration: underline; }
      button { cursor: pointer; font-family: inherit; }
      input, select, textarea { font-family: inherit; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #0f172a; }
      ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #475569; }
    </style>
  `;
}

// ── Login Page ───────────────────────────────────────────────

export function getLoginPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Optimal Health Dashboard — Login</title>
  ${sharedStyles()}
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .login-card {
      background: #1e293b; border: 1px solid #334155; border-radius: 16px;
      padding: 48px 40px; max-width: 420px; width: 100%; text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .login-logo {
      width: 64px; height: 64px; background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 16px; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px; font-size: 28px;
    }
    .login-title { font-size: 24px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }
    .login-tagline { color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
    .google-btn {
      display: inline-flex; align-items: center; gap: 12px;
      background: #f8fafc; color: #1e293b; border: none; border-radius: 8px;
      padding: 12px 32px; font-size: 15px; font-weight: 600;
      transition: all 0.2s; width: 100%; justify-content: center;
    }
    .google-btn:hover { background: #e2e8f0; transform: translateY(-1px); }
    .google-btn svg { width: 20px; height: 20px; }
    .error-msg {
      background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
      color: #fca5a5; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;
      font-size: 14px;
    }
    .login-footer { margin-top: 32px; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="login-logo">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    </div>
    <h1 class="login-title">Optimal Health Dashboard</h1>
    <p class="login-tagline">Functional Medicine Family Wellness</p>
    <div id="error-container"></div>
    <a href="/auth/google" style="text-decoration:none;">
      <button class="google-btn">
        <svg viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Sign in with Google
      </button>
    </a>
    <p class="login-footer">Your health data is private and encrypted.</p>
  </div>
  <script>
    (function() {
      var params = new URLSearchParams(window.location.search);
      var error = params.get('error');
      if (error) {
        var msgs = {
          'no_code': 'Authentication was cancelled. Please try again.',
          'no_email': 'Could not retrieve your email address.',
          'auth_failed': 'Authentication failed. Please try again.',
          'access_denied': 'Your email is not authorized to access this dashboard.',
        };
        var container = document.getElementById('error-container');
        container.innerHTML = '<div class="error-msg">' + (msgs[error] || 'An error occurred. Please try again.') + '</div>';
      }
    })();
  </script>
</body>
</html>`;
}

// ── Access Denied Page ───────────────────────────────────────

export function getAccessDeniedHtml(email: string): string {
  const safeEmail = email.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied</title>
  ${sharedStyles()}
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .denied-card {
      background: #1e293b; border: 1px solid #334155; border-radius: 16px;
      padding: 48px 40px; max-width: 420px; width: 100%; text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .denied-icon {
      width: 64px; height: 64px; background: rgba(239,68,68,0.15);
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 24px; font-size: 28px; color: #ef4444;
    }
    .denied-title { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
    .denied-email { color: #f59e0b; font-size: 14px; background: rgba(245,158,11,0.1); padding: 8px 16px; border-radius: 6px; margin-bottom: 16px; display: inline-block; }
    .denied-msg { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
    .back-link {
      display: inline-block; background: #334155; color: #e2e8f0; padding: 10px 24px;
      border-radius: 8px; font-size: 14px; font-weight: 500; transition: background 0.2s;
    }
    .back-link:hover { background: #475569; text-decoration: none; }
  </style>
</head>
<body>
  <div class="denied-card">
    <div class="denied-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <h1 class="denied-title">Access Denied</h1>
    <div class="denied-email">${safeEmail}</div>
    <p class="denied-msg">This email is not authorized to access the Optimal Health Dashboard. Please contact the administrator to request access.</p>
    <a href="/auth/login" class="back-link">Back to Login</a>
  </div>
</body>
</html>`;
}

// ── Main Dashboard SPA ───────────────────────────────────────

export function getDashboardHtml(user?: { email: string; name: string; picture: string }): string {
  const userName = user?.name ? user.name.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : 'User';
  const userEmail = user?.email ? user.email.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
  const userPicture = user?.picture ? user.picture.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Optimal Health Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  ${sharedStyles()}
  <style>
    /* ── Layout ────────────────────────────── */
    .app { display: flex; min-height: 100vh; }
    .sidebar {
      width: 280px; min-width: 280px; background: #1e293b; border-right: 1px solid #334155;
      display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0;
      overflow-y: auto; z-index: 100;
    }
    .main { margin-left: 280px; flex: 1; min-height: 100vh; padding: 32px; max-width: 1200px; }

    /* ── Sidebar ───────────────────────────── */
    .sidebar-logo {
      padding: 24px 20px 16px; border-bottom: 1px solid #334155;
      display: flex; align-items: center; gap: 12px;
    }
    .sidebar-logo-icon {
      width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .sidebar-logo-text { font-size: 15px; font-weight: 700; color: #f1f5f9; }
    .sidebar-logo-sub { font-size: 11px; color: #64748b; }

    .sidebar-user {
      padding: 16px 20px; border-bottom: 1px solid #334155;
      display: flex; align-items: center; gap: 12px;
    }
    .sidebar-avatar {
      width: 36px; height: 36px; border-radius: 50%; background: #334155;
      display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
    }
    .sidebar-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .sidebar-user-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
    .sidebar-user-email { font-size: 11px; color: #64748b; overflow: hidden; text-overflow: ellipsis; }

    .sidebar-family {
      padding: 16px 20px; border-bottom: 1px solid #334155;
    }
    .sidebar-family-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
    .family-list { list-style: none; }
    .family-item {
      display: flex; align-items: center; gap: 10px; padding: 8px 12px;
      border-radius: 8px; cursor: pointer; transition: all 0.15s; margin-bottom: 2px;
    }
    .family-item:hover { background: #334155; }
    .family-item.active { background: rgba(16,185,129,0.15); color: #10b981; }
    .family-item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .family-item-name { font-size: 13px; font-weight: 500; }
    .family-item-role { font-size: 11px; color: #64748b; margin-left: auto; }
    .add-member-btn {
      display: flex; align-items: center; gap: 8px; padding: 8px 12px;
      border-radius: 8px; background: none; border: 1px dashed #475569;
      color: #94a3b8; font-size: 13px; width: 100%; transition: all 0.15s; margin-top: 6px;
    }
    .add-member-btn:hover { border-color: #10b981; color: #10b981; }

    .sidebar-nav { padding: 16px 12px; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px;
      border-radius: 8px; cursor: pointer; transition: all 0.15s; color: #94a3b8;
      font-size: 13px; font-weight: 500; border: none; background: none; width: 100%; text-align: left;
    }
    .nav-item:hover { background: #334155; color: #e2e8f0; }
    .nav-item.active { background: rgba(16,185,129,0.15); color: #10b981; }
    .nav-icon { width: 18px; height: 18px; flex-shrink: 0; }

    .sidebar-footer { padding: 16px 20px; border-top: 1px solid #334155; }
    .logout-btn {
      display: flex; align-items: center; gap: 8px; color: #64748b;
      font-size: 13px; background: none; border: none; padding: 8px 0;
      transition: color 0.15s; width: 100%;
    }
    .logout-btn:hover { color: #ef4444; }

    /* ── Content Area ──────────────────────── */
    .page-title { font-size: 24px; font-weight: 700; color: #f1f5f9; margin-bottom: 24px; }
    .page-subtitle { font-size: 14px; color: #94a3b8; margin-top: -16px; margin-bottom: 24px; }

    /* ── Cards ─────────────────────────────── */
    .card {
      background: #1e293b; border: 1px solid #334155; border-radius: 12px;
      padding: 24px; margin-bottom: 16px;
    }
    .card-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px;
    }
    .card-title { font-size: 16px; font-weight: 600; color: #f1f5f9; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .stat-card {
      background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px;
    }
    .stat-value { font-size: 28px; font-weight: 700; color: #f1f5f9; }
    .stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }

    /* ── Badges/Tags ───────────────────────── */
    .badge {
      display: inline-block; padding: 2px 10px; border-radius: 12px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .badge-green { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-yellow { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-red { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-blue { background: rgba(59,130,246,0.15); color: #3b82f6; }
    .badge-purple { background: rgba(139,92,246,0.15); color: #8b5cf6; }
    .badge-gray { background: rgba(100,116,139,0.15); color: #94a3b8; }
    .tag {
      display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px;
      background: #334155; color: #cbd5e1; margin: 2px;
    }

    /* ── Buttons ───────────────────────────── */
    .btn {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
      border-radius: 8px; font-size: 13px; font-weight: 600; border: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #10b981; color: white; }
    .btn-primary:hover { background: #059669; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: rgba(239,68,68,0.15); color: #ef4444; }
    .btn-danger:hover { background: rgba(239,68,68,0.25); }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .btn-icon { padding: 6px; border-radius: 6px; background: #334155; border: none; color: #94a3b8; }
    .btn-icon:hover { background: #475569; color: #e2e8f0; }

    /* ── Tables/Lists ─────────────────────── */
    .list-item {
      display: flex; align-items: center; gap: 16px; padding: 14px 16px;
      border-bottom: 1px solid #334155; transition: background 0.15s; cursor: pointer;
    }
    .list-item:hover { background: rgba(51,65,85,0.5); }
    .list-item:last-child { border-bottom: none; }

    /* ── Forms ─────────────────────────────── */
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 13px; font-weight: 500; color: #94a3b8; margin-bottom: 6px; }
    .form-input {
      width: 100%; padding: 10px 14px; background: #0f172a; border: 1px solid #334155;
      border-radius: 8px; color: #e2e8f0; font-size: 14px; transition: border-color 0.2s;
    }
    .form-input:focus { outline: none; border-color: #10b981; }
    .form-input::placeholder { color: #475569; }
    select.form-input { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
    textarea.form-input { resize: vertical; min-height: 80px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

    /* ── Modal ─────────────────────────────── */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 1000; display: flex;
      align-items: center; justify-content: center; padding: 20px;
    }
    .modal-overlay.hidden { display: none; }
    .modal {
      background: #1e293b; border: 1px solid #334155; border-radius: 16px;
      max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px; border-bottom: 1px solid #334155;
    }
    .modal-title { font-size: 18px; font-weight: 700; color: #f1f5f9; }
    .modal-close {
      background: none; border: none; color: #64748b; font-size: 20px;
      cursor: pointer; padding: 4px;
    }
    .modal-close:hover { color: #e2e8f0; }
    .modal-body { padding: 24px; }
    .modal-footer {
      padding: 16px 24px; border-top: 1px solid #334155;
      display: flex; justify-content: flex-end; gap: 8px;
    }

    /* ── Toast ─────────────────────────────── */
    .toast-container {
      position: fixed; top: 24px; right: 24px; z-index: 2000;
      display: flex; flex-direction: column; gap: 8px;
    }
    .toast {
      padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
      animation: slideIn 0.3s ease; min-width: 240px;
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
    }
    .toast-success { background: #065f46; color: #a7f3d0; border: 1px solid #10b981; }
    .toast-error { background: #7f1d1d; color: #fecaca; border: 1px solid #ef4444; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

    /* ── Spinner ───────────────────────────── */
    .spinner {
      width: 32px; height: 32px; border: 3px solid #334155;
      border-top-color: #10b981; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 40px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-center { display: flex; align-items: center; justify-content: center; padding: 60px; }

    /* ── Severity bar ─────────────────────── */
    .severity-bar { height: 8px; border-radius: 4px; background: #334155; overflow: hidden; width: 100px; display: inline-block; vertical-align: middle; }
    .severity-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }

    /* ── Empty state ──────────────────────── */
    .empty-state {
      text-align: center; padding: 60px 20px; color: #64748b;
    }
    .empty-state-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state-title { font-size: 18px; font-weight: 600; color: #94a3b8; margin-bottom: 8px; }
    .empty-state-text { font-size: 14px; margin-bottom: 24px; }

    /* ── Welcome ──────────────────────────── */
    .welcome-card {
      background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1));
      border: 1px solid #334155; border-radius: 16px; padding: 48px; text-align: center;
    }
    .welcome-title { font-size: 28px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
    .welcome-text { color: #94a3b8; font-size: 15px; max-width: 500px; margin: 0 auto 32px; }

    /* ── Activity Feed ────────────────────── */
    .activity-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(51,65,85,0.5); }
    .activity-item:last-child { border-bottom: none; }
    .activity-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
    .activity-text { font-size: 13px; color: #cbd5e1; }
    .activity-date { font-size: 11px; color: #64748b; margin-top: 2px; }

    /* ── Emergency Info ────────────────────── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-item-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .info-item-value { font-size: 13px; color: #e2e8f0; }

    /* ── Lab Panel ─────────────────────────── */
    .lab-panel { border: 1px solid #334155; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
    .lab-panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; background: rgba(30,41,59,0.8); cursor: pointer;
    }
    .lab-panel-header:hover { background: rgba(51,65,85,0.5); }
    .lab-panel-body { padding: 0 20px 16px; display: none; }
    .lab-panel-body.open { display: block; }
    .marker-row {
      display: flex; align-items: center; gap: 12px; padding: 10px 0;
      border-bottom: 1px solid rgba(51,65,85,0.4); font-size: 13px;
    }
    .marker-row:last-child { border-bottom: none; }
    .marker-name { flex: 1; font-weight: 500; color: #e2e8f0; min-width: 150px; }
    .marker-value { font-weight: 600; min-width: 80px; text-align: right; }
    .marker-unit { color: #64748b; min-width: 60px; }
    .marker-range { color: #64748b; font-size: 12px; min-width: 120px; }

    /* ── Chat ──────────────────────────────── */
    .chat-layout { display: flex; height: calc(100vh - 120px); gap: 0; margin: -32px; margin-top: 0; }
    .chat-sidebar {
      width: 260px; min-width: 260px; border-right: 1px solid #334155;
      display: flex; flex-direction: column; background: #1e293b;
    }
    .chat-sidebar-header { padding: 16px; border-bottom: 1px solid #334155; }
    .chat-list { flex: 1; overflow-y: auto; padding: 8px; }
    .chat-list-item {
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
      margin-bottom: 2px; transition: all 0.15s;
    }
    .chat-list-item:hover { background: #334155; }
    .chat-list-item.active { background: rgba(16,185,129,0.15); }
    .chat-list-title { font-size: 13px; font-weight: 500; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chat-list-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
    .chat-main { flex: 1; display: flex; flex-direction: column; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 24px; }
    .chat-msg { max-width: 80%; margin-bottom: 16px; }
    .chat-msg.user { margin-left: auto; }
    .chat-msg.assistant { margin-right: auto; }
    .chat-bubble {
      padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.6;
    }
    .chat-msg.user .chat-bubble { background: #10b981; color: white; border-bottom-right-radius: 4px; }
    .chat-msg.assistant .chat-bubble { background: #334155; color: #e2e8f0; border-bottom-left-radius: 4px; }
    .chat-input-area {
      padding: 16px 24px; border-top: 1px solid #334155; display: flex; gap: 8px;
    }
    .chat-input {
      flex: 1; padding: 12px 16px; background: #0f172a; border: 1px solid #334155;
      border-radius: 12px; color: #e2e8f0; font-size: 14px; resize: none;
    }
    .chat-input:focus { outline: none; border-color: #10b981; }
    .chat-send {
      padding: 12px 20px; background: #10b981; color: white; border: none;
      border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer;
    }
    .chat-send:hover { background: #059669; }
    .chat-send:disabled { background: #334155; color: #64748b; cursor: not-allowed; }
    .typing-indicator { display: flex; gap: 4px; padding: 8px 0; }
    .typing-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #64748b;
      animation: typingBounce 1.4s ease-in-out infinite;
    }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typingBounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }

    /* ── Knowledge ─────────────────────────── */
    .knowledge-item {
      display: flex; align-items: flex-start; gap: 16px; padding: 16px;
      border: 1px solid #334155; border-radius: 12px; margin-bottom: 8px;
    }
    .knowledge-icon {
      width: 40px; height: 40px; border-radius: 8px; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      background: rgba(59,130,246,0.15); color: #3b82f6;
    }
    .knowledge-title { font-size: 14px; font-weight: 600; color: #e2e8f0; }
    .knowledge-meta { font-size: 12px; color: #64748b; margin-top: 4px; }
    .knowledge-preview { font-size: 13px; color: #94a3b8; margin-top: 8px; }

    /* ── Trends/Charts ─────────────────────── */
    .chart-container { position: relative; height: 300px; margin: 16px 0; }

    /* ── Marker autocomplete ──────────────── */
    .autocomplete-wrapper { position: relative; }
    .autocomplete-list {
      position: absolute; top: 100%; left: 0; right: 0; background: #1e293b;
      border: 1px solid #334155; border-radius: 8px; max-height: 200px;
      overflow-y: auto; z-index: 10; display: none;
    }
    .autocomplete-list.open { display: block; }
    .autocomplete-item {
      padding: 8px 14px; cursor: pointer; font-size: 13px; color: #e2e8f0;
    }
    .autocomplete-item:hover { background: #334155; }
    .autocomplete-item-sub { font-size: 11px; color: #64748b; }

    /* ── Responsive ────────────────────────── */
    @media (max-width: 900px) {
      .sidebar { width: 260px; min-width: 260px; }
      .main { margin-left: 260px; padding: 20px; }
      .form-row, .form-row-3 { grid-template-columns: 1fr; }
      .card-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      .sidebar { transform: translateX(-100%); transition: transform 0.3s; position: fixed; width: 280px; }
      .sidebar.open { transform: translateX(0); }
      .main { margin-left: 0; }
      .mobile-toggle {
        display: flex !important; position: fixed; top: 16px; left: 16px; z-index: 200;
        background: #1e293b; border: 1px solid #334155; border-radius: 8px;
        padding: 8px; color: #e2e8f0;
      }
    }
    .mobile-toggle { display: none; cursor: pointer; border: none; }
  </style>
</head>
<body>
  <div class="app">
    <button class="mobile-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <div>
          <div class="sidebar-logo-text">Optimal Health</div>
          <div class="sidebar-logo-sub">Family Dashboard</div>
        </div>
      </div>

      <div class="sidebar-user">
        <div class="sidebar-avatar">
          ${userPicture ? `<img src="${userPicture}" alt="Avatar" referrerpolicy="no-referrer" />` : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
        </div>
        <div style="overflow:hidden;">
          <div class="sidebar-user-name">${userName}</div>
          <div class="sidebar-user-email">${userEmail}</div>
        </div>
      </div>

      <div class="sidebar-family">
        <div class="sidebar-family-label">Family Members</div>
        <ul class="family-list" id="familyList"></ul>
        <button class="add-member-btn" onclick="App.showAddMemberModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Family Member
        </button>
      </div>

      <nav class="sidebar-nav">
        <button class="nav-item active" data-view="dashboard" onclick="App.navigate('dashboard')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Dashboard
        </button>
        <button class="nav-item" data-view="profile" onclick="App.navigate('profile')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile & Vitals
        </button>
        <button class="nav-item" data-view="labs" onclick="App.navigate('labs')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2v6.5L18 14c1 2 .5 4-2 5H8c-2.5-1-3-3-2-5l3.5-5.5V2"/><line x1="9" y1="2" x2="15" y2="2"/></svg>
          Lab Results
        </button>
        <button class="nav-item" data-view="symptoms" onclick="App.navigate('symptoms')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>
          Symptoms
        </button>
        <button class="nav-item" data-view="protocols" onclick="App.navigate('protocols')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          Protocols
        </button>
        <button class="nav-item" data-view="diet" onclick="App.navigate('diet')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          Diet Log
        </button>
        <button class="nav-item" data-view="trends" onclick="App.navigate('trends')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Trends
        </button>
        <button class="nav-item" data-view="chat" onclick="App.navigate('chat')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          AI Wellness Chat
        </button>
        <button class="nav-item" data-view="knowledge" onclick="App.navigate('knowledge')">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          Knowledge Base
        </button>
      </nav>

      <div class="sidebar-footer">
        <a href="/auth/logout" class="logout-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </a>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main" id="mainContent">
      <div class="loading-center"><div class="spinner"></div></div>
    </main>
  </div>

  <!-- Toast Container -->
  <div class="toast-container" id="toastContainer"></div>

  <!-- Modal Container -->
  <div class="modal-overlay hidden" id="modalOverlay" onclick="if(event.target===this)App.closeModal()">
    <div class="modal" id="modalContent"></div>
  </div>

<script>
// ══════════════════════════════════════════════════════════════
// APPLICATION STATE & CORE
// ══════════════════════════════════════════════════════════════

var App = (function() {
  var state = {
    familyMembers: [],
    selectedMember: null,
    currentView: 'dashboard',
    references: null,
    charts: {}
  };

  // ── API Helper ────────────────────────────────────────────

  function api(method, url, body) {
    var opts = { method: method, credentials: 'same-origin', headers: {} };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function(r) {
      if (r.status === 401) { window.location.href = '/auth/login'; return Promise.reject('Unauthorized'); }
      if (!r.ok) return r.json().then(function(e) { return Promise.reject(e.error || 'Request failed'); });
      return r.json();
    });
  }

  // ── Toast ─────────────────────────────────────────────────

  function toast(message, type) {
    var el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'success');
    el.textContent = message;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(function() { el.remove(); }, 4000);
  }

  // ── Modal ─────────────────────────────────────────────────

  function showModal(html) {
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('modalContent').innerHTML = '';
  }

  // ── Helpers ───────────────────────────────────────────────

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function calcAge(dob) {
    if (!dob) return '';
    var birth = new Date(dob);
    var today = new Date();
    var age = today.getFullYear() - birth.getFullYear();
    var m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function severityColor(sev) {
    if (sev <= 3) return '#10b981';
    if (sev <= 6) return '#f59e0b';
    return '#ef4444';
  }

  function markerStatusBadge(value, optLow, optHigh, convLow, convHigh) {
    var v = parseFloat(value);
    if (isNaN(v)) return '<span class="badge badge-gray">N/A</span>';
    if (optLow != null && optHigh != null && v >= optLow && v <= optHigh) return '<span class="badge badge-green">OPTIMAL</span>';
    if (convLow != null && convHigh != null && v >= convLow && v <= convHigh) return '<span class="badge badge-yellow">ACCEPTABLE</span>';
    return '<span class="badge badge-red">OUT OF RANGE</span>';
  }

  function energyEmoji(level) {
    if (!level) return '';
    if (level <= 2) return '😴';
    if (level <= 4) return '😐';
    if (level <= 6) return '🙂';
    if (level <= 8) return '😊';
    return '🔥';
  }

  function protocolStatusBadge(status) {
    var map = { active: 'badge-green', paused: 'badge-yellow', completed: 'badge-blue', discontinued: 'badge-gray' };
    return '<span class="badge ' + (map[status] || 'badge-gray') + '">' + esc(status) + '</span>';
  }

  function categoryBadge(cat) {
    var colors = { supplement: 'badge-green', diet: 'badge-yellow', lifestyle: 'badge-blue', treatment: 'badge-purple', detox: 'badge-red', exercise: 'badge-green', 'stress-management': 'badge-purple', sleep: 'badge-blue', other: 'badge-gray' };
    return '<span class="badge ' + (colors[cat] || 'badge-gray') + '">' + esc(cat) + '</span>';
  }

  // ── Navigation ────────────────────────────────────────────

  function navigate(view) {
    state.currentView = view;
    window.location.hash = view;
    document.querySelectorAll('.nav-item').forEach(function(el) {
      el.classList.toggle('active', el.getAttribute('data-view') === view);
    });
    renderView();
  }

  function renderView() {
    var main = document.getElementById('mainContent');
    if (!state.selectedMember && state.currentView !== 'knowledge') {
      renderWelcome(main);
      return;
    }
    switch (state.currentView) {
      case 'dashboard': renderDashboard(main); break;
      case 'profile': renderProfile(main); break;
      case 'labs': renderLabs(main); break;
      case 'symptoms': renderSymptoms(main); break;
      case 'protocols': renderProtocols(main); break;
      case 'diet': renderDiet(main); break;
      case 'trends': renderTrends(main); break;
      case 'chat': renderChat(main); break;
      case 'knowledge': renderKnowledge(main); break;
      default: renderDashboard(main);
    }
  }

  // ── Load References ───────────────────────────────────────

  function loadReferences() {
    return api('GET', '/api/health/references').then(function(data) {
      state.references = data;
    });
  }

  // ── Family Members ────────────────────────────────────────

  function loadFamily() {
    return api('GET', '/api/health/family').then(function(members) {
      state.familyMembers = members;
      renderFamilyList();
      if (members.length > 0 && !state.selectedMember) {
        selectMember(members[0]);
      } else if (state.selectedMember) {
        var found = members.find(function(m) { return m.id === state.selectedMember.id; });
        if (found) { state.selectedMember = found; renderFamilyList(); }
      }
      if (members.length === 0) { state.selectedMember = null; renderView(); }
    });
  }

  function renderFamilyList() {
    var list = document.getElementById('familyList');
    list.innerHTML = state.familyMembers.map(function(m) {
      var isActive = state.selectedMember && state.selectedMember.id === m.id;
      return '<li class="family-item' + (isActive ? ' active' : '') + '" onclick="App.selectMember(\'' + m.id + '\')">' +
        '<span class="family-item-dot" style="background:' + esc(m.avatar_color || '#10b981') + '"></span>' +
        '<span class="family-item-name">' + esc(m.name) + '</span>' +
        '<span class="family-item-role">' + esc(m.role || '') + '</span>' +
      '</li>';
    }).join('');
  }

  function selectMember(memberOrId) {
    var member = typeof memberOrId === 'string'
      ? state.familyMembers.find(function(m) { return m.id === memberOrId; })
      : memberOrId;
    if (!member) return;
    state.selectedMember = member;
    renderFamilyList();
    renderView();
  }

  // ── Welcome View ──────────────────────────────────────────

  function renderWelcome(main) {
    main.innerHTML =
      '<div class="welcome-card">' +
        '<div style="font-size:48px;margin-bottom:16px;">🌿</div>' +
        '<h1 class="welcome-title">Welcome to Your Health Dashboard</h1>' +
        '<p class="welcome-text">Track lab results, symptoms, protocols, and diet for your entire family using a functional medicine approach. Start by adding your first family member.</p>' +
        '<button class="btn btn-primary" onclick="App.showAddMemberModal()" style="font-size:15px;padding:12px 32px;">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
          'Add First Family Member' +
        '</button>' +
      '</div>';
  }

  // ── Add/Edit Member Modal ─────────────────────────────────

  function showAddMemberModal(existing) {
    var m = existing || {};
    var isEdit = !!m.id;
    var title = isEdit ? 'Edit Family Member' : 'Add Family Member';
    var html =
      '<div class="modal-header"><h2 class="modal-title">' + title + '</h2><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="fm-name" value="' + esc(m.name || '') + '" placeholder="Full name" /></div>' +
          '<div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" id="fm-dob" type="date" value="' + esc(m.date_of_birth ? m.date_of_birth.split('T')[0] : '') + '" /></div>' +
        '</div>' +
        '<div class="form-row-3">' +
          '<div class="form-group"><label class="form-label">Sex</label><select class="form-input" id="fm-sex"><option value="">Select</option><option value="male"' + (m.sex==='male'?' selected':'') + '>Male</option><option value="female"' + (m.sex==='female'?' selected':'') + '>Female</option><option value="other"' + (m.sex==='other'?' selected':'') + '>Other</option></select></div>' +
          '<div class="form-group"><label class="form-label">Role</label><select class="form-input" id="fm-role"><option value="">Select</option><option value="adult"' + (m.role==='adult'?' selected':'') + '>Adult</option><option value="child"' + (m.role==='child'?' selected':'') + '>Child</option></select></div>' +
          '<div class="form-group"><label class="form-label">Blood Type</label><select class="form-input" id="fm-blood"><option value="">Select</option><option' + (m.blood_type==='A+'?' selected':'') + '>A+</option><option' + (m.blood_type==='A-'?' selected':'') + '>A-</option><option' + (m.blood_type==='B+'?' selected':'') + '>B+</option><option' + (m.blood_type==='B-'?' selected':'') + '>B-</option><option' + (m.blood_type==='AB+'?' selected':'') + '>AB+</option><option' + (m.blood_type==='AB-'?' selected':'') + '>AB-</option><option' + (m.blood_type==='O+'?' selected':'') + '>O+</option><option' + (m.blood_type==='O-'?' selected':'') + '>O-</option></select></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Height (inches)</label><input class="form-input" id="fm-height" type="number" value="' + (m.height_inches || '') + '" placeholder="e.g. 70" /></div>' +
          '<div class="form-group"><label class="form-label">Weight (lbs)</label><input class="form-input" id="fm-weight" type="number" value="' + (m.weight_lbs || '') + '" placeholder="e.g. 165" /></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Allergies (comma-separated)</label><input class="form-input" id="fm-allergies" value="' + esc((m.allergies||[]).join(', ')) + '" placeholder="e.g. Penicillin, Shellfish" /></div>' +
        '<div class="form-group"><label class="form-label">Conditions (comma-separated)</label><input class="form-input" id="fm-conditions" value="' + esc((m.conditions||[]).join(', ')) + '" placeholder="e.g. Hashimotos, MTHFR" /></div>' +
        '<div class="form-group"><label class="form-label">Medications (comma-separated)</label><input class="form-input" id="fm-medications" value="' + esc((m.medications||[]).join(', ')) + '" placeholder="e.g. Levothyroxine 50mcg" /></div>' +
        '<div class="form-group"><label class="form-label">Health Goals (comma-separated)</label><input class="form-input" id="fm-goals" value="' + esc((m.health_goals||[]).join(', ')) + '" placeholder="e.g. Optimize thyroid, Reduce inflammation" /></div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Primary Doctor</label><input class="form-input" id="fm-doctor" value="' + esc(m.primary_doctor || '') + '" /></div>' +
          '<div class="form-group"><label class="form-label">Emergency Contact</label><input class="form-input" id="fm-emergency" value="' + esc(m.emergency_contact_name || '') + '" placeholder="Name" /></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Emergency Contact Phone</label><input class="form-input" id="fm-emergencyphone" value="' + esc(m.emergency_contact_phone || '') + '" /></div>' +
          '<div class="form-group"><label class="form-label">Avatar Color</label><input class="form-input" id="fm-color" type="color" value="' + (m.avatar_color || '#10b981') + '" /></div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Pharmacy</label><input class="form-input" id="fm-pharmacy" value="' + esc(m.pharmacy_name || '') + '" /></div>' +
          '<div class="form-group"><label class="form-label">Pharmacy Phone</label><input class="form-input" id="fm-pharmacyphone" value="' + esc(m.pharmacy_phone || '') + '" /></div>' +
        '</div>' +
        '<div class="form-row-3">' +
          '<div class="form-group"><label class="form-label">Insurance Provider</label><input class="form-input" id="fm-insurance" value="' + esc(m.insurance_provider || '') + '" /></div>' +
          '<div class="form-group"><label class="form-label">Policy #</label><input class="form-input" id="fm-policy" value="' + esc(m.insurance_policy || '') + '" /></div>' +
          '<div class="form-group"><label class="form-label">Group #</label><input class="form-input" id="fm-group" value="' + esc(m.insurance_group || '') + '" /></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Address</label><input class="form-input" id="fm-address" value="' + esc(m.address || '') + '" /></div>' +
        '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="fm-notes">' + esc(m.notes || '') + '</textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="App.saveMember(\'' + (m.id || '') + '\')">' + (isEdit ? 'Update' : 'Create') + '</button>' +
      '</div>';
    showModal(html);
  }

  function parseCsv(val) {
    return val ? val.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
  }

  function saveMember(id) {
    var data = {
      name: document.getElementById('fm-name').value.trim(),
      date_of_birth: document.getElementById('fm-dob').value || undefined,
      sex: document.getElementById('fm-sex').value || undefined,
      role: document.getElementById('fm-role').value || undefined,
      blood_type: document.getElementById('fm-blood').value || '',
      height_inches: parseFloat(document.getElementById('fm-height').value) || undefined,
      weight_lbs: parseFloat(document.getElementById('fm-weight').value) || undefined,
      allergies: parseCsv(document.getElementById('fm-allergies').value),
      conditions: parseCsv(document.getElementById('fm-conditions').value),
      medications: parseCsv(document.getElementById('fm-medications').value),
      health_goals: parseCsv(document.getElementById('fm-goals').value),
      primary_doctor: document.getElementById('fm-doctor').value.trim(),
      emergency_contact_name: document.getElementById('fm-emergency').value.trim(),
      emergency_contact_phone: document.getElementById('fm-emergencyphone').value.trim(),
      avatar_color: document.getElementById('fm-color').value,
      pharmacy_name: document.getElementById('fm-pharmacy').value.trim(),
      pharmacy_phone: document.getElementById('fm-pharmacyphone').value.trim(),
      insurance_provider: document.getElementById('fm-insurance').value.trim(),
      insurance_policy: document.getElementById('fm-policy').value.trim(),
      insurance_group: document.getElementById('fm-group').value.trim(),
      address: document.getElementById('fm-address').value.trim(),
      notes: document.getElementById('fm-notes').value.trim()
    };
    if (!data.name) { toast('Name is required', 'error'); return; }
    var method = id ? 'PUT' : 'POST';
    var url = id ? '/api/health/family/' + id : '/api/health/family';
    api(method, url, data).then(function(saved) {
      toast(id ? 'Member updated' : 'Member created');
      closeModal();
      loadFamily().then(function() {
        selectMember(saved.id);
      });
    }).catch(function(err) { toast(String(err), 'error'); });
  }


  // ══════════════════════════════════════════════════════════
  // DASHBOARD OVERVIEW VIEW
  // ══════════════════════════════════════════════════════════

  function renderDashboard(main) {
    var m = state.selectedMember;
    main.innerHTML = '<h1 class="page-title">' + esc(m.name) + '</h1><div class="loading-center"><div class="spinner"></div></div>';
    api('GET', '/api/health/dashboard?memberId=' + m.id).then(function(data) {
      var age = calcAge(m.date_of_birth);
      var activeSymptoms = data.recentSymptoms ? data.recentSymptoms.length : 0;
      var activeProtocols = data.protocols ? data.protocols.filter(function(p) { return p.status === 'active'; }).length : 0;
      var labCount = data.recentLabs ? data.recentLabs.length : 0;

      var vitalsHtml = '<div class="card-grid">';
      vitalsHtml += '<div class="stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.15);color:#10b981;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2v6.5L18 14c1 2 .5 4-2 5H8c-2.5-1-3-3-2-5l3.5-5.5V2"/></svg></div><div class="stat-value">' + labCount + '</div><div class="stat-label">Recent Lab Panels</div></div>';
      vitalsHtml += '<div class="stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="stat-value">' + activeSymptoms + '</div><div class="stat-label">Recent Symptoms</div></div>';
      vitalsHtml += '<div class="stat-card"><div class="stat-icon" style="background:rgba(59,130,246,0.15);color:#3b82f6;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg></div><div class="stat-value">' + activeProtocols + '</div><div class="stat-label">Active Protocols</div></div>';
      vitalsHtml += '</div>';

      var quickVitals = '<div class="card"><div class="card-header"><span class="card-title">Quick Vitals</span></div><div class="info-grid">';
      if (age) quickVitals += '<div><div class="info-item-label">Age</div><div class="info-item-value">' + age + ' years</div></div>';
      if (m.weight_lbs) quickVitals += '<div><div class="info-item-label">Weight</div><div class="info-item-value">' + m.weight_lbs + ' lbs</div></div>';
      if (m.height_inches) quickVitals += '<div><div class="info-item-label">Height</div><div class="info-item-value">' + Math.floor(m.height_inches/12) + "'" + (m.height_inches%12) + '"</div></div>';
      if (m.blood_type) quickVitals += '<div><div class="info-item-label">Blood Type</div><div class="info-item-value">' + esc(m.blood_type) + '</div></div>';
      if (m.sex) quickVitals += '<div><div class="info-item-label">Sex</div><div class="info-item-value" style="text-transform:capitalize;">' + esc(m.sex) + '</div></div>';
      if (m.role) quickVitals += '<div><div class="info-item-label">Role</div><div class="info-item-value" style="text-transform:capitalize;">' + esc(m.role) + '</div></div>';
      quickVitals += '</div></div>';

      // Emergency info
      var emergHtml = '';
      if (m.allergies && m.allergies.length || m.conditions && m.conditions.length || m.primary_doctor || m.medications && m.medications.length) {
        emergHtml = '<div class="card"><div class="card-header"><span class="card-title">Emergency & Medical Info</span></div><div class="info-grid">';
        if (m.allergies && m.allergies.length) emergHtml += '<div><div class="info-item-label">Allergies</div><div class="info-item-value">' + m.allergies.map(function(a) { return '<span class="tag">' + esc(a) + '</span>'; }).join(' ') + '</div></div>';
        if (m.conditions && m.conditions.length) emergHtml += '<div><div class="info-item-label">Conditions</div><div class="info-item-value">' + m.conditions.map(function(c) { return '<span class="tag">' + esc(c) + '</span>'; }).join(' ') + '</div></div>';
        if (m.medications && m.medications.length) emergHtml += '<div><div class="info-item-label">Medications</div><div class="info-item-value">' + m.medications.map(function(x) { return '<span class="tag">' + esc(x) + '</span>'; }).join(' ') + '</div></div>';
        if (m.primary_doctor) emergHtml += '<div><div class="info-item-label">Doctor</div><div class="info-item-value">' + esc(m.primary_doctor) + '</div></div>';
        if (m.pharmacy_name) emergHtml += '<div><div class="info-item-label">Pharmacy</div><div class="info-item-value">' + esc(m.pharmacy_name) + (m.pharmacy_phone ? ' (' + esc(m.pharmacy_phone) + ')' : '') + '</div></div>';
        if (m.insurance_provider) emergHtml += '<div><div class="info-item-label">Insurance</div><div class="info-item-value">' + esc(m.insurance_provider) + '</div></div>';
        emergHtml += '</div></div>';
      }

      // Activity feed
      var activities = [];
      (data.recentLabs || []).forEach(function(l) {
        activities.push({ date: l.test_date, type: 'lab', text: 'Lab panel: ' + (l.test_type || l.lab_name || 'Blood work'), color: '#10b981' });
      });
      (data.recentSymptoms || []).forEach(function(s) {
        activities.push({ date: s.logged_date, type: 'symptom', text: 'Symptom: ' + s.symptom + ' (severity ' + s.severity + '/10)', color: '#f59e0b' });
      });
      (data.recentDiet || []).forEach(function(d) {
        activities.push({ date: d.logged_date, type: 'diet', text: (d.meal_type || 'Meal') + ': ' + (d.description || '').slice(0, 60), color: '#3b82f6' });
      });
      activities.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
      activities = activities.slice(0, 8);

      var activityHtml = '';
      if (activities.length) {
        activityHtml = '<div class="card"><div class="card-header"><span class="card-title">Recent Activity</span></div>';
        activities.forEach(function(a) {
          activityHtml += '<div class="activity-item"><span class="activity-dot" style="background:' + a.color + '"></span><div><div class="activity-text">' + esc(a.text) + '</div><div class="activity-date">' + formatDate(a.date) + '</div></div></div>';
        });
        activityHtml += '</div>';
      }

      main.innerHTML = '<h1 class="page-title">' + esc(m.name) + '</h1>' + vitalsHtml + quickVitals + emergHtml + activityHtml;
    }).catch(function(err) {
      main.innerHTML = '<h1 class="page-title">' + esc(m.name) + '</h1><div class="card"><p style="color:#ef4444;">Failed to load dashboard: ' + esc(String(err)) + '</p></div>';
    });
  }

  // ══════════════════════════════════════════════════════════
  // PROFILE & VITALS VIEW
  // ══════════════════════════════════════════════════════════

  function renderProfile(main) {
    var m = state.selectedMember;
    var age = calcAge(m.date_of_birth);

    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Profile & Vitals</h1><button class="btn btn-primary" onclick="App.showAddMemberModal(App.getSelectedMember())">Edit Profile</button></div>';

    html += '<div class="card"><div class="card-header"><span class="card-title">Personal Information</span></div>';
    html += '<div class="info-grid">';
    html += '<div><div class="info-item-label">Full Name</div><div class="info-item-value">' + esc(m.name) + '</div></div>';
    if (m.date_of_birth) html += '<div><div class="info-item-label">Date of Birth</div><div class="info-item-value">' + formatDate(m.date_of_birth) + (age ? ' (' + age + ' years)' : '') + '</div></div>';
    if (m.sex) html += '<div><div class="info-item-label">Sex</div><div class="info-item-value" style="text-transform:capitalize;">' + esc(m.sex) + '</div></div>';
    if (m.role) html += '<div><div class="info-item-label">Role</div><div class="info-item-value" style="text-transform:capitalize;">' + esc(m.role) + '</div></div>';
    if (m.height_inches) html += '<div><div class="info-item-label">Height</div><div class="info-item-value">' + Math.floor(m.height_inches/12) + "\' " + (m.height_inches%12) + '\"</div></div>';
    if (m.weight_lbs) html += '<div><div class="info-item-label">Weight</div><div class="info-item-value">' + m.weight_lbs + ' lbs</div></div>';
    if (m.blood_type) html += '<div><div class="info-item-label">Blood Type</div><div class="info-item-value">' + esc(m.blood_type) + '</div></div>';
    html += '</div></div>';

    // Medical info
    html += '<div class="card"><div class="card-header"><span class="card-title">Medical Information</span></div>';
    html += '<div style="margin-bottom:12px;"><div class="info-item-label">Allergies</div><div class="info-item-value">' + ((m.allergies && m.allergies.length) ? m.allergies.map(function(a) { return '<span class="tag">' + esc(a) + '</span>'; }).join(' ') : '<span style="color:#64748b;">None recorded</span>') + '</div></div>';
    html += '<div style="margin-bottom:12px;"><div class="info-item-label">Conditions</div><div class="info-item-value">' + ((m.conditions && m.conditions.length) ? m.conditions.map(function(c) { return '<span class="tag">' + esc(c) + '</span>'; }).join(' ') : '<span style="color:#64748b;">None recorded</span>') + '</div></div>';
    html += '<div style="margin-bottom:12px;"><div class="info-item-label">Medications</div><div class="info-item-value">' + ((m.medications && m.medications.length) ? m.medications.map(function(x) { return '<span class="tag">' + esc(x) + '</span>'; }).join(' ') : '<span style="color:#64748b;">None recorded</span>') + '</div></div>';
    html += '<div style="margin-bottom:12px;"><div class="info-item-label">Health Goals</div><div class="info-item-value">' + ((m.health_goals && m.health_goals.length) ? m.health_goals.map(function(g) { return '<span class="tag">' + esc(g) + '</span>'; }).join(' ') : '<span style="color:#64748b;">None recorded</span>') + '</div></div>';
    html += '</div>';

    // Emergency & Provider Info
    html += '<div class="card"><div class="card-header"><span class="card-title">Emergency & Provider Info</span></div><div class="info-grid">';
    html += '<div><div class="info-item-label">Primary Doctor</div><div class="info-item-value">' + esc(m.primary_doctor || 'Not set') + '</div></div>';
    html += '<div><div class="info-item-label">Pharmacy</div><div class="info-item-value">' + esc(m.pharmacy_name || 'Not set') + (m.pharmacy_phone ? ' (' + esc(m.pharmacy_phone) + ')' : '') + '</div></div>';
    html += '<div><div class="info-item-label">Insurance</div><div class="info-item-value">' + esc(m.insurance_provider || 'Not set') + (m.insurance_policy ? ' #' + esc(m.insurance_policy) : '') + '</div></div>';
    html += '<div><div class="info-item-label">Emergency Contact</div><div class="info-item-value">' + esc(m.emergency_contact_name || 'Not set') + (m.emergency_contact_phone ? ' (' + esc(m.emergency_contact_phone) + ')' : '') + '</div></div>';
    if (m.address) html += '<div><div class="info-item-label">Address</div><div class="info-item-value">' + esc(m.address) + '</div></div>';
    html += '</div></div>';

    if (m.notes) {
      html += '<div class="card"><div class="card-header"><span class="card-title">Notes</span></div><p style="color:#cbd5e1;font-size:14px;white-space:pre-wrap;">' + esc(m.notes) + '</p></div>';
    }

    main.innerHTML = html;
  }


  // ══════════════════════════════════════════════════════════
  // LAB RESULTS VIEW
  // ══════════════════════════════════════════════════════════

  function renderLabs(main) {
    var m = state.selectedMember;
    main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Lab Results</h1><button class="btn btn-primary" onclick="App.showLabModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Lab Panel</button></div><div class="loading-center"><div class="spinner"></div></div>';

    api('GET', '/api/health/labs?memberId=' + m.id).then(function(labs) {
      if (!labs.length) {
        main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Lab Results</h1><button class="btn btn-primary" onclick="App.showLabModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Lab Panel</button></div>' +
          '<div class="empty-state"><div class="empty-state-icon">🧪</div><div class="empty-state-title">No Lab Results Yet</div><div class="empty-state-text">Add your first lab panel to start tracking your biomarkers.</div><button class="btn btn-primary" onclick="App.showLabModal()">Add Lab Panel</button></div>';
        return;
      }

      var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Lab Results</h1><button class="btn btn-primary" onclick="App.showLabModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Lab Panel</button></div>';

      labs.forEach(function(lab, idx) {
        var markers = lab.markers || [];
        var markerCount = markers.length;
        html += '<div class="lab-panel">';
        html += '<div class="lab-panel-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">';
        html += '<div><div style="font-weight:600;color:#f1f5f9;">' + formatDate(lab.test_date) + '</div>';
        html += '<div style="font-size:12px;color:#94a3b8;margin-top:2px;">' + esc(lab.lab_name || '') + (lab.test_type ? ' - ' + esc(lab.test_type) : '') + '</div></div>';
        html += '<div style="display:flex;align-items:center;gap:12px;">';
        html += '<span class="badge badge-blue">' + markerCount + ' markers</span>';
        html += '<button class="btn-icon btn-sm" onclick="event.stopPropagation();App.deleteLab(\'' + lab.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';
        html += '</div></div>';
        html += '<div class="lab-panel-body">';
        if (lab.notes) html += '<p style="font-size:13px;color:#94a3b8;margin-bottom:12px;padding-top:12px;">' + esc(lab.notes) + '</p>';
        if (markers.length) {
          html += '<div style="padding-top:8px;">';
          markers.forEach(function(mk) {
            html += '<div class="marker-row">';
            html += '<span class="marker-name">' + esc(mk.name) + '</span>';
            html += '<span class="marker-value">' + mk.value + '</span>';
            html += '<span class="marker-unit">' + esc(mk.unit || '') + '</span>';
            html += markerStatusBadge(mk.value, mk.optimal_low, mk.optimal_high, mk.conventional_low, mk.conventional_high);
            html += '<span class="marker-range">' + (mk.optimal_low != null ? mk.optimal_low + ' - ' + mk.optimal_high : '') + '</span>';
            html += '</div>';
          });
          html += '</div>';
        } else {
          html += '<p style="color:#64748b;font-size:13px;padding-top:12px;">No markers added to this panel.</p>';
        }
        html += '</div></div>';
      });

      main.innerHTML = html;
    }).catch(function(err) {
      main.innerHTML = '<h1 class="page-title">Lab Results</h1><div class="card"><p style="color:#ef4444;">Failed to load: ' + esc(String(err)) + '</p></div>';
    });
  }

  function showLabModal() {
    var markerRows = '<div id="markerRows"></div>';
    var html =
      '<div class="modal-header"><h2 class="modal-title">Add Lab Panel</h2><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Test Date *</label><input class="form-input" id="lab-date" type="date" value="' + new Date().toISOString().split('T')[0] + '" /></div>' +
          '<div class="form-group"><label class="form-label">Lab Name</label><input class="form-input" id="lab-name" placeholder="e.g. Quest Diagnostics" /></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Test Type</label><input class="form-input" id="lab-type" placeholder="e.g. Comprehensive Metabolic Panel" /></div>' +
        '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="lab-notes" rows="2"></textarea></div>' +
        '<div style="border-top:1px solid #334155;margin:16px 0;padding-top:16px;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><span class="card-title">Markers</span><button class="btn btn-sm btn-secondary" onclick="App.addMarkerRow()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Marker</button></div>' +
          markerRows +
        '</div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="App.saveLab()">Save Lab Panel</button>' +
      '</div>';
    showModal(html);
    addMarkerRow();
  }

  var markerRowCounter = 0;
  function addMarkerRow() {
    var container = document.getElementById('markerRows');
    var rowId = 'marker-row-' + (markerRowCounter++);
    var div = document.createElement('div');
    div.id = rowId;
    div.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;';
    div.innerHTML =
      '<div class="form-group" style="margin:0;"><label class="form-label">Marker Name</label><div class="autocomplete-wrapper"><input class="form-input marker-name-input" placeholder="e.g. TSH" oninput="App.markerAutocomplete(this)" onfocus="App.markerAutocomplete(this)" /><div class="autocomplete-list"></div></div></div>' +
      '<div class="form-group" style="margin:0;"><label class="form-label">Value</label><input class="form-input marker-value-input" type="number" step="any" placeholder="0.0" /></div>' +
      '<div class="form-group" style="margin:0;"><label class="form-label">Unit</label><input class="form-input marker-unit-input" placeholder="unit" /></div>' +
      '<button class="btn-icon" style="margin-bottom:2px;" onclick="this.parentElement.remove()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';
    container.appendChild(div);
  }

  function markerAutocomplete(input) {
    var val = input.value.toLowerCase();
    var listEl = input.parentElement.querySelector('.autocomplete-list');
    if (!val || val.length < 1) { listEl.classList.remove('open'); return; }
    var refs = state.references ? state.references.markers : {};
    var matches = Object.values(refs).filter(function(r) {
      return r.name.toLowerCase().indexOf(val) !== -1 || r.category.toLowerCase().indexOf(val) !== -1;
    }).slice(0, 8);
    if (!matches.length) { listEl.classList.remove('open'); return; }
    listEl.innerHTML = matches.map(function(r) {
      return '<div class="autocomplete-item" onmousedown="App.selectMarkerRef(this,\'' + esc(r.name) + '\',\'' + esc(r.unit) + '\')"><div>' + esc(r.name) + '</div><div class="autocomplete-item-sub">' + esc(r.category) + ' | ' + esc(r.unit) + '</div></div>';
    }).join('');
    listEl.classList.add('open');
    input.addEventListener('blur', function handler() { setTimeout(function() { listEl.classList.remove('open'); }, 200); input.removeEventListener('blur', handler); });
  }

  function selectMarkerRef(el, name, unit) {
    var row = el.closest('[id^="marker-row-"]');
    row.querySelector('.marker-name-input').value = name;
    row.querySelector('.marker-unit-input').value = unit;
    el.closest('.autocomplete-list').classList.remove('open');
  }

  function saveLab() {
    var m = state.selectedMember;
    var markers = [];
    document.querySelectorAll('[id^="marker-row-"]').forEach(function(row) {
      var name = row.querySelector('.marker-name-input').value.trim();
      var value = parseFloat(row.querySelector('.marker-value-input').value);
      var unit = row.querySelector('.marker-unit-input').value.trim();
      if (name && !isNaN(value)) {
        markers.push({ name: name, value: value, unit: unit || undefined });
      }
    });
    var data = {
      family_member_id: m.id,
      test_date: document.getElementById('lab-date').value,
      lab_name: document.getElementById('lab-name').value.trim(),
      test_type: document.getElementById('lab-type').value.trim(),
      notes: document.getElementById('lab-notes').value.trim(),
      markers: markers
    };
    if (!data.test_date) { toast('Test date is required', 'error'); return; }
    api('POST', '/api/health/labs', data).then(function() {
      toast('Lab panel saved');
      closeModal();
      renderLabs(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  function deleteLab(id) {
    if (!confirm('Delete this lab panel and all its markers?')) return;
    api('DELETE', '/api/health/labs/' + id).then(function() {
      toast('Lab panel deleted');
      renderLabs(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }


  // ══════════════════════════════════════════════════════════
  // SYMPTOMS VIEW
  // ══════════════════════════════════════════════════════════

  function renderSymptoms(main) {
    var m = state.selectedMember;
    main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Symptoms</h1><button class="btn btn-primary" onclick="App.showSymptomModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log Symptom</button></div><div class="loading-center"><div class="spinner"></div></div>';

    api('GET', '/api/health/symptoms?memberId=' + m.id).then(function(symptoms) {
      var bodySystems = state.references ? state.references.bodySystems : [];

      if (!symptoms.length) {
        main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Symptoms</h1><button class="btn btn-primary" onclick="App.showSymptomModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log Symptom</button></div>' +
          '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">No Symptoms Logged</div><div class="empty-state-text">Track symptoms to identify patterns and triggers.</div><button class="btn btn-primary" onclick="App.showSymptomModal()">Log Symptom</button></div>';
        return;
      }

      var filterOpts = '<option value="">All Body Systems</option>';
      bodySystems.forEach(function(bs) { filterOpts += '<option value="' + esc(bs) + '">' + esc(bs) + '</option>'; });

      var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;"><h1 class="page-title" style="margin:0;">Symptoms</h1><div style="display:flex;gap:8px;"><select class="form-input" style="width:200px;padding:8px 12px;" id="symptomFilter" onchange="App.filterSymptoms()">' + filterOpts + '</select><button class="btn btn-primary" onclick="App.showSymptomModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log Symptom</button></div></div>';

      html += '<div class="card" style="padding:0;overflow:hidden;" id="symptomsList">';
      symptoms.forEach(function(s) {
        var pct = (s.severity / 10) * 100;
        html += '<div class="list-item symptom-item" data-system="' + esc(s.body_system || '') + '" style="cursor:default;">';
        html += '<div style="flex:1;">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-weight:600;color:#f1f5f9;">' + esc(s.symptom) + '</span>';
        if (s.body_system) html += '<span class="badge badge-blue">' + esc(s.body_system) + '</span>';
        html += '</div>';
        html += '<div style="display:flex;align-items:center;gap:12px;font-size:13px;color:#94a3b8;">';
        html += '<span>' + formatDate(s.logged_date) + '</span>';
        html += '<span>Severity: ' + s.severity + '/10</span>';
        html += '<span class="severity-bar"><span class="severity-fill" style="width:' + pct + '%;background:' + severityColor(s.severity) + ';"></span></span>';
        html += '</div>';
        if (s.notes) html += '<div style="font-size:12px;color:#64748b;margin-top:4px;">' + esc(s.notes) + '</div>';
        html += '</div>';
        html += '<button class="btn-icon" onclick="App.deleteSymptom(\'' + s.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        html += '</div>';
      });
      html += '</div>';

      main.innerHTML = html;
    }).catch(function(err) {
      main.innerHTML = '<h1 class="page-title">Symptoms</h1><div class="card"><p style="color:#ef4444;">Failed to load: ' + esc(String(err)) + '</p></div>';
    });
  }

  function filterSymptoms() {
    var filter = document.getElementById('symptomFilter').value;
    document.querySelectorAll('.symptom-item').forEach(function(el) {
      if (!filter || el.getAttribute('data-system') === filter) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }

  function showSymptomModal() {
    var bodySystems = state.references ? state.references.bodySystems : [];
    var bsOpts = '<option value="">Select body system</option>';
    bodySystems.forEach(function(bs) { bsOpts += '<option value="' + esc(bs) + '">' + esc(bs) + '</option>'; });

    var html =
      '<div class="modal-header"><h2 class="modal-title">Log Symptom</h2><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Date</label><input class="form-input" id="sym-date" type="date" value="' + new Date().toISOString().split('T')[0] + '" /></div>' +
          '<div class="form-group"><label class="form-label">Body System</label><select class="form-input" id="sym-system">' + bsOpts + '</select></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Symptom *</label><input class="form-input" id="sym-name" placeholder="e.g. Headache, Fatigue, Brain Fog" /></div>' +
        '<div class="form-group"><label class="form-label">Severity: <span id="sym-sev-val">5</span>/10</label><input type="range" min="1" max="10" value="5" id="sym-severity" style="width:100%;accent-color:#10b981;" oninput="document.getElementById(\'sym-sev-val\').textContent=this.value" /></div>' +
        '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="sym-notes" rows="3" placeholder="Any context, triggers, or details..."></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="App.saveSymptom()">Save Symptom</button>' +
      '</div>';
    showModal(html);
  }

  function saveSymptom() {
    var data = {
      family_member_id: state.selectedMember.id,
      logged_date: document.getElementById('sym-date').value,
      symptom: document.getElementById('sym-name').value.trim(),
      severity: parseInt(document.getElementById('sym-severity').value),
      body_system: document.getElementById('sym-system').value,
      notes: document.getElementById('sym-notes').value.trim()
    };
    if (!data.symptom) { toast('Symptom name is required', 'error'); return; }
    api('POST', '/api/health/symptoms', data).then(function() {
      toast('Symptom logged');
      closeModal();
      renderSymptoms(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  function deleteSymptom(id) {
    if (!confirm('Delete this symptom entry?')) return;
    api('DELETE', '/api/health/symptoms/' + id).then(function() {
      toast('Symptom deleted');
      renderSymptoms(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  // ══════════════════════════════════════════════════════════
  // PROTOCOLS VIEW
  // ══════════════════════════════════════════════════════════

  function renderProtocols(main) {
    var m = state.selectedMember;
    main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Protocols</h1><button class="btn btn-primary" onclick="App.showProtocolModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Protocol</button></div><div class="loading-center"><div class="spinner"></div></div>';

    api('GET', '/api/health/protocols?memberId=' + m.id).then(function(protocols) {
      if (!protocols.length) {
        main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Protocols</h1><button class="btn btn-primary" onclick="App.showProtocolModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Protocol</button></div>' +
          '<div class="empty-state"><div class="empty-state-icon">💊</div><div class="empty-state-title">No Protocols Yet</div><div class="empty-state-text">Add supplements, treatments, and lifestyle protocols to track.</div><button class="btn btn-primary" onclick="App.showProtocolModal()">Add Protocol</button></div>';
        return;
      }

      var grouped = { active: [], paused: [], completed: [], discontinued: [] };
      protocols.forEach(function(p) { (grouped[p.status] || grouped.active).push(p); });

      var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Protocols</h1><button class="btn btn-primary" onclick="App.showProtocolModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Protocol</button></div>';

      ['active', 'paused', 'completed', 'discontinued'].forEach(function(status) {
        var list = grouped[status];
        if (!list.length) return;
        html += '<h3 style="font-size:14px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin:24px 0 12px;">' + status + ' (' + list.length + ')</h3>';
        html += '<div class="card" style="padding:0;overflow:hidden;">';
        list.forEach(function(p) {
          html += '<div class="list-item" style="cursor:default;flex-wrap:wrap;">';
          html += '<div style="flex:1;min-width:200px;">';
          html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
          html += '<span style="font-weight:600;color:#f1f5f9;">' + esc(p.name) + '</span>';
          html += categoryBadge(p.category);
          html += protocolStatusBadge(p.status);
          html += '</div>';
          if (p.dosage || p.frequency) html += '<div style="font-size:13px;color:#94a3b8;">' + (p.dosage ? esc(p.dosage) : '') + (p.dosage && p.frequency ? ' | ' : '') + (p.frequency ? esc(p.frequency) : '') + '</div>';
          if (p.start_date) html += '<div style="font-size:12px;color:#64748b;margin-top:2px;">Started: ' + formatDate(p.start_date) + '</div>';
          if (p.notes) html += '<div style="font-size:12px;color:#64748b;margin-top:2px;">' + esc(p.notes) + '</div>';
          html += '</div>';
          html += '<div style="display:flex;gap:4px;flex-wrap:wrap;">';
          if (p.status !== 'active') html += '<button class="btn btn-sm btn-secondary" onclick="App.updateProtocolStatus(\'' + p.id + '\',\'active\')">Activate</button>';
          if (p.status !== 'paused') html += '<button class="btn btn-sm btn-secondary" onclick="App.updateProtocolStatus(\'' + p.id + '\',\'paused\')">Pause</button>';
          if (p.status !== 'completed') html += '<button class="btn btn-sm btn-secondary" onclick="App.updateProtocolStatus(\'' + p.id + '\',\'completed\')">Complete</button>';
          if (p.status !== 'discontinued') html += '<button class="btn btn-sm btn-secondary" onclick="App.updateProtocolStatus(\'' + p.id + '\',\'discontinued\')">Discontinue</button>';
          html += '<button class="btn-icon" onclick="App.deleteProtocol(\'' + p.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
          html += '</div></div>';
        });
        html += '</div>';
      });

      main.innerHTML = html;
    }).catch(function(err) {
      main.innerHTML = '<h1 class="page-title">Protocols</h1><div class="card"><p style="color:#ef4444;">Failed to load: ' + esc(String(err)) + '</p></div>';
    });
  }

  function showProtocolModal() {
    var cats = state.references ? state.references.protocolCategories : [];
    var catOpts = '<option value="">Select category</option>';
    cats.forEach(function(c) { catOpts += '<option value="' + esc(c) + '">' + esc(c) + '</option>'; });

    var html =
      '<div class="modal-header"><h2 class="modal-title">Add Protocol</h2><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">Protocol Name *</label><input class="form-input" id="proto-name" placeholder="e.g. Vitamin D3 + K2" /></div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Category</label><select class="form-input" id="proto-cat">' + catOpts + '</select></div>' +
          '<div class="form-group"><label class="form-label">Status</label><select class="form-input" id="proto-status"><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="discontinued">Discontinued</option></select></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Description</label><textarea class="form-input" id="proto-desc" rows="2"></textarea></div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Dosage</label><input class="form-input" id="proto-dosage" placeholder="e.g. 5000 IU" /></div>' +
          '<div class="form-group"><label class="form-label">Frequency</label><input class="form-input" id="proto-freq" placeholder="e.g. Daily with meals" /></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Start Date</label><input class="form-input" id="proto-start" type="date" value="' + new Date().toISOString().split('T')[0] + '" /></div>' +
        '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="proto-notes" rows="2"></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="App.saveProtocol()">Save Protocol</button>' +
      '</div>';
    showModal(html);
  }

  function saveProtocol() {
    var data = {
      family_member_id: state.selectedMember.id,
      name: document.getElementById('proto-name').value.trim(),
      category: document.getElementById('proto-cat').value,
      status: document.getElementById('proto-status').value,
      description: document.getElementById('proto-desc').value.trim(),
      dosage: document.getElementById('proto-dosage').value.trim(),
      frequency: document.getElementById('proto-freq').value.trim(),
      start_date: document.getElementById('proto-start').value || undefined,
      notes: document.getElementById('proto-notes').value.trim()
    };
    if (!data.name) { toast('Protocol name is required', 'error'); return; }
    api('POST', '/api/health/protocols', data).then(function() {
      toast('Protocol created');
      closeModal();
      renderProtocols(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  function updateProtocolStatus(id, newStatus) {
    api('PUT', '/api/health/protocols/' + id, { status: newStatus }).then(function() {
      toast('Protocol ' + newStatus);
      renderProtocols(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  function deleteProtocol(id) {
    if (!confirm('Delete this protocol?')) return;
    api('DELETE', '/api/health/protocols/' + id).then(function() {
      toast('Protocol deleted');
      renderProtocols(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }


  // ══════════════════════════════════════════════════════════
  // DIET LOG VIEW
  // ══════════════════════════════════════════════════════════

  function renderDiet(main) {
    var m = state.selectedMember;
    main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Diet Log</h1><button class="btn btn-primary" onclick="App.showDietModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log Meal</button></div><div class="loading-center"><div class="spinner"></div></div>';

    api('GET', '/api/health/diet?memberId=' + m.id).then(function(entries) {
      if (!entries.length) {
        main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Diet Log</h1><button class="btn btn-primary" onclick="App.showDietModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log Meal</button></div>' +
          '<div class="empty-state"><div class="empty-state-icon">🥗</div><div class="empty-state-title">No Diet Entries Yet</div><div class="empty-state-text">Track your meals to identify food sensitivities and reactions.</div><button class="btn btn-primary" onclick="App.showDietModal()">Log Meal</button></div>';
        return;
      }

      var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Diet Log</h1><button class="btn btn-primary" onclick="App.showDietModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Log Meal</button></div>';
      html += '<div class="card" style="padding:0;overflow:hidden;">';

      entries.forEach(function(d) {
        html += '<div class="list-item" style="cursor:default;flex-wrap:wrap;">';
        html += '<div style="flex:1;min-width:200px;">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
        html += '<span style="font-weight:600;color:#f1f5f9;text-transform:capitalize;">' + esc(d.meal_type || 'Meal') + '</span>';
        html += '<span style="font-size:12px;color:#64748b;">' + formatDate(d.logged_date) + '</span>';
        if (d.energy_level) html += '<span style="font-size:16px;" title="Energy: ' + d.energy_level + '/10">' + energyEmoji(d.energy_level) + '</span>';
        html += '</div>';
        html += '<div style="font-size:13px;color:#cbd5e1;margin-bottom:6px;">' + esc(d.description) + '</div>';
        if (d.tags && d.tags.length) {
          html += '<div style="margin-bottom:4px;">';
          d.tags.forEach(function(t) {
            html += '<span class="tag" style="font-size:11px;">' + esc(t) + '</span>';
          });
          html += '</div>';
        }
        if (d.reactions) html += '<div style="font-size:12px;color:#f59e0b;"><strong>Reactions:</strong> ' + esc(d.reactions) + '</div>';
        if (d.notes) html += '<div style="font-size:12px;color:#64748b;margin-top:2px;">' + esc(d.notes) + '</div>';
        html += '</div>';
        html += '<button class="btn-icon" onclick="App.deleteDiet(\'' + d.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        html += '</div>';
      });
      html += '</div>';

      main.innerHTML = html;
    }).catch(function(err) {
      main.innerHTML = '<h1 class="page-title">Diet Log</h1><div class="card"><p style="color:#ef4444;">Failed to load: ' + esc(String(err)) + '</p></div>';
    });
  }

  function showDietModal() {
    var mealTypes = state.references ? state.references.mealTypes : ['breakfast','lunch','dinner','snack','beverage'];
    var dietTags = state.references ? state.references.dietTags : [];

    var mealOpts = '';
    mealTypes.forEach(function(mt) { mealOpts += '<option value="' + esc(mt) + '">' + esc(mt.charAt(0).toUpperCase() + mt.slice(1)) + '</option>'; });

    var tagsHtml = '<div style="display:flex;flex-wrap:wrap;gap:6px;" id="diet-tags-container">';
    dietTags.forEach(function(tag) {
      tagsHtml += '<label style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#cbd5e1;cursor:pointer;background:#0f172a;padding:4px 8px;border-radius:6px;border:1px solid #334155;"><input type="checkbox" class="diet-tag-cb" value="' + esc(tag) + '" style="accent-color:#10b981;" />' + esc(tag) + '</label>';
    });
    tagsHtml += '</div>';

    var html =
      '<div class="modal-header"><h2 class="modal-title">Log Meal</h2><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Date</label><input class="form-input" id="diet-date" type="date" value="' + new Date().toISOString().split('T')[0] + '" /></div>' +
          '<div class="form-group"><label class="form-label">Meal Type</label><select class="form-input" id="diet-meal">' + mealOpts + '</select></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Description *</label><textarea class="form-input" id="diet-desc" rows="3" placeholder="What did you eat?"></textarea></div>' +
        '<div class="form-group"><label class="form-label">Tags</label>' + tagsHtml + '</div>' +
        '<div class="form-group"><label class="form-label">Reactions</label><input class="form-input" id="diet-reactions" placeholder="Any reactions? e.g. bloating, headache" /></div>' +
        '<div class="form-group"><label class="form-label">Energy Level: <span id="diet-energy-val">5</span>/10</label><input type="range" min="1" max="10" value="5" id="diet-energy" style="width:100%;accent-color:#10b981;" oninput="document.getElementById(\'diet-energy-val\').textContent=this.value" /></div>' +
        '<div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="diet-notes" rows="2"></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="App.saveDiet()">Save Entry</button>' +
      '</div>';
    showModal(html);
  }

  function saveDiet() {
    var selectedTags = [];
    document.querySelectorAll('.diet-tag-cb:checked').forEach(function(cb) { selectedTags.push(cb.value); });
    var data = {
      family_member_id: state.selectedMember.id,
      logged_date: document.getElementById('diet-date').value,
      meal_type: document.getElementById('diet-meal').value,
      description: document.getElementById('diet-desc').value.trim(),
      tags: selectedTags,
      reactions: document.getElementById('diet-reactions').value.trim(),
      energy_level: parseInt(document.getElementById('diet-energy').value),
      notes: document.getElementById('diet-notes').value.trim()
    };
    if (!data.description) { toast('Description is required', 'error'); return; }
    api('POST', '/api/health/diet', data).then(function() {
      toast('Diet entry logged');
      closeModal();
      renderDiet(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  function deleteDiet(id) {
    if (!confirm('Delete this diet entry?')) return;
    api('DELETE', '/api/health/diet/' + id).then(function() {
      toast('Diet entry deleted');
      renderDiet(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  // ══════════════════════════════════════════════════════════
  // TRENDS VIEW (Charts)
  // ══════════════════════════════════════════════════════════

  function renderTrends(main) {
    var m = state.selectedMember;
    var refs = state.references ? state.references.markers : {};
    var markerNames = Object.keys(refs);
    var markerOpts = '<option value="">Select a marker...</option>';
    markerNames.forEach(function(name) { markerOpts += '<option value="' + esc(name) + '">' + esc(name) + ' (' + esc(refs[name].category) + ')</option>'; });

    var html = '<h1 class="page-title">Trends</h1>';

    // Lab marker trends
    html += '<div class="card"><div class="card-header"><span class="card-title">Lab Marker Trends</span></div>';
    html += '<div class="form-group"><select class="form-input" id="trendMarkerSelect" onchange="App.loadMarkerTrend()" style="max-width:400px;">' + markerOpts + '</select></div>';
    html += '<div class="chart-container"><canvas id="markerTrendChart"></canvas></div>';
    html += '<div id="markerTrendEmpty" style="display:none;text-align:center;padding:20px;color:#64748b;">Select a marker and ensure lab data exists to view trends.</div>';
    html += '</div>';

    // Symptom trends
    html += '<div class="card"><div class="card-header"><span class="card-title">Symptom Severity Over Time</span></div>';
    html += '<div class="chart-container"><canvas id="symptomTrendChart"></canvas></div>';
    html += '</div>';

    // Energy trends
    html += '<div class="card"><div class="card-header"><span class="card-title">Energy Levels Over Time</span></div>';
    html += '<div class="chart-container"><canvas id="energyTrendChart"></canvas></div>';
    html += '</div>';

    main.innerHTML = html;

    // Load symptom and energy data
    loadSymptomTrend();
    loadEnergyTrend();
  }

  function loadMarkerTrend() {
    var marker = document.getElementById('trendMarkerSelect').value;
    var emptyEl = document.getElementById('markerTrendEmpty');
    if (!marker) {
      if (state.charts.markerTrend) { state.charts.markerTrend.destroy(); state.charts.markerTrend = null; }
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    api('GET', '/api/health/markers/trends?memberId=' + state.selectedMember.id + '&marker=' + encodeURIComponent(marker)).then(function(data) {
      if (state.charts.markerTrend) state.charts.markerTrend.destroy();
      if (!data.length) { emptyEl.style.display = 'block'; emptyEl.textContent = 'No data found for ' + marker; return; }

      var labels = data.map(function(d) { return formatDate(d.test_date); });
      var values = data.map(function(d) { return d.value; });
      var optLow = data[0].optimal_low;
      var optHigh = data[0].optimal_high;

      var datasets = [{
        label: marker,
        data: values,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: '#10b981',
        fill: false
      }];

      if (optLow != null && optHigh != null) {
        datasets.push({
          label: 'Optimal Low',
          data: labels.map(function() { return optLow; }),
          borderColor: 'rgba(16,185,129,0.3)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        });
        datasets.push({
          label: 'Optimal High',
          data: labels.map(function() { return optHigh; }),
          borderColor: 'rgba(16,185,129,0.3)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: '-1',
          backgroundColor: 'rgba(16,185,129,0.08)'
        });
      }

      var ctx = document.getElementById('markerTrendChart').getContext('2d');
      state.charts.markerTrend = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
            y: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } }
          },
          plugins: { legend: { labels: { color: '#94a3b8' } } }
        }
      });
    }).catch(function() {
      emptyEl.style.display = 'block';
      emptyEl.textContent = 'Failed to load trend data';
    });
  }

  function loadSymptomTrend() {
    api('GET', '/api/health/symptoms?memberId=' + state.selectedMember.id).then(function(symptoms) {
      if (state.charts.symptomTrend) state.charts.symptomTrend.destroy();
      if (!symptoms.length) return;

      var sorted = symptoms.slice().sort(function(a, b) { return new Date(a.logged_date) - new Date(b.logged_date); });
      var labels = sorted.map(function(s) { return formatDate(s.logged_date) + ' - ' + s.symptom; });
      var values = sorted.map(function(s) { return s.severity; });
      var colors = sorted.map(function(s) { return severityColor(s.severity); });

      var ctx = document.getElementById('symptomTrendChart').getContext('2d');
      state.charts.symptomTrend = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{ label: 'Severity', data: values, backgroundColor: colors, borderRadius: 4 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#64748b', maxRotation: 45 }, grid: { display: false } },
            y: { min: 0, max: 10, ticks: { color: '#64748b', stepSize: 2 }, grid: { color: '#1e293b' } }
          },
          plugins: { legend: { display: false } }
        }
      });
    });
  }

  function loadEnergyTrend() {
    api('GET', '/api/health/diet?memberId=' + state.selectedMember.id).then(function(entries) {
      if (state.charts.energyTrend) state.charts.energyTrend.destroy();
      var withEnergy = entries.filter(function(e) { return e.energy_level; });
      if (!withEnergy.length) return;

      var sorted = withEnergy.slice().sort(function(a, b) { return new Date(a.logged_date) - new Date(b.logged_date); });
      var labels = sorted.map(function(e) { return formatDate(e.logged_date); });
      var values = sorted.map(function(e) { return e.energy_level; });

      var ctx = document.getElementById('energyTrendChart').getContext('2d');
      state.charts.energyTrend = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Energy Level',
            data: values,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.1)',
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6',
            fill: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
            y: { min: 0, max: 10, ticks: { color: '#64748b', stepSize: 2 }, grid: { color: '#1e293b' } }
          },
          plugins: { legend: { labels: { color: '#94a3b8' } } }
        }
      });
    });
  }


  // ══════════════════════════════════════════════════════════
  // AI WELLNESS CHAT VIEW
  // ══════════════════════════════════════════════════════════

  var chatState = {
    conversations: [],
    activeConversation: null,
    messages: [],
    streaming: false
  };

  function renderChat(main) {
    var m = state.selectedMember;
    main.innerHTML =
      '<h1 class="page-title">AI Wellness Chat</h1>' +
      '<div class="chat-layout" style="border:1px solid #334155;border-radius:12px;overflow:hidden;">' +
        '<div class="chat-sidebar">' +
          '<div class="chat-sidebar-header">' +
            '<button class="btn btn-primary" style="width:100%;" onclick="App.newConversation()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> New Conversation</button>' +
          '</div>' +
          '<div class="chat-list" id="chatList"><div class="loading-center"><div class="spinner" style="width:24px;height:24px;margin:20px auto;"></div></div></div>' +
        '</div>' +
        '<div class="chat-main">' +
          '<div class="chat-messages" id="chatMessages">' +
            '<div class="empty-state" style="padding:40px;"><div class="empty-state-icon">💬</div><div class="empty-state-title">Start a Conversation</div><div class="empty-state-text">Ask questions about ' + esc(m.name) + '\'s health, get supplement recommendations, or discuss lab results.</div></div>' +
          '</div>' +
          '<div class="chat-input-area">' +
            '<textarea class="chat-input" id="chatInput" rows="1" placeholder="Ask a wellness question..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();App.sendMessage();}"></textarea>' +
            '<button class="chat-send" id="chatSend" onclick="App.sendMessage()">Send</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    loadConversations();
  }

  function loadConversations() {
    var m = state.selectedMember;
    api('GET', '/api/health/chat/conversations?memberId=' + m.id).then(function(convos) {
      chatState.conversations = convos;
      renderConversationList();
    }).catch(function() {
      document.getElementById('chatList').innerHTML = '<div style="padding:16px;color:#64748b;font-size:13px;">Failed to load conversations.</div>';
    });
  }

  function renderConversationList() {
    var list = document.getElementById('chatList');
    if (!chatState.conversations.length) {
      list.innerHTML = '<div style="padding:16px;color:#64748b;font-size:13px;text-align:center;">No conversations yet.<br>Start a new one!</div>';
      return;
    }
    list.innerHTML = chatState.conversations.map(function(c) {
      var isActive = chatState.activeConversation && chatState.activeConversation.id === c.id;
      return '<div class="chat-list-item' + (isActive ? ' active' : '') + '" onclick="App.openConversation(\'' + c.id + '\')">' +
        '<div class="chat-list-title">' + esc(c.title || 'New Conversation') + '</div>' +
        '<div class="chat-list-meta">' + (c.message_count || 0) + ' messages &middot; ' + formatDate(c.updated_at) + '</div>' +
        '<button class="btn-icon btn-sm" style="position:absolute;right:8px;top:8px;display:none;" onclick="event.stopPropagation();App.deleteConversation(\'' + c.id + '\')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>';
    }).join('');
  }

  function newConversation() {
    var m = state.selectedMember;
    api('POST', '/api/health/chat/conversations', { family_member_id: m.id }).then(function(convo) {
      chatState.conversations.unshift(convo);
      openConversation(convo.id);
      renderConversationList();
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  function openConversation(id) {
    var convo = chatState.conversations.find(function(c) { return c.id === id; });
    if (!convo) return;
    chatState.activeConversation = convo;
    renderConversationList();

    var msgArea = document.getElementById('chatMessages');
    msgArea.innerHTML = '<div class="loading-center"><div class="spinner" style="width:24px;height:24px;"></div></div>';

    api('GET', '/api/health/chat/conversations/' + id + '/messages').then(function(messages) {
      chatState.messages = messages;
      renderMessages();
    }).catch(function() {
      msgArea.innerHTML = '<div style="padding:20px;color:#ef4444;">Failed to load messages.</div>';
    });
  }

  function renderMessages() {
    var msgArea = document.getElementById('chatMessages');
    if (!chatState.messages.length) {
      msgArea.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="empty-state-title">Empty Conversation</div><div class="empty-state-text">Send a message to get started.</div></div>';
      return;
    }
    msgArea.innerHTML = chatState.messages.map(function(msg) {
      var role = msg.role || 'assistant';
      return '<div class="chat-msg ' + role + '"><div class="chat-bubble">' + formatChatContent(msg.content || '') + '</div></div>';
    }).join('');
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function formatChatContent(text) {
    // Simple markdown-like formatting
    var s = esc(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/^### (.+)$/gm, '<h4 style="margin:8px 0 4px;font-size:14px;color:#f1f5f9;">$1</h4>');
    s = s.replace(/^## (.+)$/gm, '<h3 style="margin:8px 0 4px;font-size:15px;color:#f1f5f9;">$1</h3>');
    s = s.replace(/^# (.+)$/gm, '<h2 style="margin:8px 0 4px;font-size:16px;color:#f1f5f9;">$1</h2>');
    s = s.replace(/^- (.+)$/gm, '<div style="padding-left:16px;">&#8226; $1</div>');
    s = s.replace(/^\d+\. (.+)$/gm, function(match, p1, offset) { return '<div style="padding-left:16px;">' + match.split('.')[0] + '. ' + p1 + '</div>'; });
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  function sendMessage() {
    if (chatState.streaming) return;
    var input = document.getElementById('chatInput');
    var message = input.value.trim();
    if (!message) return;
    if (!chatState.activeConversation) {
      newConversation();
      setTimeout(function() { sendMessage(); }, 500);
      return;
    }

    input.value = '';
    chatState.streaming = true;
    document.getElementById('chatSend').disabled = true;

    // Add user message to UI
    chatState.messages.push({ role: 'user', content: message });
    renderMessages();

    // Add typing indicator
    var msgArea = document.getElementById('chatMessages');
    var typingEl = document.createElement('div');
    typingEl.className = 'chat-msg assistant';
    typingEl.id = 'typingIndicator';
    typingEl.innerHTML = '<div class="chat-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>';
    msgArea.appendChild(typingEl);
    msgArea.scrollTop = msgArea.scrollHeight;

    // Stream response via SSE
    var body = JSON.stringify({
      message: message,
      family_member_id: state.selectedMember.id,
      conversation_id: chatState.activeConversation.id
    });

    fetch('/api/health/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body
    }).then(function(response) {
      if (response.status === 401) { window.location.href = '/auth/login'; return; }
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var assistantMsg = { role: 'assistant', content: '' };
      chatState.messages.push(assistantMsg);

      function read() {
        reader.read().then(function(result) {
          if (result.done) {
            finishStreaming();
            return;
          }
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();
          lines.forEach(function(line) {
            if (line.startsWith('data: ')) {
              try {
                var event = JSON.parse(line.slice(6));
                if (event.type === 'text' || event.type === 'content_block_delta') {
                  assistantMsg.content += (event.content || event.text || '');
                  updateStreamingMessage(assistantMsg.content);
                } else if (event.type === 'done' || event.type === 'message_stop') {
                  if (event.conversation_id) {
                    chatState.activeConversation.id = event.conversation_id;
                  }
                } else if (event.type === 'error') {
                  assistantMsg.content += '\n\n[Error: ' + (event.content || 'Stream interrupted') + ']';
                  updateStreamingMessage(assistantMsg.content);
                }
              } catch(e) {}
            }
          });
          read();
        }).catch(function() { finishStreaming(); });
      }
      read();
    }).catch(function(err) {
      var typing = document.getElementById('typingIndicator');
      if (typing) typing.remove();
      chatState.streaming = false;
      document.getElementById('chatSend').disabled = false;
      toast('Failed to send message', 'error');
    });
  }

  function updateStreamingMessage(content) {
    var typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();

    var msgArea = document.getElementById('chatMessages');
    var lastMsg = msgArea.querySelector('.chat-msg.assistant:last-child');
    if (!lastMsg || lastMsg.id === 'typingIndicator') {
      var div = document.createElement('div');
      div.className = 'chat-msg assistant';
      div.innerHTML = '<div class="chat-bubble">' + formatChatContent(content) + '</div>';
      msgArea.appendChild(div);
    } else {
      lastMsg.querySelector('.chat-bubble').innerHTML = formatChatContent(content);
    }
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function finishStreaming() {
    var typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
    chatState.streaming = false;
    document.getElementById('chatSend').disabled = false;
    // Refresh conversation list to update message counts
    loadConversations();
  }

  function deleteConversation(id) {
    if (!confirm('Delete this conversation?')) return;
    api('DELETE', '/api/health/chat/conversations/' + id).then(function() {
      toast('Conversation deleted');
      if (chatState.activeConversation && chatState.activeConversation.id === id) {
        chatState.activeConversation = null;
        chatState.messages = [];
        var msgArea = document.getElementById('chatMessages');
        if (msgArea) msgArea.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="empty-state-title">Start a Conversation</div><div class="empty-state-text">Select or create a conversation.</div></div>';
      }
      loadConversations();
    }).catch(function(err) { toast(String(err), 'error'); });
  }


  // ══════════════════════════════════════════════════════════
  // KNOWLEDGE BASE VIEW
  // ══════════════════════════════════════════════════════════

  function renderKnowledge(main) {
    main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Knowledge Base</h1><button class="btn btn-primary" onclick="App.showKnowledgeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Upload Knowledge</button></div><div class="loading-center"><div class="spinner"></div></div>';

    api('GET', '/api/health/knowledge').then(function(docs) {
      if (!docs.length) {
        main.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Knowledge Base</h1><button class="btn btn-primary" onclick="App.showKnowledgeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Upload Knowledge</button></div>' +
          '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-title">No Knowledge Documents</div><div class="empty-state-text">Upload reference materials, protocols, and research to enhance AI chat responses.</div><button class="btn btn-primary" onclick="App.showKnowledgeModal()">Upload Knowledge</button></div>';
        return;
      }

      var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;"><h1 class="page-title" style="margin:0;">Knowledge Base</h1><button class="btn btn-primary" onclick="App.showKnowledgeModal()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Upload Knowledge</button></div>';

      docs.forEach(function(doc) {
        var typeColors = { reference: 'badge-blue', book: 'badge-purple', guide: 'badge-green', protocol: 'badge-yellow', research: 'badge-red' };
        html += '<div class="knowledge-item">';
        html += '<div class="knowledge-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>';
        html += '<div style="flex:1;">';
        html += '<div style="display:flex;align-items:center;gap:8px;">';
        html += '<span class="knowledge-title">' + esc(doc.title) + '</span>';
        html += '<span class="badge ' + (typeColors[doc.doc_type] || 'badge-gray') + '">' + esc(doc.doc_type || 'reference') + '</span>';
        if (doc.category) html += '<span class="badge badge-gray">' + esc(doc.category) + '</span>';
        html += '</div>';
        html += '<div class="knowledge-meta">' + formatDate(doc.created_at) + (doc.filename ? ' &middot; ' + esc(doc.filename) : '') + '</div>';
        if (doc.content_preview) html += '<div class="knowledge-preview">' + esc(doc.content_preview.slice(0, 200)) + (doc.content_preview.length > 200 ? '...' : '') + '</div>';
        html += '</div>';
        html += '<button class="btn-icon" onclick="App.deleteKnowledge(\'' + doc.id + '\')" title="Delete"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
        html += '</div>';
      });

      main.innerHTML = html;
    }).catch(function(err) {
      main.innerHTML = '<h1 class="page-title">Knowledge Base</h1><div class="card"><p style="color:#ef4444;">Failed to load: ' + esc(String(err)) + '</p></div>';
    });
  }

  function showKnowledgeModal() {
    var html =
      '<div class="modal-header"><h2 class="modal-title">Upload Knowledge</h2><button class="modal-close" onclick="App.closeModal()">&times;</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label class="form-label">Title *</label><input class="form-input" id="kb-title" placeholder="e.g. Hashimotos Protocol Guide" /></div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label class="form-label">Type</label><select class="form-input" id="kb-type"><option value="reference">Reference</option><option value="book">Book</option><option value="guide">Guide</option><option value="protocol">Protocol</option><option value="research">Research</option></select></div>' +
          '<div class="form-group"><label class="form-label">Category</label><input class="form-input" id="kb-category" placeholder="e.g. Thyroid, Gut Health" /></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Content *</label><textarea class="form-input" id="kb-content" rows="12" placeholder="Paste the content here..."></textarea></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>' +
        '<button class="btn btn-primary" onclick="App.saveKnowledge()">Upload</button>' +
      '</div>';
    showModal(html);
  }

  function saveKnowledge() {
    var data = {
      title: document.getElementById('kb-title').value.trim(),
      doc_type: document.getElementById('kb-type').value,
      category: document.getElementById('kb-category').value.trim(),
      content: document.getElementById('kb-content').value.trim()
    };
    if (!data.title) { toast('Title is required', 'error'); return; }
    if (!data.content) { toast('Content is required', 'error'); return; }
    api('POST', '/api/health/knowledge', data).then(function() {
      toast('Knowledge uploaded');
      closeModal();
      renderKnowledge(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  function deleteKnowledge(id) {
    if (!confirm('Delete this knowledge document?')) return;
    api('DELETE', '/api/health/knowledge/' + id).then(function() {
      toast('Document deleted');
      renderKnowledge(document.getElementById('mainContent'));
    }).catch(function(err) { toast(String(err), 'error'); });
  }

  // ══════════════════════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════════════════════

  function init() {
    // Load references and family members in parallel
    Promise.all([loadReferences(), loadFamily()]).then(function() {
      // Check hash for initial navigation
      var hash = window.location.hash.replace('#', '') || 'dashboard';
      navigate(hash);
    }).catch(function(err) {
      console.error('Init error:', err);
      document.getElementById('mainContent').innerHTML = '<div class="card"><p style="color:#ef4444;">Failed to initialize. Please reload the page.</p></div>';
    });
  }

  // Handle hash changes
  window.addEventListener('hashchange', function() {
    var hash = window.location.hash.replace('#', '') || 'dashboard';
    if (hash !== state.currentView) navigate(hash);
  });

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ══════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════

  return {
    navigate: navigate,
    selectMember: selectMember,
    showAddMemberModal: showAddMemberModal,
    saveMember: saveMember,
    getSelectedMember: function() { return state.selectedMember; },
    closeModal: closeModal,
    showLabModal: showLabModal,
    addMarkerRow: addMarkerRow,
    markerAutocomplete: markerAutocomplete,
    selectMarkerRef: selectMarkerRef,
    saveLab: saveLab,
    deleteLab: deleteLab,
    showSymptomModal: showSymptomModal,
    saveSymptom: saveSymptom,
    deleteSymptom: deleteSymptom,
    filterSymptoms: filterSymptoms,
    showProtocolModal: showProtocolModal,
    saveProtocol: saveProtocol,
    updateProtocolStatus: updateProtocolStatus,
    deleteProtocol: deleteProtocol,
    showDietModal: showDietModal,
    saveDiet: saveDiet,
    deleteDiet: deleteDiet,
    loadMarkerTrend: loadMarkerTrend,
    sendMessage: sendMessage,
    newConversation: newConversation,
    openConversation: openConversation,
    deleteConversation: deleteConversation,
    showKnowledgeModal: showKnowledgeModal,
    saveKnowledge: saveKnowledge,
    deleteKnowledge: deleteKnowledge
  };
})();
</script>
</body>
</html>`;
}
