import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '@/modules/email/email.service';

interface MailhogMessage {
  Content?: {
    Headers?: Record<string, string[]>;
    Body?: string;
  };
}

const MAILHOG_ENABLED = process.env.MAILHOG_E2E === 'true';
const describeIfMailhog = MAILHOG_ENABLED ? describe : describe.skip;

describeIfMailhog('Mailhog email smoke (e2e)', () => {
  let emailService: EmailService;

  const mailhogBaseUrl = process.env.MAILHOG_API_URL ?? 'http://localhost:8025';

  async function clearInbox(): Promise<void> {
    await fetch(`${mailhogBaseUrl}/api/v1/messages`, {
      method: 'DELETE',
    }).catch(() => undefined);
  }

  async function waitForMessages(
    expectedCount: number,
  ): Promise<MailhogMessage[]> {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(`${mailhogBaseUrl}/api/v2/messages`);
      if (response.ok) {
        const payload = (await response.json()) as { items?: MailhogMessage[] };
        const items = payload.items ?? [];
        if (items.length >= expectedCount) {
          return items;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return [];
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                SMTP_HOST: process.env.SMTP_HOST ?? 'localhost',
                SMTP_PORT: Number(process.env.SMTP_PORT ?? '1025'),
                SMTP_SECURE: false,
                SMTP_USER: process.env.SMTP_USER ?? '',
                SMTP_PASS: process.env.SMTP_PASS ?? '',
                SMTP_SKIP_AUTH: process.env.SMTP_SKIP_AUTH ?? 'true',
                SMTP_FROM_NAME: 'PrismaCV',
                SMTP_FROM_EMAIL: 'noreply@prismacv.dev',
                APP_NAME: 'PrismaCV',
                OTP_EXPIRY_MINUTES: 10,
              };
              return config[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    emailService = moduleFixture.get<EmailService>(EmailService);
    await clearInbox();
  });

  it('renders OTP, reset, share-view, and billing templates', async () => {
    await expect(
      emailService.sendOtpEmail('mailhog+otp@prismacv.dev', '123456', 'Casey'),
    ).resolves.toBe(true);

    await expect(
      emailService.sendPasswordResetEmail(
        'mailhog+reset@prismacv.dev',
        '654321',
        'Casey',
      ),
    ).resolves.toBe(true);

    await expect(
      emailService.sendCvShareViewedEmail('mailhog+share@prismacv.dev', {
        cvTitle: 'Backend Engineer Resume',
        shareUrl: 'https://prismacv.dev/public/cv/software-engineer-example',
        viewCount: 7,
        viewerLocation: 'Berlin, Germany',
        userName: 'Casey',
      }),
    ).resolves.toBe(true);

    await expect(
      emailService.sendBillingReceiptEmail('mailhog+billing@prismacv.dev', {
        planName: 'Pro',
        amountDisplay: '19.00 USD',
        billingCycle: 'monthly',
        receiptDate: '2026-05-07',
        invoiceUrl: 'https://dashboard.stripe.com/invoices/test',
        userName: 'Casey',
      }),
    ).resolves.toBe(true);

    const messages = await waitForMessages(4);
    const subjects = messages
      .map(message => message.Content?.Headers?.Subject?.[0] ?? '')
      .filter(Boolean);
    const bodies = messages
      .map(message => message.Content?.Body ?? '')
      .join('\n');

    expect(subjects).toEqual(
      expect.arrayContaining([
        '123456 is your PrismaCV verification code',
        'PrismaCV Password Reset - 654321',
        'PrismaCV - Your shared CV was viewed',
        'PrismaCV - Billing Receipt',
      ]),
    );

    expect(bodies).toContain('Your verification code');
    expect(bodies).toContain('Password Reset Request');
    expect(bodies).toContain('shared CV was viewed');
    expect(bodies).toContain('billing receipt');
  });
});
