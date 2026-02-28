import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/config/prisma.service';
import {
  User as PrismaUser,
  Otp as PrismaOtp,
  OtpPurpose,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { User, UserRole } from './entities/user.entity';
import { generateUuidv7 } from '@/shared/utils/uuid.util';
import { EncryptionUtil } from '@/shared/utils/encryption.util';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Returns the encryption key from config, failing fast with a clear error
   * if it is not configured.
   */
  private getEncryptionKey(): string {
    const key = this.configService.get<string>('security.encryptionKey');
    if (!key || key.length < 32) {
      throw new InternalServerErrorException(
        'ENCRYPTION_KEY is not configured or is too short (must be at least 32 characters). ' +
          'Set the ENCRYPTION_KEY environment variable.',
      );
    }
    return key;
  }

  /**
   * Converts Prisma User to User entity
   */
  private prismaUserToEntity(prismaUser: PrismaUser): User {
    const user = new User();
    user.id = prismaUser.id;
    user.email = prismaUser.email;
    user.password = prismaUser.password || undefined;
    user.name = prismaUser.name;
    user.role = prismaUser.role as UserRole; // Map Prisma UserRole to entity UserRole
    user.isMasterAdmin = prismaUser.isMasterAdmin;
    user.refreshToken = prismaUser.refreshToken;
    user.emailVerified = prismaUser.emailVerified;
    user.otpCode = prismaUser.otpCode || undefined;
    user.otpExpiresAt = prismaUser.otpExpiresAt || undefined;
    user.otpAttempts = prismaUser.otpAttempts;
    user.avatarUrl = prismaUser.avatarUrl || undefined;
    user.provider = prismaUser.provider || undefined;
    user.providerId = prismaUser.providerId || undefined;

    user.oauthAccessToken = prismaUser.oauthAccessToken
      ? EncryptionUtil.decrypt(
          prismaUser.oauthAccessToken,
          this.getEncryptionKey(),
        )
      : undefined;
    user.oauthRefreshToken = prismaUser.oauthRefreshToken
      ? EncryptionUtil.decrypt(
          prismaUser.oauthRefreshToken,
          this.getEncryptionKey(),
        )
      : undefined;

    user.oauthTokenExpiresAt = prismaUser.oauthTokenExpiresAt || undefined;
    user.createdAt = prismaUser.createdAt;
    user.updatedAt = prismaUser.updatedAt;
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({ where: { email } });
    return prismaUser ? this.prismaUserToEntity(prismaUser) : null;
  }

  async findById(id: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({ where: { id } });
    return prismaUser ? this.prismaUserToEntity(prismaUser) : null;
  }

  async update(id: string, userEntity: Partial<User>): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: userEntity.email,
        password: userEntity.password,
        name: userEntity.name,
        role: userEntity.role as any,
        isMasterAdmin: userEntity.isMasterAdmin,
        refreshToken: userEntity.refreshToken,
        provider: userEntity.provider as any,
        providerId: userEntity.providerId,
        avatarUrl: userEntity.avatarUrl,
        oauthAccessToken: userEntity.oauthAccessToken
          ? EncryptionUtil.encrypt(
              userEntity.oauthAccessToken,
              this.getEncryptionKey(),
            )
          : undefined,
        oauthRefreshToken: userEntity.oauthRefreshToken
          ? EncryptionUtil.encrypt(
              userEntity.oauthRefreshToken,
              this.getEncryptionKey(),
            )
          : undefined,
        oauthTokenExpiresAt: userEntity.oauthTokenExpiresAt,
      },
    });
    return this.prismaUserToEntity(updatedUser);
  }

  async create(userEntity: User): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUser = await this.findByEmail(userEntity.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create new user using entity properties with UUIDv7
      const createdUser = await this.prisma.user.create({
        data: {
          id: generateUuidv7(),
          email: userEntity.email,
          password: userEntity.password,
          name: userEntity.name,
          role: userEntity.role as UserRole, // Persist role to database
          isMasterAdmin: userEntity.isMasterAdmin ?? false,
        },
      });

      // Convert Prisma user to User entity
      return this.prismaUserToEntity(createdUser);
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('User with this email already exists');
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Find user by OAuth provider and provider ID
   */
  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<User | null> {
    const prismaUser = await this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });
    return prismaUser ? this.prismaUserToEntity(prismaUser) : null;
  }

  /**
   * Create a new user from OAuth profile
   */
  async createOAuthUser(profile: {
    provider: string;
    providerId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    oauthAccessToken?: string;
    oauthRefreshToken?: string;
    oauthTokenExpiresAt?: Date;
  }): Promise<User> {
    try {
      const createdUser = await this.prisma.user.create({
        data: {
          id: generateUuidv7(),
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          provider: profile.provider,
          providerId: profile.providerId,
          oauthAccessToken: profile.oauthAccessToken
            ? EncryptionUtil.encrypt(
                profile.oauthAccessToken,
                this.getEncryptionKey(),
              )
            : undefined,
          oauthRefreshToken: profile.oauthRefreshToken
            ? EncryptionUtil.encrypt(
                profile.oauthRefreshToken,
                this.getEncryptionKey(),
              )
            : undefined,
          oauthTokenExpiresAt: profile.oauthTokenExpiresAt,
          role: 'REGULAR', // OAuth users default to REGULAR role
          isMasterAdmin: false,
        },
      });
      return this.prismaUserToEntity(createdUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'User with this email or OAuth account already exists',
          );
        }
      }
      throw error;
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    provider: string,
    providerId: string,
    oauthData?: {
      avatarUrl?: string;
      oauthAccessToken?: string;
      oauthRefreshToken?: string;
      oauthTokenExpiresAt?: Date;
    },
  ): Promise<User> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          provider: provider as any,
          providerId,
          avatarUrl: oauthData?.avatarUrl,
          oauthAccessToken: oauthData?.oauthAccessToken
            ? EncryptionUtil.encrypt(
                oauthData.oauthAccessToken,
                this.getEncryptionKey(),
              )
            : undefined,
          oauthRefreshToken: oauthData?.oauthRefreshToken
            ? EncryptionUtil.encrypt(
                oauthData.oauthRefreshToken,
                this.getEncryptionKey(),
              )
            : undefined,
          oauthTokenExpiresAt: oauthData?.oauthTokenExpiresAt,
        },
      });
      return this.prismaUserToEntity(updatedUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'OAuth account is already linked to another user',
          );
        }
      }
      throw error;
    }
  }

  // ===================================
  // OTP REPOSITORY METHODS
  // ===================================

  /**
   * Create OTP record in Otp table
   */
  async createOtp(
    userId: string,
    purpose: OtpPurpose,
    otpHash: string,
    expiresAt: Date,
    maxAttempts: number = 3,
  ): Promise<PrismaOtp> {
    // Clean up any existing OTPs for this user and purpose
    await this.prisma.otp.deleteMany({
      where: {
        userId,
        purpose,
      },
    });

    // Create new OTP record
    return await this.prisma.otp.create({
      data: {
        userId,
        purpose,
        otpHash,
        expiresAt,
        maxAttempts,
      },
    });
  }

  /**
   * Find valid OTP record (not used, not expired)
   */
  async findValidOtp(
    userId: string,
    purpose: OtpPurpose,
  ): Promise<PrismaOtp | null> {
    return await this.prisma.otp.findFirst({
      where: {
        userId,
        purpose,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  /**
   * Increment OTP attempt count
   */
  async incrementOtpAttempts(otpId: string): Promise<PrismaOtp> {
    return await this.prisma.otp.update({
      where: { id: otpId },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Mark OTP as used
   */
  async markOtpAsUsed(otpId: string): Promise<PrismaOtp> {
    return await this.prisma.otp.update({
      where: { id: otpId },
      data: {
        usedAt: new Date(),
      },
    });
  }

  /**
   * Mark user email as verified
   */
  async markEmailVerified(userId: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
      },
    });
    return this.prismaUserToEntity(updatedUser);
  }

  /**
   * Update OAuth metadata for a user after successful OAuth login
   */
  async updateOAuthMetadata(
    userId: string,
    oauthData: {
      avatarUrl?: string;
      oauthAccessToken?: string;
      oauthRefreshToken?: string;
      oauthTokenExpiresAt?: Date;
    },
  ): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: oauthData.avatarUrl,
        oauthAccessToken: oauthData.oauthAccessToken
          ? EncryptionUtil.encrypt(
              oauthData.oauthAccessToken,
              this.getEncryptionKey(),
            )
          : undefined,
        oauthRefreshToken: oauthData.oauthRefreshToken
          ? EncryptionUtil.encrypt(
              oauthData.oauthRefreshToken,
              this.getEncryptionKey(),
            )
          : undefined,
        oauthTokenExpiresAt: oauthData.oauthTokenExpiresAt,
      },
    });

    return this.prismaUserToEntity(updatedUser);
  }
}
