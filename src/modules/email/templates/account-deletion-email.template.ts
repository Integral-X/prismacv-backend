/**
 * Account Deletion Confirmation Email Template
 */

export interface AccountDeletionEmailTemplateData {
  appName: string;
  userName?: string;
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

export function generateAccountDeletionEmailTemplate(
  data: AccountDeletionEmailTemplateData,
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
  <title>Account Deleted - ${safeAppName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .logo { text-align: center; margin-bottom: 32px; font-size: 24px; font-weight: 700; color: #0891b2; }
    .greeting { font-size: 18px; color: #18181b; margin-bottom: 16px; }
    .message { color: #52525b; line-height: 1.6; margin-bottom: 16px; }
    .footer { text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">${safeAppName}</div>
      <p class="greeting">${greeting}</p>
      <p class="message">Your ${safeAppName} account has been permanently deleted as requested.</p>
      <p class="message">All your data, including CVs, job applications, and profile information, has been removed from our systems.</p>
      <p class="message">We're sorry to see you go. If you ever want to come back, you're always welcome to create a new account.</p>
    </div>
    <p class="footer">&copy; ${new Date().getFullYear()} ${safeAppName}. All rights reserved.</p>
  </div>
</body>
</html>`;
}

export function generateAccountDeletionEmailPlainText(
  data: AccountDeletionEmailTemplateData,
): string {
  const name = data.userName || 'there';
  return `Account Deleted

Hello ${name},

Your ${data.appName} account has been permanently deleted as requested.

All your data, including CVs, job applications, and profile information, has been removed from our systems.

We're sorry to see you go. If you ever want to come back, you're always welcome to create a new account.

- ${data.appName} Team`;
}
