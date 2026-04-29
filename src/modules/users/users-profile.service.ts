import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { Prisma } from '@prisma/client';
import { AvatarStorageService } from './avatar-storage.service';
import { UpdateProfileRequestDto } from './dto/request/update-profile.request.dto';
import { UserProfileResponseDto } from './dto/response/user-profile.response.dto';

@Injectable()
export class UsersProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avatarStorage: AvatarStorageService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileRequestDto,
  ): Promise<UserProfileResponseDto> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        },
      });

      return this.toResponse(user);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  async deleteAccount(userId: string): Promise<void> {
    try {
      await this.avatarStorage.delete(userId);
      await this.prisma.user.delete({
        where: { id: userId },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw err;
    }
  }

  private toResponse(user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerified: boolean;
    avatarUrl: string | null;
    provider: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserProfileResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
