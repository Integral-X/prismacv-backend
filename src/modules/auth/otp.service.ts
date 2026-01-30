import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { EmailService } from '@/modules/email/email.service';
import { OtpPurpose } from '@prisma/client';
import { hashOtp, verifyOtp } from '@/shared/utils/otp.util';

// Maximum number of failed OTP verification attempts before locking
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly logger: Logger = new Logger(OtpService.name),
  ) {}

  /**
   * Generate a cryptographically secure 6-digit OTP code
   */
  generateOtpCode(): string {
    // Generate cryptographically secure random 6-digit OTP without modulo bias
    const MAX = 900000; // number of possible OTP codes
    const RANGE = 16777216; // 2^24, max random value from 3 bytes
    const LIMIT = Math.floor(RANGE / MAX) * MAX; // 16_200_000
    let randomNumber: number;
    do {
      const randomBytes = crypto.randomBytes(3);
      randomNumber = randomBytes.readUIntBE(0, 3);
    } while (randomNumber >= LIMIT);
    const otp = (randomNumber % MAX) + 100000; // Ensures 6 digits (100000-999999)
    return otp.toString();
  }

  /**
   * Generate and send OTP for email verification (signup)
   * Uses Otp table with SIGNUP_EMAIL_VERIFICATION purpose
   */
  async generateAndSendOtp(user: User): Promise<{ expiresAt: Date }> {
    const otpCode = this.generateOtpCode();
    const otpHash = await hashOtp(otpCode);
    const expiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP in Otp table using repository method
    await this.usersService.createOtp(
      user.id,
      OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
      otpHash,
      expiresAt,
      MAX_OTP_ATTEMPTS,
    );

    this.logger.log(
      `Email verification OTP generated for user: email=${user.email}, expiresAt=${expiresAt.toISOString()}`,
    );

    // Send OTP email (fire and forget - don't block on email sending)
    this.emailService
      .sendOtpEmail(user.email, otpCode, user.name)
      .then(sent => {
        if (sent) {
          this.logger.log(`OTP email sent successfully to: ${user.email}`);
        } else {
          this.logger.warn(`Failed to send OTP email to: ${user.email}`);
        }
      })
      .catch(error => {
        this.logger.error(
          `Error sending OTP email to ${user.email}:`,
          error.message,
        );
      });

    return { expiresAt };
  }

  /**
   * Verify OTP code for email verification (signup)
   * Uses Otp table with SIGNUP_EMAIL_VERIFICATION purpose
   */
  async verifyOtp(email: string, otpCode: string): Promise<User> {
    const user = await this.usersService.findByEmail(email.toLowerCase());

    if (!user) {
      this.logger.warn(
        `OTP verification failed: user not found, email=${email}`,
      );
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      this.logger.warn(
        `OTP verification failed: email already verified, email=${email}`,
      );
      throw new BadRequestException('Email is already verified');
    }

    // Find valid OTP record using repository method
    const otpRecord = await this.usersService.findValidOtp(
      user.id,
      OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
    );

    if (!otpRecord) {
      this.logger.warn(
        `OTP verification failed: no valid OTP found, email=${email}`,
      );
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      this.logger.warn(
        `OTP verification failed: max attempts exceeded, email=${email}, attempts=${otpRecord.attempts}`,
      );
      throw new HttpException(
        'Too many failed attempts. Please request a new verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Verify OTP code
    const isValidOtp = await verifyOtp(otpCode, otpRecord.otpHash);

    if (!isValidOtp) {
      // Increment failed attempt counter using repository method
      const updatedOtp = await this.usersService.incrementOtpAttempts(
        otpRecord.id,
      );
      const remainingAttempts = otpRecord.maxAttempts - updatedOtp.attempts;

      this.logger.warn(
        `OTP verification failed: invalid OTP, email=${email}, attempts=${updatedOtp.attempts}/${otpRecord.maxAttempts}`,
      );

      // Check if max attempts reached after increment
      if (updatedOtp.attempts >= otpRecord.maxAttempts) {
        this.logger.warn(
          `OTP locked due to max attempts exceeded, email=${email}`,
        );
        throw new HttpException(
          'Too many failed attempts. Please request a new verification code.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException(
        `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      );
    }

    // Mark OTP as used and email as verified using repository methods
    await this.usersService.markOtpAsUsed(otpRecord.id);
    const verifiedUser = await this.usersService.markEmailVerified(user.id);

    this.logger.log(
      `Email verified successfully: email=${email}, userId=${user.id}`,
    );

    return verifiedUser;
  }

  /**
   * Resend OTP code for email verification (signup)
   * Uses Otp table with SIGNUP_EMAIL_VERIFICATION purpose
   */
  async resendOtp(email: string): Promise<{ expiresAt: Date }> {
    const user = await this.usersService.findByEmail(email.toLowerCase());

    if (!user) {
      this.logger.warn(`OTP resend failed: user not found, email=${email}`);
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      this.logger.warn(
        `OTP resend failed: email already verified, email=${email}`,
      );
      throw new BadRequestException('Email is already verified');
    }

    // Generate and send new OTP
    const result = await this.generateAndSendOtp(user);

    this.logger.log(`OTP resent to: ${email}`);

    return result;
  }

  /**
   * Generate and send password reset OTP
   * Uses Otp table with PASSWORD_RESET purpose
   */
  async generatePasswordResetOtp(user: User): Promise<{ expiresAt: Date }> {
    const otpCode = this.generateOtpCode();
    const otpHash = await hashOtp(otpCode);
    const expiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP in Otp table using repository method
    await this.usersService.createOtp(
      user.id,
      OtpPurpose.PASSWORD_RESET,
      otpHash,
      expiresAt,
      3, // Max 3 attempts for password reset
    );

    this.logger.log(
      `Password reset OTP generated for user: email=${user.email}, expiresAt=${expiresAt.toISOString()}`,
    );

    // Send password reset email (fire and forget)
    this.emailService
      .sendPasswordResetEmail(user.email, otpCode, user.name)
      .then(sent => {
        if (sent) {
          this.logger.log(
            `Password reset email sent successfully to: ${user.email}`,
          );
        } else {
          this.logger.warn(
            `Failed to send password reset email to: ${user.email}`,
          );
        }
      })
      .catch(error => {
        this.logger.error(
          `Error sending password reset email to ${user.email}:`,
          error.message,
        );
      });

    return { expiresAt };
  }

  /**
   * Verify password reset OTP and return user (internal method)
   * Used by AuthService to verify OTP and generate reset token
   */
  async verifyPasswordResetOtpInternal(
    email: string,
    otpCode: string,
  ): Promise<User> {
    const user = await this.usersService.findByEmail(email.toLowerCase());

    if (!user) {
      this.logger.warn(
        `Password reset OTP verification failed: user not found, email=${email}`,
      );
      throw new UnauthorizedException('Invalid OTP');
    }

    // Find valid OTP record using repository method
    const otpRecord = await this.usersService.findValidOtp(
      user.id,
      OtpPurpose.PASSWORD_RESET,
    );

    if (!otpRecord) {
      this.logger.warn(
        `Password reset OTP verification failed: no valid OTP found, email=${email}`,
      );
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Check attempt limit
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      this.logger.warn(
        `Password reset OTP verification failed: max attempts exceeded, email=${email}`,
      );
      throw new UnauthorizedException('Too many failed attempts');
    }

    // Verify OTP
    const isValidOtp = await verifyOtp(otpCode, otpRecord.otpHash);

    if (!isValidOtp) {
      // Increment attempts using repository method
      await this.usersService.incrementOtpAttempts(otpRecord.id);

      this.logger.warn(
        `Password reset OTP verification failed: invalid OTP, email=${email}, attempts=${otpRecord.attempts + 1}/${otpRecord.maxAttempts}`,
      );
      throw new UnauthorizedException('Invalid OTP');
    }

    // Mark OTP as used using repository method
    await this.usersService.markOtpAsUsed(otpRecord.id);

    this.logger.log(
      `Password reset OTP verified successfully: email=${email}, userId=${user.id}`,
    );

    return user;
  }
}
