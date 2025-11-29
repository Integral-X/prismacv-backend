/**
 * OTP Email Template
 * Professional HTML email template for sending verification codes
 */

export interface OtpEmailTemplateData {
  appName: string;
  otpCode: string;
  expiryMinutes: number;
  userName?: string;
}

/**
 * Escapes HTML special characters to prevent XSS vulnerabilities
 * @param text - The text to escape
 * @returns The escaped text safe for HTML insertion
 */
function escapeHtml(text: string): string {
  if (!text) {
    return text;
  }
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}

export function generateOtpEmailTemplate(data: OtpEmailTemplateData): string {
  const { appName, otpCode, expiryMinutes, userName } = data;

  // Escape user-provided values to prevent XSS
  const safeAppName = escapeHtml(appName);
  const safeOtpCode = escapeHtml(otpCode);
  const safeUserName = userName ? escapeHtml(userName) : undefined;
  const greeting = safeUserName ? `Hello ${safeUserName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - ${safeAppName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
    }
    .message {
      font-size: 14px;
      color: #555;
      margin-bottom: 30px;
    }
    .otp-container {
      background-color: #f8f9fa;
      border: 2px dashed #4F46E5;
      border-radius: 8px;
      padding: 25px;
      text-align: center;
      margin: 25px 0;
    }
    .otp-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .otp-code {
      font-size: 36px;
      font-weight: bold;
      color: #4F46E5;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .expiry-notice {
      font-size: 13px;
      color: #888;
      margin-top: 15px;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin-top: 25px;
      font-size: 13px;
      color: #856404;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 25px 30px;
      text-align: center;
      font-size: 12px;
      color: #888;
    }
    .footer a {
      color: #4F46E5;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📧 Verify Your Email</h1>
    </div>
    <div class="content">
      <p class="greeting">${greeting}</p>
      <p class="message">
        Thank you for registering with ${safeAppName}! To complete your registration and verify your email address, please use the verification code below:
      </p>
      
      <div class="otp-container">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-code">${safeOtpCode}</div>
        <div class="expiry-notice">⏱️ This code expires in ${expiryMinutes} minutes</div>
      </div>
      
      <div class="warning">
        <strong>Security Tip:</strong> Never share this code with anyone. ${safeAppName} will never ask you for this code via phone or chat.
      </div>
    </div>
    <div class="footer">
      <p>This email was sent by ${safeAppName}.</p>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${safeAppName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateOtpEmailPlainText(data: OtpEmailTemplateData): string {
  const { appName, otpCode, expiryMinutes, userName } = data;
  const greeting = userName ? `Hello ${userName},` : 'Hello,';

  return `
${greeting}

Thank you for registering with ${appName}!

Your verification code is: ${otpCode}

This code expires in ${expiryMinutes} minutes.

Security Tip: Never share this code with anyone. ${appName} will never ask you for this code via phone or chat.

If you didn't create an account, you can safely ignore this email.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `.trim();
}
