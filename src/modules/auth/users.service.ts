import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { User as PrismaUser, Otp as PrismaOtp, OtpPurpose } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { User, UserRole } from './entities/user.entity';
import { generateUuidv7 } from '@/shared/utils/uuid.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    user.refreshToken = prismaUser.refreshToken;
    user.emailVerified = prismaUser.emailVerified;
    user.provider = prismaUser.provider || undefined;
    user.providerId = prismaUser.providerId || undefined;
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
        refreshToken: userEntity.refreshToken,
        provider: userEntity.provider as any,
        providerId: userEntity.providerId,
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
  }): Promise<User> {
    try {
      const createdUser = await this.prisma.user.create({
        data: {
          id: generateUuidv7(),
          email: profile.email,
          name: profile.name,
          provider: profile.provider,
          providerId: profile.providerId,
          role: 'REGULAR', // OAuth users default to REGULAR role
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
  ): Promise<User> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          provider: provider as any,
          providerId,
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
   * Clean up expired OTPs (maintenance method)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
