import { Module, Logger } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { CvModule } from '@/modules/cv/cv.module';
import { PrismaService } from '@/config/prisma.service';

@Module({
  imports: [CvModule],
  controllers: [AiController],
  providers: [AiService, PrismaService, Logger],
  exports: [AiService],
})
export class AiModule {}
