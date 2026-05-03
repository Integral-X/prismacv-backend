import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CvModule } from '@/modules/cv/cv.module';
import { BuiltInAiProvider } from './providers/built-in-ai.provider';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';

@Module({
  imports: [CvModule],
  controllers: [AiController],
  providers: [
    AiService,
    { provide: AI_PROVIDER, useClass: BuiltInAiProvider },
  ],
  exports: [AiService],
})
export class AiModule {}
