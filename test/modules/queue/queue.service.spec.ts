import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueueService } from '@/modules/queue/queue.service';
import { CvService } from '@/modules/cv/cv.service';
import { CvExportService } from '@/modules/cv/cv-export.service';
import { AiService } from '@/modules/ai/ai.service';

describe('QueueService', () => {
  let service: QueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'QUEUE_ENABLED') return 'false';
              if (key === 'QUEUE_NAME') return 'prismacv-jobs';
              return undefined;
            }),
          },
        },
        { provide: CvService, useValue: {} },
        { provide: CvExportService, useValue: {} },
        { provide: AiService, useValue: {} },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    service.onModuleInit();
  });

  it('rejects enqueue requests when queue is disabled', async () => {
    await expect(service.enqueuePdfExport('user-1', 'cv-1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
