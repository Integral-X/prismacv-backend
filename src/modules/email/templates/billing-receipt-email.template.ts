export interface BillingReceiptEmailTemplateData {
  appName: string;
  planName: string;
  amountDisplay: string;
  billingCycle: 'monthly' | 'yearly' | 'one_time';
  receiptDate: string;
  invoiceUrl?: string;
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

export function generateBillingReceiptEmailTemplate(
  data: BillingReceiptEmailTemplateData,
): string {
  const safeAppName = escapeHtml(data.appName);
  const safePlanName = escapeHtml(data.planName);
  const safeAmount = escapeHtml(data.amountDisplay);
  const safeDate = escapeHtml(data.receiptDate);
  const safeInvoiceUrl = data.invoiceUrl ? escapeHtml(data.invoiceUrl) : null;
  const greeting = data.userName
    ? `Hello ${escapeHtml(data.userName)},`
    : 'Hello,';
  const cycleLabel =
    data.billingCycle === 'one_time'
      ? 'one-time payment'
      : `${data.billingCycle} subscription`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeAppName} billing receipt</title>
</head>
<body style="font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 10px; padding: 24px;">
    <h2 style="margin-top: 0; color: #111827;">${greeting}</h2>
    <p style="color: #4b5563;">
      Thanks for your payment. Here is your ${safeAppName} receipt:
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Plan</td>
        <td style="padding: 8px 0; text-align: right; color: #111827;"><strong>${safePlanName}</strong></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Amount</td>
        <td style="padding: 8px 0; text-align: right; color: #111827;"><strong>${safeAmount}</strong></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Billing cycle</td>
        <td style="padding: 8px 0; text-align: right; color: #111827;">${escapeHtml(cycleLabel)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Paid on</td>
        <td style="padding: 8px 0; text-align: right; color: #111827;">${safeDate}</td>
      </tr>
    </table>
    ${
      safeInvoiceUrl
        ? `<p><a href="${safeInvoiceUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">View invoice</a></p>`
        : ''
    }
    <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
      Sent by ${safeAppName}
    </p>
  </div>
</body>
</html>
  `.trim();
}

export function generateBillingReceiptEmailPlainText(
  data: BillingReceiptEmailTemplateData,
): string {
  const name = data.userName || 'there';
  const cycleLabel =
    data.billingCycle === 'one_time'
      ? 'one-time payment'
      : `${data.billingCycle} subscription`;

  return `Hello ${name},

Thanks for your payment. Here is your ${data.appName} receipt:
- Plan: ${data.planName}
- Amount: ${data.amountDisplay}
- Billing cycle: ${cycleLabel}
- Paid on: ${data.receiptDate}

${data.invoiceUrl ? `Invoice: ${data.invoiceUrl}\n` : ''}Sent by ${data.appName}`;
}
