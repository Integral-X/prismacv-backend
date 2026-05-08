import { Module } from '@nestjs/common';
import { AiModule } from '@/modules/ai/ai.module';
import { CvModule } from '@/modules/cv/cv.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  imports: [AiModule, CvModule, BillingModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
