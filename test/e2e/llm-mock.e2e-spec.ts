import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { CvService } from '@/modules/cv/cv.service';
import { PrismaService } from '@/config/prisma.service';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { RequiresPlanGuard } from '@/modules/billing/requires-plan.guard';

describe('LLM mocked flows (e2e)', () => {
  let app: INestApplication;
  const cvId = '11111111-1111-1111-1111-111111111111';

  const mockUser = {
    id: 'user-e2e',
    email: 'e2e@example.com',
    role: 'REGULAR',
    isMasterAdmin: false,
  };

  const mockOpenAiProvider = {
    isAvailable: jest.fn().mockReturnValue(true),
    analyzeCv: jest.fn().mockResolvedValue({
      overallScore: 89,
      grammarScore: 91,
      readabilityScore: 87,
      atsScore: 86,
      issues: [],
      suggestions: [],
    }),
    optimizeCvForJob: jest.fn().mockResolvedValue({
      matchScore: 84,
      missingKeywords: ['kubernetes'],
      suggestions: [],
      sectionRecommendations: [],
    }),
    checkGrammar: jest.fn().mockResolvedValue({
      score: 92,
      summary: 'LLM grammar summary',
      issues: [
        {
          type: 'grammar',
          message: 'Fix tense',
          suggestion: 'Use past tense.',
          startIndex: 0,
          endIndex: 5,
          severity: 'warning',
        },
      ],
    }),
    generateAtsSuggestions: jest
      .fn()
      .mockResolvedValue(['Use Kubernetes in your experience bullets.']),
    generateCoverLetter: jest
      .fn()
      .mockResolvedValue('Generated cover letter from mocked LLM.'),
  };

  const mockCvService = {
    findOne: jest.fn().mockResolvedValue({
      id: cvId,
      personalInfo: {
        fullName: 'E2E User',
        summary: 'Backend engineer focused on reliability.',
      },
      experiences: [
        {
          title: 'Engineer',
          company: 'ExampleCo',
          description: 'Built resilient APIs and reduced incident rate.',
          startDate: new Date('2022-01-01'),
          endDate: null,
        },
      ],
      education: [],
      skills: [{ name: 'TypeScript', level: 'INTERMEDIATE' }],
      certifications: [],
      projects: [],
    }),
  };

  beforeAll(async () => {
    process.env.AI_PROVIDER = 'openai';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtUserAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RequiresPlanGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(OpenAiProvider)
      .useValue(mockOpenAiProvider)
      .overrideProvider(CvService)
      .useValue(mockCvService)
      .overrideProvider(PrismaService)
      .useValue({
        aiAnalysisCache: {
          findUnique: jest.fn().mockResolvedValue(null),
          upsert: jest.fn().mockResolvedValue(undefined),
        },
      })
      .overrideProvider(AiUsageService)
      .useValue({
        consumeQuota: jest.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(UnleashService)
      .useValue({
        isEnabled: jest.fn().mockReturnValue(true),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.AI_PROVIDER;
  });

  it('POST /ai/cv/:id/analyze returns mocked LLM analysis', async () => {
    await request(app.getHttpServer())
      .post(`/ai/cv/${cvId}/analyze`)
      .expect(200);

    expect(mockOpenAiProvider.analyzeCv).toHaveBeenCalled();
  });

  it('POST /ai/cv/:id/optimize returns mocked LLM optimization', async () => {
    const response = await request(app.getHttpServer())
      .post(`/ai/cv/${cvId}/optimize`)
      .send({
        jobDescription: 'Need Kubernetes, TypeScript, and API design.',
      })
      .expect(200);

    expect(response.body).toHaveProperty('matchScore');
    expect(mockOpenAiProvider.optimizeCvForJob).toHaveBeenCalled();
  });

  it('POST /grammar/check uses mocked LLM grammar checker', async () => {
    const response = await request(app.getHttpServer())
      .post('/grammar/check')
      .send({ text: 'I were responsible for api design', context: 'summary' })
      .expect(200);

    expect(response.body.summary).toContain('LLM grammar summary');
    expect(mockOpenAiProvider.checkGrammar).toHaveBeenCalled();
  });

  it('POST /cover-letters/generate uses mocked LLM generator', async () => {
    const response = await request(app.getHttpServer())
      .post('/cover-letters/generate')
      .send({
        cvId,
        jobTitle: 'Platform Engineer',
        company: 'Globex',
      })
      .expect(200);

    expect(response.body.content).toContain('mocked LLM');
    expect(mockOpenAiProvider.generateCoverLetter).toHaveBeenCalled();
  });
});
