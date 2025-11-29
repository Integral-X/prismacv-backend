import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { AuthCredentials } from './entities/auth-credentials.entity';
import { TokenPair } from './entities/token-pair.entity';
import { JWT_EXPIRATION } from '@/shared/constants/jwt.constants';
import { EmailService } from '@/modules/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly logger: Logger = new Logger(AuthService.name),
  ) {}

  async validateUser(credentials: AuthCredentials): Promise<User | null> {
    const user = await this.usersService.findByEmail(credentials.email);
    if (!user) {
      this.logger.warn(`User validation failed: email=${credentials.email}`);
      return null;
    }

    // OAuth users don't have passwords
    if (!user.password) {
      this.logger.warn(
        `User validation failed: user is OAuth-only, email=${credentials.email}`,
      );
      return null;
    }

    if (await bcrypt.compare(credentials.password, user.password)) {
      this.logger.log(
        `User validation successful: email=${user.email}, role=${user.role}, userId=${user.id}`,
      );
      return user;
    }

    this.logger.warn(`User validation failed: email=${credentials.email}`);
    return null;
  }

  /**
   * Admin login - validates credentials and ensures PLATFORM_ADMIN role
   * Returns user and JWT tokens
   */
  async adminLogin(
    credentials: AuthCredentials,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.validateUser(credentials);
    if (!user) {
      this.logger.warn(
        `Admin login failed: invalid credentials, email=${credentials.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user has PLATFORM_ADMIN role
    if (user.role !== UserRole.PLATFORM_ADMIN) {
      this.logger.warn(
        `Admin login failed: user is not PLATFORM_ADMIN, email=${user.email}, role=${user.role}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens for admin
    const tokenData = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `Admin login successful: email=${user.email}, userId=${user.id}`,
    );

    return { user, tokens };
  }

  /**
   * Admin signup - creates user with PLATFORM_ADMIN role
   * Returns user profile only (no tokens - user must login after signup)
   * Sends OTP email for email verification
   */
  async adminSignup(user: User): Promise<{ user: User }> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create user entity with PLATFORM_ADMIN role
      const userToCreate = new User();
      userToCreate.email = user.email;
      userToCreate.password = hashedPassword;
      userToCreate.name = user.name;
      userToCreate.role = UserRole.PLATFORM_ADMIN;

      // Create the user
      const createdUser = await this.usersService.create(userToCreate);

      this.logger.log(
        `Admin signup successful: email=${createdUser.email}, userId=${createdUser.id}`,
      );

      // Generate and send OTP for email verification
      await this.generateAndSendOtp(createdUser);

      // Refetch user to get updated OTP fields
      const updatedUser = await this.usersService.findById(createdUser.id);

      return { user: updatedUser || createdUser };
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(
          `Admin signup attempt with existing email: ${user.email}`,
        );
        throw error;
      }

      this.logger.error('Error during admin signup:', error);
      throw error;
    }
  }

  /**
   * User login - validates credentials and ensures REGULAR role
   * Returns user profile only (no tokens)
   */
  async userLogin(credentials: AuthCredentials): Promise<{ user: User }> {
    const user = await this.validateUser(credentials);
    if (!user) {
      this.logger.warn(
        `User login failed: invalid credentials, email=${credentials.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user has REGULAR role
    if (user.role !== UserRole.REGULAR) {
      this.logger.warn(
        `User login failed: user is not REGULAR, email=${user.email}, role=${user.role}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(
      `User login successful: email=${user.email}, userId=${user.id}`,
    );

    return { user };
  }

  /**
   * User signup - creates user with REGULAR role
   * Returns user profile only (no tokens)
   * Sends OTP email for email verification
   */
  async userSignup(user: User): Promise<{ user: User }> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create user entity with REGULAR role
      const userToCreate = new User();
      userToCreate.email = user.email;
      userToCreate.password = hashedPassword;
      userToCreate.name = user.name;
      userToCreate.role = UserRole.REGULAR;

      // Create the user
      const createdUser = await this.usersService.create(userToCreate);

      this.logger.log(
        `User signup successful: email=${createdUser.email}, userId=${createdUser.id}`,
      );

      // Generate and send OTP for email verification
      await this.generateAndSendOtp(createdUser);

      // Refetch user to get updated OTP fields
      const updatedUser = await this.usersService.findById(createdUser.id);

      return { user: updatedUser || createdUser };
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(
          `User signup attempt with existing email: ${user.email}`,
        );
        throw error;
      }

      this.logger.error('Error during user signup:', error);
      throw error;
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ user: User; tokens?: TokenPair | undefined }> {
    const decoded = await this.decodeRefreshToken(refreshToken);
    const user = await this.usersService.findById(decoded.sub);
    if (!user || !user.refreshToken) {
      this.logger.warn(
        `Token refresh failed: user not found or no refresh token, userId=${decoded.sub}`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      this.logger.warn(
        `Token refresh failed: invalid refresh token, email=${user.email}, userId=${user.id}, role=${user.role}`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Maintain role-based token generation logic
    // Tokens contain role information from getTokens method
    const tokenData = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `Token refreshed successfully: email=${user.email}, userId=${user.id}, role=${user.role}`,
    );

    return { user, tokens };
  }

  async getTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: JWT_EXPIRATION.ACCESS_TOKEN,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: JWT_EXPIRATION.REFRESH_TOKEN,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async decodeRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      this.logger.warn('Token verification failed: invalid or expired token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ==================== OTP Methods ====================

  /**
   * Generate a 6-digit OTP code
   */
  private generateOtpCode(): string {
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
