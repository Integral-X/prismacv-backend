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
import { hashOtp, verifyOtpHash } from '@/shared/utils/otp.util';

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
   * Uses Otp table with purpose-based behavior
   */
  async generateAndSendOtp(
    user: User,
    otpPurpose: OtpPurpose = OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
  ): Promise<{ expiresAt: Date }> {
    const otpCode = this.generateOtpCode();
    const otpHash = await hashOtp(otpCode);
    const expiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    const maxAttempts =
      otpPurpose === OtpPurpose.PASSWORD_RESET ? 3 : MAX_OTP_ATTEMPTS;
    const isPasswordReset = otpPurpose === OtpPurpose.PASSWORD_RESET;

    // Store OTP in Otp table using repository method
    await this.usersService.createOtp(
      user.id,
      otpPurpose,
      otpHash,
      expiresAt,
      maxAttempts,
    );

    this.logger.log(
      `${isPasswordReset ? 'Password reset' : 'Email verification'} OTP generated for user: email=${user.email}, expiresAt=${expiresAt.toISOString()}`,
    );

    const sendOtpPromise = isPasswordReset
      ? this.emailService.sendPasswordResetEmail(user.email, otpCode, user.name)
      : this.emailService.sendOtpEmail(user.email, otpCode, user.name);

    // Send OTP email (fire and forget - don't block on email sending)
    sendOtpPromise
      .then(sent => {
        if (sent) {
          this.logger.log(
            `${isPasswordReset ? 'Password reset' : 'OTP'} email sent successfully to: ${user.email}`,
          );
        } else {
          this.logger.warn(
            `Failed to send ${isPasswordReset ? 'password reset' : 'OTP'} email to: ${user.email}`,
          );
        }
      })
      .catch(error => {
        this.logger.error(
          `Error sending ${isPasswordReset ? 'password reset' : 'OTP'} email to ${user.email}:`,
          error.message,
        );
      });

    return { expiresAt };
  }

  /**
   * Verify OTP code for email verification (signup)
   * Uses Otp table with purpose-based behavior
   */
  async verifyOtp(
    email: string,
    otpCode: string,
    otpPurpose: OtpPurpose = OtpPurpose.SIGNUP_EMAIL_VERIFICATION,
  ): Promise<User> {
    const isPasswordReset = otpPurpose === OtpPurpose.PASSWORD_RESET;
    const user = await this.usersService.findByEmail(email.toLowerCase());

    if (!user) {
      this.logger.warn(
        `OTP verification failed: user not found, email=${email}`,
      );
      if (isPasswordReset) {
        throw new UnauthorizedException('Invalid OTP');
      }
      throw new NotFoundException('User not found');
    }

    if (!isPasswordReset && user.emailVerified) {
      this.logger.warn(
        `OTP verification failed: email already verified, email=${email}`,
      );
      throw new BadRequestException('Email is already verified');
    }

    // Find valid OTP record using repository method
    const otpRecord = await this.usersService.findValidOtp(user.id, otpPurpose);

    if (!otpRecord) {
      this.logger.warn(
        `OTP verification failed: no valid OTP found, email=${email}`,
      );
      if (isPasswordReset) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      this.logger.warn(
        `OTP verification failed: max attempts exceeded, email=${email}, attempts=${otpRecord.attempts}`,
      );
      if (isPasswordReset) {
        throw new UnauthorizedException('Too many failed attempts');
      }
      throw new HttpException(
        'Too many failed attempts. Please request a new verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Verify OTP code
    const isValidOtp = await verifyOtpHash(otpCode, otpRecord.otpHash);

    if (!isValidOtp) {
      // Increment failed attempt counter using repository method
      const updatedOtp = await this.usersService.incrementOtpAttempts(
        otpRecord.id,
      );
      const remainingAttempts = otpRecord.maxAttempts - updatedOtp.attempts;

      this.logger.warn(
        `OTP verification failed: invalid OTP, email=${email}, attempts=${updatedOtp.attempts}/${otpRecord.maxAttempts}`,
      );
      if (isPasswordReset) {
        throw new UnauthorizedException('Invalid OTP');
      }

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

    // Mark OTP as used using repository method
    await this.usersService.markOtpAsUsed(otpRecord.id);
    if (isPasswordReset) {
      this.logger.log(
        `Password reset OTP verified successfully: email=${email}, userId=${user.id}`,
      );
      return user;
    }

    // Mark email as verified for signup flow
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
}
