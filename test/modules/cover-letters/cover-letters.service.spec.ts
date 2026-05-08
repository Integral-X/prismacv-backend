import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CoverLettersService } from '@/modules/cover-letters/cover-letters.service';
import { PrismaService } from '@/config/prisma.service';
import { CvService } from '@/modules/cv/cv.service';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { MetricsService } from '@/modules/metrics/metrics.service';
import { AiUsageFeature } from '@prisma/client';

describe('CoverLettersService', () => {
  let service: CoverLettersService;
  let cvService: { findOne: jest.Mock };
  let openAiProvider: {
    isAvailable: jest.Mock;
    generateCoverLetter: jest.Mock;
  };
  let aiUsageService: { consumeQuota: jest.Mock; refundQuota: jest.Mock };
  let metricsService: { recordAiCall: jest.Mock };

  const mockCv = {
    id: 'cv-1',
    personalInfo: {
      fullName: 'Jane Doe',
      summary: 'Senior engineer focused on scalable backend systems.',
    },
    experiences: [
      {
        title: 'Senior Engineer',
        company: 'Acme',
        description: 'Led platform modernization and reduced latency by 30%.',
        startDate: new Date('2021-01-01'),
        endDate: null,
      },
    ],
    skills: [
      { name: 'TypeScript' },
      { name: 'NestJS' },
      { name: 'PostgreSQL' },
    ],
    certifications: [],
  };

  beforeEach(async () => {
    cvService = { findOne: jest.fn().mockResolvedValue(mockCv) };
    openAiProvider = {
      isAvailable: jest.fn().mockReturnValue(true),
      generateCoverLetter: jest
        .fn()
        .mockResolvedValue('Generated with OpenAI provider.'),
    };
    aiUsageService = {
      consumeQuota: jest.fn().mockResolvedValue(undefined),
      refundQuota: jest.fn().mockResolvedValue(undefined),
    };
    metricsService = {
      recordAiCall: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoverLettersService,
        { provide: PrismaService, useValue: {} },
        { provide: CvService, useValue: cvService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              if (key === 'AI_PROVIDER') return 'openai';
              return fallback;
            }),
          },
        },
        { provide: OpenAiProvider, useValue: openAiProvider },
        { provide: AiUsageService, useValue: aiUsageService },
        { provide: UnleashService, useValue: { isEnabled: () => true } },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get<CoverLettersService>(CoverLettersService);
  });

  it('uses OpenAI generation when enabled', async () => {
    const result = await service.generate('user-1', {
      cvId: 'cv-1',
      jobTitle: 'Staff Backend Engineer',
      company: 'Globex',
      jobDescription: 'Build reliable distributed systems',
      tone: 'professional',
      template: 'impact_story',
    });

    expect(openAiProvider.generateCoverLetter).toHaveBeenCalled();
    expect(aiUsageService.consumeQuota).toHaveBeenCalled();
    expect(aiUsageService.refundQuota).not.toHaveBeenCalled();
    expect(result.content).toContain('OpenAI provider');
    expect(result.highlights).toContain('Template: Impact Story');
  });

  it('falls back to template generation when OpenAI errors', async () => {
    openAiProvider.generateCoverLetter.mockRejectedValueOnce(new Error('boom'));

    const result = await service.generate('user-1', {
      cvId: 'cv-1',
      jobTitle: 'Staff Backend Engineer',
      company: 'Globex',
      tone: 'professional',
    });

    expect(aiUsageService.refundQuota).toHaveBeenCalledWith(
      'user-1',
      AiUsageFeature.COVER_LETTER_GENERATE,
    );
    expect(result.content).toContain('Dear Hiring Manager');
    expect(result.highlights.length).toBeGreaterThan(0);
  });

  it('does not refund when quota consumption itself fails', async () => {
    aiUsageService.consumeQuota.mockRejectedValueOnce(
      new Error('quota exceeded'),
    );

    const result = await service.generate('user-1', {
      cvId: 'cv-1',
      jobTitle: 'Staff Backend Engineer',
      company: 'Globex',
      tone: 'professional',
    });

    expect(openAiProvider.generateCoverLetter).not.toHaveBeenCalled();
    expect(aiUsageService.refundQuota).not.toHaveBeenCalled();
    expect(result.content).toContain('Dear Hiring Manager');
  });
});
