import { Module, Logger } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsMapper } from './jobs.mapper';
import { PrismaService } from '@/config/prisma.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsMapper, PrismaService, Logger],
  exports: [JobsService],
})
export class JobsModule {}
