import { Inject, Injectable, Logger } from '@nestjs/common';
import { CvService } from '@/modules/cv/cv.service';
import type {
  AiProvider,
  CvContentForAnalysis,
  CvAnalysisResult,
  CvOptimizationResult,
} from './interfaces/ai-provider.interface';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly cvService: CvService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {
    this.logger.log(
      `AI provider initialized: ${this.provider.constructor.name}`,
    );
  }

  async analyzeCv(cvId: string, userId: string): Promise<CvAnalysisResult> {
    const cv = await this.cvService.findOne(cvId, userId);
    const content = this.mapCvToAnalysisContent(cv);
    return this.provider.analyzeCv(content);
  }

  async optimizeCvForJob(
    cvId: string,
    userId: string,
    jobDescription: string,
  ): Promise<CvOptimizationResult> {
    const cv = await this.cvService.findOne(cvId, userId);
    const content = this.mapCvToAnalysisContent(cv);
    return this.provider.optimizeCvForJob(content, jobDescription);
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
