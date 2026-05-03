/**
 * Password Change Confirmation Email Template
 */

export interface PasswordChangeEmailTemplateData {
  appName: string;
  userName?: string;
  supportEmail: string;
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

export function generatePasswordChangeEmailTemplate(
  data: PasswordChangeEmailTemplateData,
): string {
  const safeAppName = escapeHtml(data.appName);
  const safeUserName = data.userName ? escapeHtml(data.userName) : undefined;
  const greeting = safeUserName ? `Hello ${safeUserName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed - ${safeAppName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; font-size: 24px; font-weight: 700; color: #0891b2; }
    .greeting { font-size: 18px; color: #18181b; margin-bottom: 16px; }
    .message { color: #52525b; line-height: 1.6; margin-bottom: 16px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; color: #92400e; margin: 24px 0; }
    .footer { text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">${safeAppName}</div>
      <p class="greeting">${greeting}</p>
      <p class="message">Your password has been successfully changed.</p>
      <div class="warning">
        If you did not make this change, please contact us immediately at
        <a href="mailto:${escapeHtml(data.supportEmail)}">${escapeHtml(data.supportEmail)}</a>.
      </div>
      <p class="message">For security, we recommend:</p>
      <ul class="message">
        <li>Using a strong, unique password</li>
        <li>Enabling two-factor authentication when available</li>
        <li>Not sharing your credentials with anyone</li>
      </ul>
    </div>
    <p class="footer">&copy; ${new Date().getFullYear()} ${safeAppName}. All rights reserved.</p>
  </div>
</body>
</html>`;
}

export function generatePasswordChangeEmailPlainText(
  data: PasswordChangeEmailTemplateData,
): string {
  const name = data.userName || 'there';
  return `Password Changed

Hello ${name},

Your password has been successfully changed.

If you did not make this change, please contact us immediately at ${data.supportEmail}.

- ${data.appName} Team`;
}
