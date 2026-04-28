import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersProfileService } from './users-profile.service';
import { AvatarStorageService } from './avatar-storage.service';
import { PrismaService } from '@/config/prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersProfileService, AvatarStorageService, PrismaService],
  exports: [UsersProfileService, AvatarStorageService],
})
export class UsersModule {}
