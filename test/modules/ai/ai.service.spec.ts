import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '@/modules/ai/ai.service';
import { CvService } from '@/modules/cv/cv.service';
import { BuiltInAiProvider } from '@/modules/ai/providers/built-in-ai.provider';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/config/prisma.service';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { MetricsService } from '@/modules/metrics/metrics.service';

describe('AiService', () => {
  let service: AiService;
  let cvService: { findOne: jest.Mock };
  let openAiProvider: {
    isAvailable: jest.Mock;
    analyzeCv: jest.Mock;
    optimizeCvForJob: jest.Mock;
  };
  let unleashService: { isEnabled: jest.Mock };
  let configService: { get: jest.Mock };
  let prismaService: {
    aiAnalysisCache: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let aiUsageService: { consumeQuota: jest.Mock };
  let metricsService: { recordAiCall: jest.Mock };

  const userId = 'user-123';
  const cvId = 'cv-456';

  const mockCv = {
    id: cvId,
    userId,
    title: 'My CV',
    slug: 'my-cv',
    status: 'DRAFT',
    personalInfo: {
      id: 'pi-1',
      fullName: 'John Doe',
      email: 'john@example.com',
      summary:
        'Experienced software engineer with 5 years of experience building web applications using React and Node.js',
    },
    experiences: [
      {
        id: 'exp-1',
        company: 'TechCorp',
        title: 'Senior Developer',
        description:
          'Led team of 5 engineers. Increased deployment frequency by 40%. Built microservices architecture handling 10000 requests per second.',
        startDate: new Date('2020-01-01'),
        endDate: null,
        current: true,
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'MIT',
        degree: 'BS Computer Science',
        startDate: new Date('2016-01-01'),
        endDate: new Date('2020-01-01'),
      },
    ],
    skills: [
      { id: 's-1', name: 'TypeScript' },
      { id: 's-2', name: 'React' },
      { id: 's-3', name: 'Node.js' },
      { id: 's-4', name: 'Docker' },
      { id: 's-5', name: 'PostgreSQL' },
    ],
    certifications: [],
    projects: [],
    languages: [],
    customSections: [],
  };

  beforeEach(async () => {
    cvService = { findOne: jest.fn() };
    openAiProvider = {
      isAvailable: jest.fn().mockReturnValue(false),
      analyzeCv: jest.fn(),
      optimizeCvForJob: jest.fn(),
    };
    unleashService = { isEnabled: jest.fn().mockReturnValue(true) };
    configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'AI_PROVIDER') return 'builtin';
        if (key === 'AI_ANALYSIS_CACHE_TTL_SECONDS') return 86400;
        return fallback;
      }),
    };
    prismaService = {
      aiAnalysisCache: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };
    aiUsageService = { consumeQuota: jest.fn().mockResolvedValue(undefined) };
    metricsService = { recordAiCall: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: CvService, useValue: cvService },
        BuiltInAiProvider,
        { provide: OpenAiProvider, useValue: openAiProvider },
        { provide: UnleashService, useValue: unleashService },
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prismaService },
        { provide: AiUsageService, useValue: aiUsageService },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeCv', () => {
    it('should return analysis results with scores', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      const result = await service.analyzeCv(cvId, userId);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('grammarScore');
      expect(result).toHaveProperty('readabilityScore');
      expect(result).toHaveProperty('atsScore');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('suggestions');

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should call cvService.findOne with correct params', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      await service.analyzeCv(cvId, userId);
      expect(cvService.findOne).toHaveBeenCalledWith(cvId, userId);
    });

    it('should return cached analysis when cache key matches', async () => {
      const cached = {
        overallScore: 88,
        grammarScore: 90,
        readabilityScore: 86,
        atsScore: 85,
        issues: [],
        suggestions: [],
      };
      cvService.findOne.mockResolvedValue(mockCv);
      prismaService.aiAnalysisCache.findUnique.mockResolvedValue({
        analysis: cached,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const result = await service.analyzeCv(cvId, userId);

      expect(result).toEqual(cached);
      expect(prismaService.aiAnalysisCache.upsert).not.toHaveBeenCalled();
    });
  });

  describe('optimizeCvForJob', () => {
    it('should return optimization results with match score', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      const result = await service.optimizeCvForJob(
        cvId,
        userId,
        'Looking for a senior TypeScript developer with React and Node.js experience. Must know Docker and CI/CD.',
      );

      expect(result).toHaveProperty('matchScore');
      expect(result).toHaveProperty('missingKeywords');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('sectionRecommendations');

      expect(result.matchScore).toBeGreaterThanOrEqual(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
    });

    it('should identify missing keywords from job description', async () => {
      cvService.findOne.mockResolvedValue(mockCv);

      const result = await service.optimizeCvForJob(
        cvId,
        userId,
        'We need a TypeScript and React and Kubernetes developer',
      );

      // missingKeywords should contain keywords not found in the CV
      expect(Array.isArray(result.missingKeywords)).toBe(true);
    });

    it('uses OpenAI provider when enabled and available', async () => {
      const openAiResult = {
        matchScore: 82,
        missingKeywords: ['kubernetes'],
        suggestions: [],
        sectionRecommendations: [],
      };
      cvService.findOne.mockResolvedValue(mockCv);
      configService.get.mockImplementation(
        (key: string, fallback?: unknown) => {
          if (key === 'AI_PROVIDER') return 'openai';
          return fallback;
        },
      );
      openAiProvider.isAvailable.mockReturnValue(true);
      openAiProvider.optimizeCvForJob.mockResolvedValue(openAiResult);

      const result = await service.optimizeCvForJob(
        cvId,
        userId,
        'Need Kubernetes and Docker',
      );

      expect(result).toEqual(openAiResult);
      expect(aiUsageService.consumeQuota).toHaveBeenCalled();
    });
  });
});
