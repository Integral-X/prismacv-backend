import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { EmailService } from '@/modules/email/email.service';

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
   * Generate OTP and send verification email
   */
  async generateAndSendOtp(user: User): Promise<{ expiresAt: Date }> {
    const otpCode = this.generateOtpCode();
    const expiryMinutes = this.configService.get<number>(
      'OTP_EXPIRY_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save OTP to database
    await this.usersService.saveOtp(user.id, otpCode, expiresAt);

    this.logger.log(
      `OTP generated for user: email=${user.email}, expiresAt=${expiresAt.toISOString()}`,
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
   * Verify OTP code for email verification
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

    if (!user.otpCode || !user.otpExpiresAt) {
      this.logger.warn(`OTP verification failed: no OTP found, email=${email}`);
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiresAt) {
      this.logger.warn(`OTP verification failed: OTP expired, email=${email}`);
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    // Verify OTP code
    if (user.otpCode !== otpCode) {
      this.logger.warn(`OTP verification failed: invalid OTP, email=${email}`);
      throw new BadRequestException('Invalid verification code');
    }

    // Mark email as verified and clear OTP
    const verifiedUser = await this.usersService.markEmailVerified(user.id);

    this.logger.log(
      `Email verified successfully: email=${email}, userId=${user.id}`,
    );

    return verifiedUser;
  }

  /**
   * Resend OTP code for email verification
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
