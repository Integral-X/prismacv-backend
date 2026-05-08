import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CvFileImportService } from '@/modules/cv/cv-file-import.service';
import { CvService } from '@/modules/cv/cv.service';

describe('CvFileImportService', () => {
  let service: CvFileImportService;
  let cvService: {
    create: jest.Mock;
    upsertPersonalInfo: jest.Mock;
    bulkUpsertExperiences: jest.Mock;
    bulkUpsertEducation: jest.Mock;
    bulkUpsertSkills: jest.Mock;
    bulkUpsertProjects: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    cvService = {
      create: jest.fn().mockResolvedValue({ id: 'cv-1' }),
      upsertPersonalInfo: jest.fn().mockResolvedValue({}),
      bulkUpsertExperiences: jest.fn().mockResolvedValue([]),
      bulkUpsertEducation: jest.fn().mockResolvedValue([]),
      bulkUpsertSkills: jest.fn().mockResolvedValue([]),
      bulkUpsertProjects: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 'cv-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CvFileImportService,
        { provide: CvService, useValue: cvService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              if (key === 'OPENAI_API_KEY') return undefined;
              if (key === 'AI_MODEL') return 'gpt-4o-mini';
              return fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CvFileImportService>(CvFileImportService);
  });

  it('imports structured sections from anchored resume text', async () => {
    const resumeText = `
John Doe
john@example.com
Experience
Senior Engineer at Acme Corp
Jan 2021 - Present
Led API modernization.

Education
BS Computer Science - Example University
2016 - 2020

Skills
TypeScript, NestJS, PostgreSQL

Projects
PrismaCV - Built resume workflow automation.
https://example.com/prismacv
`.trim();

    jest.spyOn(service, 'extractPlainText').mockResolvedValue(resumeText);

    const file = {
      originalname: 'john-doe-resume.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('fake'),
    } as Express.Multer.File;

    await service.importFromFile('user-1', file);

    expect(cvService.upsertPersonalInfo).toHaveBeenCalled();
    expect(cvService.bulkUpsertExperiences).toHaveBeenCalled();
    expect(cvService.bulkUpsertEducation).toHaveBeenCalled();
    expect(cvService.bulkUpsertSkills).toHaveBeenCalled();
    expect(cvService.bulkUpsertProjects).toHaveBeenCalled();
  });

  it('throws when extracted text is too short', async () => {
    jest.spyOn(service, 'extractPlainText').mockResolvedValue('too short');

    const file = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('fake'),
    } as Express.Multer.File;

    await expect(service.importFromFile('user-1', file)).rejects.toThrow(
      BadRequestException,
    );
  });
});
