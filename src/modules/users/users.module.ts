import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersProfileService } from './users-profile.service';
import { PrismaService } from '@/config/prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersProfileService, PrismaService],
  exports: [UsersProfileService],
})
export class UsersModule {}
