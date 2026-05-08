import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailOptions, SmtpConfig } from './interfaces/email-options.interface';
import {
  generateOtpEmailTemplate,
  generateOtpEmailPlainText,
  OtpEmailTemplateData,
} from './templates/otp-email.template';
import {
  generatePasswordResetEmailTemplate,
  generatePasswordResetEmailPlainText,
  PasswordResetEmailTemplateData,
} from './templates/password-reset-email.template';
import {
  generateWelcomeEmailTemplate,
  generateWelcomeEmailPlainText,
  WelcomeEmailTemplateData,
} from './templates/welcome-email.template';
import {
  generatePasswordChangeEmailTemplate,
  generatePasswordChangeEmailPlainText,
  PasswordChangeEmailTemplateData,
} from './templates/password-change-email.template';
import {
  generateAccountDeletionEmailTemplate,
  generateAccountDeletionEmailPlainText,
  AccountDeletionEmailTemplateData,
} from './templates/account-deletion-email.template';
import {
  BillingReceiptEmailTemplateData,
  generateBillingReceiptEmailTemplate,
  generateBillingReceiptEmailPlainText,
} from './templates/billing-receipt-email.template';
import {
  CvShareViewEmailTemplateData,
  generateCvShareViewEmailTemplate,
  generateCvShareViewEmailPlainText,
} from './templates/cv-share-view-email.template';

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;
  private smtpConfig: SmtpConfig;
  private readonly smtpSkipAuth: boolean;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    this.smtpSkipAuth = this.toBoolean(
      this.configService.get<string | boolean>('SMTP_SKIP_AUTH', false),
    );
    this.smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
      from: {
        name: this.configService.get<string>('SMTP_FROM_NAME', 'PrismaCV'),
        email: this.configService.get<string>(
          'SMTP_FROM_EMAIL',
          'noreply@prismacv.com',
        ),
      },
    };

    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    const hasAuthCredentials =
      Boolean(this.smtpConfig.auth.user) && Boolean(this.smtpConfig.auth.pass);

    // Check if SMTP credentials are configured
    if (!hasAuthCredentials && !this.smtpSkipAuth) {
      this.logger.error(
        'SMTP credentials not configured. Email sending is disabled. Set SMTP_USER/SMTP_PASS or SMTP_SKIP_AUTH=true.',
      );
      return;
    }

    try {
      // Port 465 uses implicit SSL (secure: true)
      // Port 587 uses STARTTLS (secure: false, but TLS will be upgraded)
      const isImplicitTLS = this.smtpConfig.port === 465;

      this.transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: isImplicitTLS, // true for 465, false for 587
        ...(hasAuthCredentials
          ? {
              auth: {
                user: this.smtpConfig.auth.user,
                pass: this.smtpConfig.auth.pass,
              },
            }
          : {}),
        // For port 587, require STARTTLS upgrade
        requireTLS: !isImplicitTLS && !this.smtpSkipAuth,
      });

      this.logger.log(`Email transporter initialized successfully:`);
      this.logger.log(
        `- Host: ${this.smtpConfig.host}:${this.smtpConfig.port}`,
      );
      this.logger.log(`- Security: ${isImplicitTLS ? 'SSL' : 'STARTTLS'}`);
      this.logger.log(
        `- Auth: ${hasAuthCredentials ? this.smtpConfig.auth.user : 'disabled (SMTP_SKIP_AUTH=true)'}`,
      );
      this.logger.log(
        `- From: ${this.smtpConfig.from.name} <${this.smtpConfig.from.email}>`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
    }
  }

  /**
   * Send an email with the given options
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error(
        `Email not sent (transporter not configured): to=${options.to}, subject=${options.subject}`,
      );
      this.logger.error('Please check SMTP configuration in .env file');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.smtpConfig.from.name}" <${this.smtpConfig.from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(
        `Email sent successfully: to=${options.to}, messageId=${info.messageId}`,
      );
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email: to=${options.to}, subject=${options.subject}, error=${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * Send OTP verification email
   */
  async sendOtpEmail(
    email: string,
    otpCode: string,
    userName?: string,
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'PrismaCV');
    const expiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    );

    const templateData: OtpEmailTemplateData = {
      appName,
      otpCode,
      expiryMinutes,
      userName,
    };

    const options: EmailOptions = {
      to: email,
      subject: `${otpCode} is your ${appName} verification code`,
      html: generateOtpEmailTemplate(templateData),
      text: generateOtpEmailPlainText(templateData),
    };

    this.logger.log(`Sending OTP email to: ${email}`);
    return this.sendEmail(options);
  }

  /**
   * Send password reset OTP email
   */
  async sendPasswordResetEmail(
    email: string,
    otpCode: string,
    userName?: string,
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'PrismaCV');
    const expiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    );

    const templateData: PasswordResetEmailTemplateData = {
      appName,
      otpCode,
      expiryMinutes,
      userName,
    };

    const options: EmailOptions = {
      to: email,
      subject: `${appName} Password Reset - ${otpCode}`,
      html: generatePasswordResetEmailTemplate(templateData),
      text: generatePasswordResetEmailPlainText(templateData),
    };

    this.logger.log(`Sending password reset email to: ${email}`);
    return this.sendEmail(options);
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, userName?: string): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'PrismaCV');
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    const templateData: WelcomeEmailTemplateData = {
      appName,
      userName,
      loginUrl: `${frontendUrl}/login`,
    };

    const options: EmailOptions = {
      to: email,
      subject: `Welcome to ${appName}!`,
      html: generateWelcomeEmailTemplate(templateData),
      text: generateWelcomeEmailPlainText(templateData),
    };

    this.logger.log(`Sending welcome email to: ${email}`);
    return this.sendEmail(options);
  }

  /**
   * Send password change confirmation email
   */
  async sendPasswordChangeEmail(
    email: string,
    userName?: string,
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'PrismaCV');
    const supportEmail = this.configService.get<string>(
      'SUPPORT_EMAIL',
      'support@prismacv.com',
    );

    const templateData: PasswordChangeEmailTemplateData = {
      appName,
      userName,
      supportEmail,
    };

    const options: EmailOptions = {
      to: email,
      subject: `${appName} - Password Changed`,
      html: generatePasswordChangeEmailTemplate(templateData),
      text: generatePasswordChangeEmailPlainText(templateData),
    };

    this.logger.log(`Sending password change email to: ${email}`);
    return this.sendEmail(options);
  }

  /**
   * Send account deletion confirmation email
   */
  async sendAccountDeletionEmail(
    email: string,
    userName?: string,
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'PrismaCV');

    const templateData: AccountDeletionEmailTemplateData = {
      appName,
      userName,
    };

    const options: EmailOptions = {
      to: email,
      subject: `${appName} - Account Deleted`,
      html: generateAccountDeletionEmailTemplate(templateData),
      text: generateAccountDeletionEmailPlainText(templateData),
    };

    this.logger.log(`Sending account deletion email to: ${email}`);
    return this.sendEmail(options);
  }

  async sendCvShareViewedEmail(
    email: string,
    input: {
      cvTitle: string;
      shareUrl: string;
      viewCount: number;
      viewerLocation?: string;
      userName?: string;
    },
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'PrismaCV');

    const templateData: CvShareViewEmailTemplateData = {
      appName,
      cvTitle: input.cvTitle,
      shareUrl: input.shareUrl,
      viewCount: input.viewCount,
      viewerLocation: input.viewerLocation,
      userName: input.userName,
    };

    const options: EmailOptions = {
      to: email,
      subject: `${appName} - Your shared CV was viewed`,
      html: generateCvShareViewEmailTemplate(templateData),
      text: generateCvShareViewEmailPlainText(templateData),
    };

    this.logger.log(`Sending CV share view notification to: ${email}`);
    return this.sendEmail(options);
  }

  async sendBillingReceiptEmail(
    email: string,
    input: {
      planName: string;
      amountDisplay: string;
      billingCycle: 'monthly' | 'yearly' | 'one_time';
      receiptDate: string;
      invoiceUrl?: string;
      userName?: string;
    },
  ): Promise<boolean> {
    const appName = this.configService.get<string>('APP_NAME', 'PrismaCV');

    const templateData: BillingReceiptEmailTemplateData = {
      appName,
      planName: input.planName,
      amountDisplay: input.amountDisplay,
      billingCycle: input.billingCycle,
      receiptDate: input.receiptDate,
      invoiceUrl: input.invoiceUrl,
      userName: input.userName,
    };

    const options: EmailOptions = {
      to: email,
      subject: `${appName} - Billing Receipt`,
      html: generateBillingReceiptEmailTemplate(templateData),
      text: generateBillingReceiptEmailPlainText(templateData),
    };

    this.logger.log(`Sending billing receipt email to: ${email}`);
    return this.sendEmail(options);
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error(
        'SMTP transporter not initialized - check SMTP credentials',
      );
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed', error);
      return false;
    }
  }

  private toBoolean(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase().trim());
  }
}
