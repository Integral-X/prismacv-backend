import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CvModule } from '@/modules/cv/cv.module';
import { UnleashModule } from '@/modules/unleash/unleash.module';
import { BuiltInAiProvider } from './providers/built-in-ai.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AiUsageService } from './ai-usage.service';

@Module({
  imports: [CvModule, UnleashModule],
  controllers: [AiController],
  providers: [AiService, BuiltInAiProvider, OpenAiProvider, AiUsageService],
  exports: [AiService, BuiltInAiProvider, OpenAiProvider, AiUsageService],
})
export class AiModule {}
