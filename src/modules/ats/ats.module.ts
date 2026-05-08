import { Module } from '@nestjs/common';
import { AtsController } from './ats.controller';
import { AtsService } from './ats.service';
import { AiModule } from '@/modules/ai/ai.module';
import { UnleashModule } from '@/modules/unleash/unleash.module';

@Module({
  imports: [AiModule, UnleashModule],
  controllers: [AtsController],
  providers: [AtsService],
  exports: [AtsService],
})
export class AtsModule {}
