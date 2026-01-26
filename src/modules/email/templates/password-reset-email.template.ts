export interface PasswordResetEmailTemplateData {
  appName: string;
  otpCode: string;
  expiryMinutes: number;
  userName?: string;
}

export function generatePasswordResetEmailTemplate(
  data: PasswordResetEmailTemplateData,
): string {
  const { appName, otpCode, expiryMinutes, userName } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hi there';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - ${appName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .otp-code {
            background-color: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-number {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .button {
            display: inline-block;
            background-color: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${appName}</div>
            <h1>Password Reset Request</h1>
        </div>
        
        <p>${greeting},</p>
        
        <p>We received a request to reset your password. Use the verification code below to proceed with resetting your password:</p>
        
        <div class="otp-code">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Your verification code is:</div>
            <div class="otp-number">${otpCode}</div>
            <div style="font-size: 12px; color: #9ca3af; margin-top: 10px;">This code expires in ${expiryMinutes} minutes</div>
        </div>
        
        <div class="warning">
            <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </div>
        
        <p>For your security:</p>
        <ul>
            <li>Never share this code with anyone</li>
            <li>This code will expire in ${expiryMinutes} minutes</li>
            <li>You can only use this code once</li>
        </ul>
        
        <div class="footer">
            <p>This is an automated message from ${appName}. Please do not reply to this email.</p>
            <p>If you're having trouble, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

export function generatePasswordResetEmailPlainText(
  data: PasswordResetEmailTemplateData,
): string {
  const { appName, otpCode, expiryMinutes, userName } = data;
  const greeting = userName ? `Hi ${userName}` : 'Hi there';

  return `
${appName} - Password Reset Request

${greeting},

We received a request to reset your password. Use the verification code below to proceed with resetting your password:

Verification Code: ${otpCode}

This code expires in ${expiryMinutes} minutes.

SECURITY NOTICE: If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

For your security:
- Never share this code with anyone
- This code will expire in ${expiryMinutes} minutes  
- You can only use this code once

This is an automated message from ${appName}. Please do not reply to this email.
If you're having trouble, please contact our support team.
  `.trim();
}