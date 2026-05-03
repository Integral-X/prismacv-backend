import { Module, Logger } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { PrismaService } from '@/config/prisma.service';

@Module({
  controllers: [SkillsController],
  providers: [SkillsService, PrismaService, Logger],
  exports: [SkillsService],
})
export class SkillsModule {}
