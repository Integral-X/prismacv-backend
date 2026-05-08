import { Module } from '@nestjs/common';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';
import { AiModule } from '@/modules/ai/ai.module';
import { UnleashModule } from '@/modules/unleash/unleash.module';

@Module({
  imports: [AiModule, UnleashModule],
  controllers: [GrammarController],
  providers: [GrammarService],
  exports: [GrammarService],
})
export class GrammarModule {}
