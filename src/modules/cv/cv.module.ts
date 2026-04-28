import { Module, Logger } from '@nestjs/common';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvImportService } from './cv-import.service';
import { CvMapper } from './mappers/cv.mapper';
import { PrismaService } from '@/config/prisma.service';

@Module({
  controllers: [CvController],
  providers: [CvService, CvImportService, CvMapper, PrismaService, Logger],
  exports: [CvService, CvImportService],
})
export class CvModule {}
