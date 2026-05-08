export interface CvShareViewEmailTemplateData {
  appName: string;
  cvTitle: string;
  shareUrl: string;
  viewCount: number;
  viewerLocation?: string;
  userName?: string;
}

function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEscapeMap[char] ?? char);
}

export function generateCvShareViewEmailTemplate(
  data: CvShareViewEmailTemplateData,
): string {
  const greeting = data.userName
    ? `Hi ${escapeHtml(data.userName)}`
    : 'Hi there';
  const safeTitle = escapeHtml(data.cvTitle);
  const safeAppName = escapeHtml(data.appName);
  const safeShareUrl = escapeHtml(data.shareUrl);
  const safeViewerLocation = data.viewerLocation
    ? escapeHtml(data.viewerLocation)
    : 'an unknown location';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeAppName} CV share activity</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f5f7fb; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 24px;">
    <h2 style="margin-top: 0; color: #1f2937;">${greeting}, your shared CV was viewed.</h2>
    <p style="color: #4b5563;">
      Your CV titled <strong>${safeTitle}</strong> has received a new public view from ${safeViewerLocation}.
    </p>
    <p style="color: #4b5563;">
      Total views so far: <strong>${data.viewCount}</strong>
    </p>
    <p style="margin: 24px 0;">
      <a href="${safeShareUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">Open shared CV</a>
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      Sent by ${safeAppName}
    </p>
  </div>
</body>
</html>
  `.trim();
}

export function generateCvShareViewEmailPlainText(
  data: CvShareViewEmailTemplateData,
): string {
  const name = data.userName || 'there';
  const location = data.viewerLocation || 'an unknown location';
  return `Hi ${name},

Your shared CV "${data.cvTitle}" was viewed from ${location}.
Total views: ${data.viewCount}

Open it: ${data.shareUrl}

Sent by ${data.appName}`;
}
