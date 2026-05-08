import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GrammarService } from '@/modules/grammar/grammar.service';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { GrammarContext } from '@/modules/grammar/dto/check-grammar.request.dto';
import { MetricsService } from '@/modules/metrics/metrics.service';

describe('GrammarService', () => {
  let service: GrammarService;
  let openAiProvider: { isAvailable: jest.Mock; checkGrammar: jest.Mock };
  let aiUsageService: { consumeQuota: jest.Mock };
  let metricsService: { recordAiCall: jest.Mock };

  beforeEach(async () => {
    openAiProvider = {
      isAvailable: jest.fn().mockReturnValue(true),
      checkGrammar: jest.fn().mockResolvedValue({
        score: 91,
        summary: 'Looks strong.',
        issues: [
          {
            type: 'grammar',
            message: 'Use present tense for consistency.',
            suggestion: 'Use present tense.',
            startIndex: 0,
            endIndex: 10,
            severity: 'warning',
          },
        ],
      }),
    };

    aiUsageService = {
      consumeQuota: jest.fn().mockResolvedValue(undefined),
    };
    metricsService = {
      recordAiCall: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrammarService,
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

    service = module.get<GrammarService>(GrammarService);
  });

  it('uses OpenAI grammar checker when enabled', async () => {
    const result = await service.check(
      {
        text: 'I were responsible for delivery.',
        context: GrammarContext.SUMMARY,
      },
      'user-1',
    );

    expect(openAiProvider.checkGrammar).toHaveBeenCalled();
    expect(aiUsageService.consumeQuota).toHaveBeenCalled();
    expect(result.score).toBe(91);
    expect(result.issues[0].message).toContain('present tense');
  });

  it('falls back to heuristic rules when OpenAI fails', async () => {
    openAiProvider.checkGrammar.mockRejectedValueOnce(new Error('boom'));

    const result = await service.check(
      {
        text: 'I was responsible for many tasks.',
        context: GrammarContext.SUMMARY,
      },
      'user-1',
    );

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.summary).toContain('issue');
  });
});
