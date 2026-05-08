import { Module } from '@nestjs/common';
import { CoverLettersController } from './cover-letters.controller';
import { CoverLettersService } from './cover-letters.service';
import { CvModule } from '@/modules/cv/cv.module';
import { AiModule } from '@/modules/ai/ai.module';
import { UnleashModule } from '@/modules/unleash/unleash.module';

@Module({
  imports: [CvModule, AiModule, UnleashModule],
  controllers: [CoverLettersController],
  providers: [CoverLettersService],
  exports: [CoverLettersService],
})
export class CoverLettersModule {}
