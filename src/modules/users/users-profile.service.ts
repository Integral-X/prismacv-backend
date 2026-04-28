import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { UpdateProfileRequestDto } from './dto/request/update-profile.request.dto';
import { UserProfileResponseDto } from './dto/response/user-profile.response.dto';

@Injectable()
export class UsersProfileService {
  constructor(private readonly prisma: PrismaService) {}

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
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });

    return this.toResponse(user);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId },
    });
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
