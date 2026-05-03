/**
 * Welcome Email Template
 * Sent to users after successful email verification
 */

export interface WelcomeEmailTemplateData {
  appName: string;
  userName?: string;
  loginUrl: string;
}

function escapeHtml(text: string): string {
  if (!text) return text;
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, c => map[c]);
}

export function generateWelcomeEmailTemplate(
  data: WelcomeEmailTemplateData,
): string {
  const safeAppName = escapeHtml(data.appName);
  const safeUserName = data.userName ? escapeHtml(data.userName) : undefined;
  const greeting = safeUserName
    ? `Hello ${safeUserName},`
    : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${safeAppName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; font-size: 24px; font-weight: 700; color: #0891b2; }
    .greeting { font-size: 18px; color: #18181b; margin-bottom: 16px; }
    .message { color: #52525b; line-height: 1.6; margin-bottom: 24px; }
    .cta { display: inline-block; background: #0891b2; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">${safeAppName}</div>
      <p class="greeting">${greeting}</p>
      <p class="message">
        Welcome to ${safeAppName}! Your email has been verified and your account is ready.
        Start building your professional CV, track job applications, and advance your career.
      </p>
      <p class="message">Here's what you can do:</p>
      <ul class="message">
        <li>Build stunning CVs with professional templates</li>
        <li>Import your LinkedIn profile instantly</li>
        <li>Track job applications with our kanban board</li>
        <li>Get AI-powered resume optimization</li>
      </ul>
      <p style="text-align: center; margin-top: 32px;">
        <a href="${escapeHtml(data.loginUrl)}" class="cta">Get Started</a>
      </p>
    </div>
    <p class="footer">&copy; ${new Date().getFullYear()} ${safeAppName}. All rights reserved.</p>
  </div>
</body>
</html>`;
}

export function generateWelcomeEmailPlainText(
  data: WelcomeEmailTemplateData,
): string {
  const name = data.userName || 'there';
  return `Welcome to ${data.appName}!

Hello ${name},

Your email has been verified and your account is ready. Start building your professional CV, track job applications, and advance your career.

Get started: ${data.loginUrl}

- ${data.appName} Team`;
}
