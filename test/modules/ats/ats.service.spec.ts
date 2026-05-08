import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiUsageFeature } from '@prisma/client';
import { AtsService } from '@/modules/ats/ats.service';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { MetricsService } from '@/modules/metrics/metrics.service';

describe('AtsService', () => {
  let service: AtsService;
  let aiProvider: string;
  let openAiProvider: {
    isAvailable: jest.Mock;
    generateAtsSuggestions: jest.Mock;
  };
  let aiUsageService: { consumeQuota: jest.Mock };
  let unleashService: { isEnabled: jest.Mock };
  let metricsService: { recordAiCall: jest.Mock };

  const input = {
    cvText:
      'Backend engineer with Node.js and PostgreSQL experience. Built APIs and improved reliability by 30%.',
    jobDescription:
      'We are looking for a TypeScript backend engineer with NestJS and Kubernetes experience to build scalable APIs.',
    skills: ['Node.js', 'PostgreSQL'],
  };

  beforeEach(async () => {
    aiProvider = 'builtin';
    openAiProvider = {
      isAvailable: jest.fn().mockReturnValue(true),
      generateAtsSuggestions: jest
        .fn()
        .mockResolvedValue([
          'Add NestJS and Kubernetes in your experience section.',
        ]),
    };
    aiUsageService = {
      consumeQuota: jest.fn().mockResolvedValue(undefined),
    };
    unleashService = {
      isEnabled: jest.fn().mockReturnValue(true),
    };
    metricsService = {
      recordAiCall: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: unknown) => {
              if (key === 'AI_PROVIDER') return aiProvider;
              return fallback;
            }),
          },
        },
        { provide: OpenAiProvider, useValue: openAiProvider },
        { provide: AiUsageService, useValue: aiUsageService },
        { provide: UnleashService, useValue: unleashService },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get<AtsService>(AtsService);
  });

  it('returns heuristic ATS scoring output when LLM mode is disabled', async () => {
    const result = await service.analyze(input, 'user-1');

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.keywordMatches.length).toBeGreaterThan(0);
    expect(result.sectionScores.length).toBeGreaterThan(0);
    expect(openAiProvider.generateAtsSuggestions).not.toHaveBeenCalled();
  });

  it('merges OpenAI suggestions when LLM mode is enabled', async () => {
    aiProvider = 'openai';
    openAiProvider.isAvailable.mockReturnValue(true);

    const result = await service.analyze(input, 'user-2');

    expect(aiUsageService.consumeQuota).toHaveBeenCalledWith(
      'user-2',
      AiUsageFeature.ATS_SCORE,
    );
    expect(openAiProvider.generateAtsSuggestions).toHaveBeenCalled();
    expect(result.suggestions).toContain(
      'Add NestJS and Kubernetes in your experience section.',
    );
  });

  it('falls back to heuristic suggestions when OpenAI request fails', async () => {
    aiProvider = 'openai';
    openAiProvider.generateAtsSuggestions.mockRejectedValueOnce(
      new Error('OpenAI unavailable'),
    );

    const result = await service.analyze(input, 'user-3');

    expect(aiUsageService.consumeQuota).toHaveBeenCalledWith(
      'user-3',
      AiUsageFeature.ATS_SCORE,
    );
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
