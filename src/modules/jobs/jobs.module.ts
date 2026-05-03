import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsMapper } from './jobs.mapper';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsMapper],
  exports: [JobsService],
})
export class JobsModule {}
