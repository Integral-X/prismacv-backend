import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/config/prisma.service';
import { User as PrismaUser } from '@prisma/client';
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

    const key = this.getEncryptionKey();
    user.oauthAccessToken = prismaUser.oauthAccessToken
      ? EncryptionUtil.decrypt(prismaUser.oauthAccessToken, key)
      : undefined;
    user.oauthRefreshToken = prismaUser.oauthRefreshToken
      ? EncryptionUtil.decrypt(prismaUser.oauthRefreshToken, key)
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
    const key = this.getEncryptionKey();

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
          ? EncryptionUtil.encrypt(userEntity.oauthAccessToken, key)
          : undefined,
        oauthRefreshToken: userEntity.oauthRefreshToken
          ? EncryptionUtil.encrypt(userEntity.oauthRefreshToken, key)
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
      const key = this.getEncryptionKey();

      const createdUser = await this.prisma.user.create({
        data: {
          id: generateUuidv7(),
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          provider: profile.provider,
          providerId: profile.providerId,
          oauthAccessToken: profile.oauthAccessToken
            ? EncryptionUtil.encrypt(profile.oauthAccessToken, key)
            : undefined,
          oauthRefreshToken: profile.oauthRefreshToken
            ? EncryptionUtil.encrypt(profile.oauthRefreshToken, key)
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
      const key = this.getEncryptionKey();

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          provider: provider as any,
          providerId,
          avatarUrl: oauthData?.avatarUrl,
          oauthAccessToken: oauthData?.oauthAccessToken
            ? EncryptionUtil.encrypt(oauthData.oauthAccessToken, key)
            : undefined,
          oauthRefreshToken: oauthData?.oauthRefreshToken
            ? EncryptionUtil.encrypt(oauthData.oauthRefreshToken, key)
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

  /**
   * Save OTP code and expiration for a user
   * Resets attempt counter when generating new OTP
   */
  async saveOtp(
    userId: string,
    otpCode: string,
    expiresAt: Date,
  ): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
      },
    });
    return this.prismaUserToEntity(updatedUser);
  }

  /**
   * Clear OTP code for a user
   * Also resets attempt counter
   */
  async clearOtp(userId: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });
    return this.prismaUserToEntity(updatedUser);
  }

  /**
   * Mark user email as verified
   * Clears OTP data and resets attempt counter
   */
  async markEmailVerified(userId: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });
    return this.prismaUserToEntity(updatedUser);
  }

  /**
   * Increment OTP verification attempts for a user
   */
  async incrementOtpAttempts(userId: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpAttempts: {
          increment: 1,
        },
      },
    });
    return this.prismaUserToEntity(updatedUser);
  }

  /**
   * Clear OTP and lock it (used when max attempts exceeded)
   * Clears OTP code but keeps attempt count for logging purposes
   */
  async lockOtp(userId: string): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpCode: null,
        otpExpiresAt: null,
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
    const key = this.getEncryptionKey();

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: oauthData.avatarUrl,
        oauthAccessToken: oauthData.oauthAccessToken
          ? EncryptionUtil.encrypt(oauthData.oauthAccessToken, key)
          : undefined,
        oauthRefreshToken: oauthData.oauthRefreshToken
          ? EncryptionUtil.encrypt(oauthData.oauthRefreshToken, key)
          : undefined,
        oauthTokenExpiresAt: oauthData.oauthTokenExpiresAt,
      },
    });

    return this.prismaUserToEntity(updatedUser);
  }
}
