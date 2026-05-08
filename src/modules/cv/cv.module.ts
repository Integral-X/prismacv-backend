import { Module, Logger } from '@nestjs/common';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvImportService } from './cv-import.service';
import { CvFileImportService } from './cv-file-import.service';
import { CvExportService } from './cv-export.service';
import { CvMapper } from './mappers/cv.mapper';
import { PrismaService } from '@/config/prisma.service';

@Module({
  controllers: [CvController],
  providers: [
    CvService,
    CvImportService,
    CvFileImportService,
    CvExportService,
    CvMapper,
    PrismaService,
    Logger,
  ],
  exports: [CvService, CvImportService, CvExportService, CvFileImportService],
})
export class CvModule {}
