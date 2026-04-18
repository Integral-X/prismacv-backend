import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { OtpService } from './otp.service';
import { EmailService } from '@/modules/email/email.service';
import { User, UserRole } from './entities/user.entity';
import { AuthCredentials } from './entities/auth-credentials.entity';
import { TokenPair } from './entities/token-pair.entity';
import { ForgotPasswordResponseDto } from './dto/response/forgot-password.response.dto';
import { ResetPasswordResponseDto } from './dto/response/rese-password.response.dto';
import { ChangePasswordResponseDto } from './dto/response/change-password.response.dto';
import { VerifyResetOtpResponseDto } from './dto/response/verify-reset-otp.response.dto';
import { JWT_EXPIRATION } from '@/shared/constants/jwt.constants';
import {
  generateResetToken,
  hashResetToken,
  verifyResetToken,
} from '@/shared/utils/token.util';
import { PrismaService } from '@/config/prisma.service';
import { AuthTokenPurpose, OtpPurpose } from '@prisma/client';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
    private readonly logger: Logger = new Logger(AuthService.name),
  ) {}

  onModuleInit() {
    const secret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET is not set or too short (minimum 32 characters).',
      );
    }
    if (!refreshSecret || refreshSecret.length < 32) {
      throw new Error(
        'JWT_REFRESH_SECRET is not set or too short (minimum 32 characters).',
      );
    }
  }

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

    const tokenData = await this.getTokens(
      user.id,
      user.email,
      user.role,
      user.isMasterAdmin,
      'platform-admin',
    );
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
      userToCreate.isMasterAdmin = false;

      // Create the user
      const createdUser = await this.usersService.create(userToCreate);

      this.logger.log(
        `Admin signup successful: email=${createdUser.email}, userId=${createdUser.id}`,
      );

      // Generate and send OTP for email verification
      await this.otpService.generateAndSendOtp(createdUser);

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
   * User login - validates credentials, enforces email verification, and issues JWT tokens
   */
  async userLogin(
    credentials: AuthCredentials,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.validateUser(credentials);
    if (!user) {
      this.logger.warn(
        `User login failed: invalid credentials, email=${credentials.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== UserRole.REGULAR) {
      this.logger.warn(
        `User login failed: user is not REGULAR, email=${user.email}, role=${user.role}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      this.logger.warn(
        `User login failed: email not verified, email=${user.email}`,
      );
      throw new UnauthorizedException(
        'Email address not verified. Please check your inbox for the verification OTP.',
      );
    }

    const tokenData = await this.getTokens(
      user.id,
      user.email,
      user.role,
      user.isMasterAdmin,
      'user',
    );
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `User login successful: email=${user.email}, userId=${user.id}`,
    );

    return { user, tokens };
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
      await this.otpService.generateAndSendOtp(createdUser);

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
    expectedAudience: 'platform-admin' | 'user',
  ): Promise<{ user: User; tokens: TokenPair }> {
    const decoded = await this.decodeRefreshToken(
      refreshToken,
      expectedAudience,
    );
    const user = await this.usersService.findById(decoded.sub);
    if (!user || !user.refreshToken) {
      this.logger.warn(
        `Token refresh failed: user not found or no refresh token, userId=${decoded.sub}`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const expectedRole =
      expectedAudience === 'platform-admin'
        ? UserRole.PLATFORM_ADMIN
        : UserRole.REGULAR;
    if (user.role !== expectedRole) {
      this.logger.warn(
        `Token refresh failed: role/audience mismatch, userId=${user.id}, role=${user.role}, expectedAudience=${expectedAudience}`,
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

    const tokenData = await this.getTokens(
      user.id,
      user.email,
      user.role,
      user.isMasterAdmin,
      expectedAudience,
    );
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `Token refreshed successfully: email=${user.email}, userId=${user.id}, role=${user.role}`,
    );

    return { user, tokens };
  }

  async getTokens(
    userId: string,
    email: string,
    role: string,
    isMasterAdmin: boolean,
    audience: 'platform-admin' | 'user',
  ) {
    const issuer = this.configService.get<string>('app.name', 'PrismaCV');
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
          isMasterAdmin,
          iss: issuer,
          aud: audience,
          jti: randomUUID(),
        },
        {
          secret: jwtSecret,
          expiresIn: JWT_EXPIRATION.ACCESS_TOKEN,
          algorithm: 'HS256',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
          isMasterAdmin,
          iss: issuer,
          aud: audience,
          jti: randomUUID(),
        },
        {
          secret: jwtRefreshSecret,
          expiresIn: JWT_EXPIRATION.REFRESH_TOKEN,
          algorithm: 'HS256',
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async decodeRefreshToken(
    token: string,
    expectedAudience: 'platform-admin' | 'user',
  ) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        audience: expectedAudience,
        issuer: this.configService.get<string>('app.name', 'PrismaCV'),
        algorithms: ['HS256'],
      });
    } catch {
      this.logger.warn('Token verification failed: invalid or expired token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Initiate password reset process
   * Generates OTP and sends email (always returns success for security)
   */
  async forgotPassword(email: string): Promise<ForgotPasswordResponseDto> {
    try {
      // Find user by email
      const user = await this.usersService.findByEmail(email);

      if (user) {
        // Generate and send password reset OTP using OtpService
        await this.otpService.generateAndSendOtp(
          user,
          OtpPurpose.PASSWORD_RESET,
        );
        this.logger.log(`Password reset OTP sent to: ${email}`);
      } else {
        this.logger.warn(
          `Password reset requested for non-existent email: ${email}`,
        );
      }

      // Always return the same response for security (don't reveal if email exists)
      return {
        message: 'If the email exists, an OTP has been sent.',
      };
    } catch (error) {
      this.logger.error('Error in forgotPassword:', error);
      // Still return success message to not reveal errors
      return {
        message: 'If the email exists, an OTP has been sent.',
      };
    }
  }

  /**
   * Verify OTP and generate reset token
   */
  async verifyResetOtp(
    email: string,
    otp: string,
  ): Promise<VerifyResetOtpResponseDto> {
    // Verify OTP using OtpService
    const user = await this.otpService.verifyOtp(
      email,
      otp,
      OtpPurpose.PASSWORD_RESET,
    );

    // Generate reset token
    const resetToken = generateResetToken();
    const tokenHash = await hashResetToken(resetToken);
    const tokenExpiryMinutes = 15; // 15 minutes for reset token
    const tokenExpiresAt = new Date(
      Date.now() + tokenExpiryMinutes * 60 * 1000,
    );

    // Clean up any existing reset tokens
    await this.prisma.authToken.deleteMany({
      where: {
        userId: user.id,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
      },
    });

    // Store reset token
    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        tokenHash,
        expiresAt: tokenExpiresAt,
      },
    });

    this.logger.log(`Reset token generated for user: ${email}`);
    this.logger.log(
      `Reset token (first 8 chars): ${resetToken.substring(0, 8)}...`,
    );
    return { resetToken };
  }

  /**
   * Verify password reset OTP and return reset token (for OTP controller)
   */
  async verifyPasswordResetOtp(
    email: string,
    otp: string,
  ): Promise<VerifyResetOtpResponseDto> {
    return await this.verifyResetOtp(email, otp);
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<ResetPasswordResponseDto> {
    this.logger.log(
      `Password reset attempt with token (first 8 chars): ${resetToken.substring(0, 8)}...`,
    );

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password policy
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    // Find valid reset token by searching all tokens and verifying each one
    const tokenRecords = await this.prisma.authToken.findMany({
      where: {
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    this.logger.log(`Found ${tokenRecords.length} valid reset tokens to check`);

    // Find the matching token by verifying against each stored hash
    let validTokenRecord = null;
    for (const record of tokenRecords) {
      const isValidToken = await verifyResetToken(resetToken, record.tokenHash);
      if (isValidToken) {
        validTokenRecord = record;
        break;
      }
    }

    if (!validTokenRecord) {
      this.logger.warn(`Password reset failed: invalid or expired reset token`);
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersService.update(validTokenRecord.userId, {
      password: hashedPassword,
      refreshToken: null, // Invalidate all sessions
    });

    // Mark token as used
    await this.prisma.authToken.update({
      where: { id: validTokenRecord.id },
      data: { usedAt: new Date() },
    });

    // Clean up all reset tokens for this user
    await this.prisma.authToken.deleteMany({
      where: {
        userId: validTokenRecord.userId,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
      },
    });

    this.logger.log(
      `Password reset successful for user: ${validTokenRecord.user.email}`,
    );

    return {
      message: 'Password reset successfully',
    };
  }

  /**
   * Change password for authenticated user
   * Verifies current password and updates to new password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<ChangePasswordResponseDto> {
    this.logger.log(`Password change attempt for user: ${userId}`);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    // Validate password policy
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters long',
      );
    }

    // Find user
    const user = await this.usersService.findById(userId);
    if (!user) {
      this.logger.warn(
        `Password change failed: user not found, userId=${userId}`,
      );
      throw new UnauthorizedException('User not found');
    }

    // Check if user has a password (OAuth users might not have one)
    if (!user.password) {
      this.logger.warn(
        `Password change failed: user has no password (OAuth user), userId=${userId}`,
      );
      throw new BadRequestException('Cannot change password for OAuth users');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      this.logger.warn(
        `Password change failed: invalid current password, userId=${userId}`,
      );
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.usersService.update(userId, {
      password: hashedNewPassword,
      refreshToken: null, // Invalidate all sessions for security
    });

    this.logger.log(
      `Password changed successfully for user: ${user.email}, userId=${userId}`,
    );

    return {
      message: 'Password changed successfully',
    };
  }
}
