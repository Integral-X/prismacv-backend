import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { CvService } from '@/modules/cv/cv.service';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { PrismaService } from '@/config/prisma.service';
import { generateUuidv7 } from '@/shared/utils/uuid.util';
import { AiUsageFeature, Prisma } from '@prisma/client';
import type {
  AiProvider,
  CvContentForAnalysis,
  CvAnalysisResult,
  CvOptimizationResult,
} from './interfaces/ai-provider.interface';
import { BuiltInAiProvider } from './providers/built-in-ai.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AI_LLM_ANALYSIS_FLAG } from './ai-feature-flags';
import { AiUsageService } from './ai-usage.service';
import { MetricsService } from '@/modules/metrics/metrics.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly cvService: CvService,
    private readonly configService: ConfigService,
    private readonly unleashService: UnleashService,
    private readonly prisma: PrismaService,
    private readonly aiUsageService: AiUsageService,
    private readonly metricsService: MetricsService,
    private readonly builtInProvider: BuiltInAiProvider,
    private readonly openAiProvider: OpenAiProvider,
  ) {}

  async analyzeCv(cvId: string, userId: string): Promise<CvAnalysisResult> {
    const cv = await this.cvService.findOne(cvId, userId);
    const content = this.mapCvToAnalysisContent(cv);
    const provider = this.resolveProvider(userId);
    const providerName = provider.constructor.name;
    const contentHash = this.hashAnalysisContent(content);

    const cached = await this.prisma.aiAnalysisCache.findUnique({
      where: {
        cvId_contentHash_provider: {
          cvId,
          contentHash,
          provider: providerName,
        },
      },
    });

    if (cached && cached.expiresAt > new Date()) {
      return cached.analysis as unknown as CvAnalysisResult;
    }

    if (this.isOpenAiProvider(provider)) {
      await this.aiUsageService.consumeQuota(userId, AiUsageFeature.CV_ANALYZE);
    }

    const startedAt = Date.now();
    let result: CvAnalysisResult;
    try {
      result = await provider.analyzeCv(content);
      this.metricsService.recordAiCall({
        feature: 'cv_analyze',
        provider: providerName,
        status: 'success',
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      this.metricsService.recordAiCall({
        feature: 'cv_analyze',
        provider: providerName,
        status: 'error',
        durationMs: Date.now() - startedAt,
      });

      if (this.isOpenAiProvider(provider)) {
        await this.refundQuotaOnProviderFailure(
          userId,
          AiUsageFeature.CV_ANALYZE,
          providerName,
        );
      }

      throw error;
    }

    if (this.isOpenAiProvider(provider)) {
      const ttlSeconds =
        this.configService.get<number>(
          'AI_ANALYSIS_CACHE_TTL_SECONDS',
          86400,
        ) ?? 86400;
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      await this.prisma.aiAnalysisCache.upsert({
        where: {
          cvId_contentHash_provider: {
            cvId,
            contentHash,
            provider: providerName,
          },
        },
        update: {
          analysis: result as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
        create: {
          id: generateUuidv7(),
          userId,
          cvId,
          contentHash,
          provider: providerName,
          analysis: result as unknown as Prisma.InputJsonValue,
          expiresAt,
        },
      });
    }

    return result;
  }

  async optimizeCvForJob(
    cvId: string,
    userId: string,
    jobDescription: string,
  ): Promise<CvOptimizationResult> {
    const cv = await this.cvService.findOne(cvId, userId);
    const content = this.mapCvToAnalysisContent(cv);
    const provider = this.resolveProvider(userId);
    const providerName = provider.constructor.name;

    if (this.isOpenAiProvider(provider)) {
      await this.aiUsageService.consumeQuota(
        userId,
        AiUsageFeature.CV_OPTIMIZE,
      );
    }

    const startedAt = Date.now();
    try {
      const result = await provider.optimizeCvForJob(content, jobDescription);
      this.metricsService.recordAiCall({
        feature: 'cv_optimize',
        provider: providerName,
        status: 'success',
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      this.metricsService.recordAiCall({
        feature: 'cv_optimize',
        provider: providerName,
        status: 'error',
        durationMs: Date.now() - startedAt,
      });

      if (this.isOpenAiProvider(provider)) {
        await this.refundQuotaOnProviderFailure(
          userId,
          AiUsageFeature.CV_OPTIMIZE,
          providerName,
        );
      }

      throw error;
    }
  }

  private async refundQuotaOnProviderFailure(
    userId: string,
    feature: AiUsageFeature,
    providerName: string,
  ): Promise<void> {
    try {
      await this.aiUsageService.refundQuota(userId, feature);
    } catch (refundError) {
      const message =
        refundError instanceof Error
          ? refundError.message
          : String(refundError);
      this.logger.error(
        `Failed to refund AI quota for provider=${providerName}, feature=${feature.toLowerCase()}, userId=${userId}: ${message}`,
      );
    }
  }

  private resolveProvider(userId: string): AiProvider {
    const provider = this.configService
      .get<string>('AI_PROVIDER', 'builtin')
      ?.trim()
      .toLowerCase();

    if (provider !== 'openai') {
      return this.builtInProvider;
    }

    if (!this.openAiProvider.isAvailable()) {
      this.logger.warn(
        'AI_PROVIDER is set to openai, but OPENAI_API_KEY is missing. Falling back to built-in provider.',
      );
      return this.builtInProvider;
    }

    const llmEnabled = this.unleashService.isEnabled(AI_LLM_ANALYSIS_FLAG, {
      userId,
    });

    return llmEnabled ? this.openAiProvider : this.builtInProvider;
  }

  private isOpenAiProvider(provider: AiProvider): boolean {
    return provider === this.openAiProvider;
  }

  private hashAnalysisContent(content: CvContentForAnalysis): string {
    return createHash('sha256').update(JSON.stringify(content)).digest('hex');
  }

  private mapCvToAnalysisContent(cv: any): CvContentForAnalysis {
    return {
      personalInfo: cv.personalInfo
        ? {
            fullName: cv.personalInfo.fullName ?? undefined,
            email: cv.personalInfo.email ?? undefined,
            summary: cv.personalInfo.summary ?? undefined,
          }
        : undefined,
      experiences: (cv.experiences ?? []).map((e: any) => ({
        title: e.title,
        company: e.company,
        description: e.description ?? undefined,
        startDate: e.startDate?.toISOString?.() ?? e.startDate,
        endDate: e.endDate?.toISOString?.() ?? e.endDate ?? undefined,
      })),
      education: (cv.education ?? []).map((e: any) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field ?? undefined,
      })),
      skills: (cv.skills ?? []).map((s: any) => ({
        name: s.name,
        level: s.level,
      })),
      certifications: (cv.certifications ?? []).map((c: any) => ({
        name: c.name,
        issuer: c.issuer ?? undefined,
      })),
      projects: (cv.projects ?? []).map((p: any) => ({
        name: p.name,
        description: p.description ?? undefined,
      })),
    };
  }
}
