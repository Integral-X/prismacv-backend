import { Module, Logger } from '@nestjs/common';
import { InterviewController } from './interview.controller';
import { InterviewService } from './interview.service';
import { PrismaService } from '@/config/prisma.service';

@Module({
  controllers: [InterviewController],
  providers: [InterviewService, PrismaService, Logger],
  exports: [InterviewService],
})
export class InterviewModule {}
