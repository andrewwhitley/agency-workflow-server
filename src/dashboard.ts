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
      --bg: #f5f7fa;
      --surface: #ffffff;
      --border: #d1d5de;
      --text: #1a1f2e;
      --text-muted: #5a6478;
      --text-dim: #8892a4;
      --accent: #3964b2;
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
      background: linear-gradient(135deg, var(--accent), var(--secondary));
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
      --bg: #f5f7fa;
      --surface: #ffffff;
      --border: #d1d5de;
      --text: #1a1f2e;
      --text-muted: #5a6478;
      --text-dim: #8892a4;
      --red: #dc2626;
      --red-dim: #dc262622;
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
