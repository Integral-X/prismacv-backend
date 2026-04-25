import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../src/modules/email/email.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

describe('EmailService', () => {
  describe('with SMTP credentials configured', () => {
    let service: EmailService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue?: any) => {
                const config: Record<string, any> = {
                  SMTP_HOST: 'smtp.test.com',
                  SMTP_PORT: 587,
                  SMTP_SECURE: false,
                  SMTP_USER: 'testuser',
                  SMTP_PASS: 'testpass',
                  SMTP_FROM_NAME: 'PrismaCV',
                  SMTP_FROM_EMAIL: 'noreply@test.com',
                  APP_NAME: 'PrismaCV',
                  OTP_EXPIRY_MINUTES: 10,
                };
                return config[key] ?? defaultValue;
              }),
            },
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should send email successfully', async () => {
      const result = await service.sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result).toBe(true);
    });

    it('should send OTP email with correct template data', async () => {
      const result = await service.sendOtpEmail(
        'user@test.com',
        '123456',
        'Test User',
      );
      expect(result).toBe(true);
    });

    it('should send password reset email with correct template data', async () => {
      const result = await service.sendPasswordResetEmail(
        'user@test.com',
        '654321',
        'Test User',
      );
      expect(result).toBe(true);
    });

    it('should verify SMTP connection', async () => {
      const result = await service.verifyConnection();
      expect(result).toBe(true);
    });
  });

  describe('without SMTP credentials', () => {
    let service: EmailService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
            },
          },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('should return false when sending email without transporter', async () => {
      const result = await service.sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result).toBe(false);
    });

    it('should return false when verifying connection without transporter', async () => {
      const result = await service.verifyConnection();
      expect(result).toBe(false);
    });
  });
});
