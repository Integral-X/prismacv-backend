import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/config/prisma.service';
import { generateUuidv7 } from '@/shared/utils/uuid.util';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import {
  CreateCoverLetterRequestDto,
  UpdateCoverLetterRequestDto,
  GenerateCoverLetterRequestDto,
} from './dto/request/cover-letter.request.dto';
import { CvService } from '@/modules/cv/cv.service';
import { AiUsageService } from '@/modules/ai/ai-usage.service';
import { OpenAiProvider } from '@/modules/ai/providers/openai.provider';
import { UnleashService } from '@/modules/unleash/unleash.service';
import { AI_LLM_COVER_LETTER_FLAG } from '@/modules/ai/ai-feature-flags';
import { AiUsageFeature, Prisma } from '@prisma/client';
import { CV_INCLUDE_ALL } from '@/modules/cv/cv.constants';
import { MetricsService } from '@/modules/metrics/metrics.service';

type CoverLetterTemplate =
  | 'classic_professional'
  | 'impact_story'
  | 'concise_modern';

const DEFAULT_COVER_LETTER_TEMPLATE: CoverLetterTemplate =
  'classic_professional';

const COVER_LETTER_TEMPLATE_LABELS: Record<CoverLetterTemplate, string> = {
  classic_professional: 'Classic Professional',
  impact_story: 'Impact Story',
  concise_modern: 'Concise Modern',
};

@Injectable()
export class CoverLettersService {
  private readonly logger = new Logger(CoverLettersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvService: CvService,
    private readonly configService: ConfigService,
    private readonly openAiProvider: OpenAiProvider,
    private readonly aiUsageService: AiUsageService,
    private readonly unleashService: UnleashService,
    private readonly metricsService: MetricsService,
  ) {}

  private async findOrThrow(id: string, userId: string) {
    const coverLetter = await this.prisma.coverLetter.findUnique({
      where: { id },
    });

    if (!coverLetter) {
      throw new NotFoundException(`Cover letter with id ${id} not found`);
    }

    if (coverLetter.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this cover letter',
      );
    }

    return coverLetter;
  }

  async create(userId: string, dto: CreateCoverLetterRequestDto) {
    const coverLetter = await this.prisma.coverLetter.create({
      data: {
        id: generateUuidv7(),
        userId,
        title: dto.title,
        cvId: dto.cvId,
        jobTitle: dto.jobTitle,
        company: dto.company,
        tone: dto.tone ?? 'professional',
        content: dto.content ?? '',
      },
    });

    this.logger.log(
      `Cover letter created: ${coverLetter.id} for user ${userId}`,
    );
    return coverLetter;
  }

  async findAllByUser(userId: string, pagination: PaginationQueryDto) {
    const where = { userId };

    const [items, total] = await Promise.all([
      this.prisma.coverLetter.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { updatedAt: pagination.sortOrder },
      }),
      this.prisma.coverLetter.count({ where }),
    ]);

    return PaginatedResponseDto.create(
      items,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async findOne(id: string, userId: string) {
    return this.findOrThrow(id, userId);
  }

  async update(id: string, userId: string, dto: UpdateCoverLetterRequestDto) {
    await this.findOrThrow(id, userId);

    const updated = await this.prisma.coverLetter.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.cvId !== undefined && { cvId: dto.cvId }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.tone !== undefined && { tone: dto.tone }),
        ...(dto.content !== undefined && { content: dto.content }),
      },
    });

    this.logger.log(`Cover letter updated: ${id}`);
    return updated;
  }

  async delete(id: string, userId: string) {
    await this.findOrThrow(id, userId);
    await this.prisma.coverLetter.delete({ where: { id } });
    this.logger.log(`Cover letter deleted: ${id}`);
  }

  async generate(userId: string, dto: GenerateCoverLetterRequestDto) {
    // Fetch CV content to base the cover letter on
    const cv = await this.cvService.findOne(dto.cvId, userId);
    const template = this.normalizeTemplate(dto.template);

    const highlights = this.extractHighlights(cv, dto);
    if (this.shouldUseLlm(userId)) {
      const startedAt = Date.now();
      let quotaConsumed = false;
      try {
        await this.aiUsageService.consumeQuota(
          userId,
          AiUsageFeature.COVER_LETTER_GENERATE,
        );
        quotaConsumed = true;
        const content = await this.openAiProvider.generateCoverLetter({
          fullName: cv.personalInfo?.fullName ?? undefined,
          summary: cv.personalInfo?.summary ?? undefined,
          topExperience: (cv.experiences ?? [])
            .slice(0, 3)
            .map(
              exp =>
                `${exp.title} at ${exp.company}${exp.description ? `: ${exp.description.slice(0, 180)}` : ''}`,
            ),
          topSkills: (cv.skills ?? []).map(skill => skill.name).slice(0, 10),
          jobTitle: dto.jobTitle,
          company: dto.company,
          tone: dto.tone,
          jobDescription: dto.jobDescription,
          template,
        });
        this.metricsService.recordAiCall({
          feature: 'cover_letter_generate',
          provider: 'openai',
          status: 'success',
          durationMs: Date.now() - startedAt,
        });
        return { content, highlights };
      } catch (error) {
        this.metricsService.recordAiCall({
          feature: 'cover_letter_generate',
          provider: 'openai',
          status: 'error',
          durationMs: Date.now() - startedAt,
        });

        if (quotaConsumed) {
          await this.refundQuotaOnProviderFailure(
            userId,
            AiUsageFeature.COVER_LETTER_GENERATE,
          );
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `OpenAI cover letter generation failed; falling back to template builder. ${message}`,
        );
      }
    }

    const content = this.buildCoverLetter(cv, dto, template);

    return { content, highlights };
  }

  private async refundQuotaOnProviderFailure(
    userId: string,
    feature: AiUsageFeature,
  ): Promise<void> {
    try {
      await this.aiUsageService.refundQuota(userId, feature);
    } catch (refundError) {
      const message =
        refundError instanceof Error
          ? refundError.message
          : String(refundError);
      this.logger.error(
        `Failed to refund AI quota for feature=${feature.toLowerCase()}, userId=${userId}: ${message}`,
      );
    }
  }

  private shouldUseLlm(userId: string): boolean {
    const provider = this.configService
      .get<string>('AI_PROVIDER', 'builtin')
      ?.trim()
      .toLowerCase();
    if (provider !== 'openai') {
      return false;
    }

    if (!this.openAiProvider.isAvailable()) {
      return false;
    }

    return this.unleashService.isEnabled(AI_LLM_COVER_LETTER_FLAG, { userId });
  }

  private buildCoverLetter(
    cv: Prisma.CvGetPayload<{ include: typeof CV_INCLUDE_ALL }>,
    dto: GenerateCoverLetterRequestDto,
    template: CoverLetterTemplate,
  ): string {
    const name = cv.personalInfo?.fullName ?? 'there';
    const company = dto.company ?? 'your company';
    const jobTitle = dto.jobTitle ?? 'the open position';
    const tone = dto.tone ?? 'professional';

    // Gather experience details
    const experiences = cv.experiences ?? [];
    const totalYears = this.computeTotalYears(experiences);
    const topRole = experiences[0];
    const skills = (cv.skills ?? []).map(s => s.name);
    const topSkills = skills.slice(0, 5).join(', ');

    const greeting = this.getGreeting(tone);
    const closing = this.getClosing(tone);

    const paragraphs: string[] = [];

    if (template === 'impact_story' && topRole?.description) {
      paragraphs.push(
        `${topRole.description.slice(0, 220)}. This result reflects the impact I aim to bring to ${company} as ${jobTitle}.`,
      );
    } else {
      // Opening paragraph
      paragraphs.push(
        `I am writing to express my interest in ${jobTitle} at ${company}. ` +
          (totalYears > 0
            ? `With ${totalYears}+ years of professional experience${topSkills ? ` and expertise in ${topSkills}` : ''}, `
            : topSkills
              ? `With expertise in ${topSkills}, `
              : '') +
          `I am confident in my ability to contribute meaningfully to your team.`,
      );
    }

    if (topRole) {
      const experienceSentence =
        topRole.description?.slice(0, 200) ??
        'I have developed strong skills and delivered impactful results';
      if (template === 'concise_modern') {
        paragraphs.push(
          `${topRole.title} at ${topRole.company}: ${experienceSentence}.`,
        );
      } else {
        paragraphs.push(
          `In my most recent role as ${topRole.title} at ${topRole.company}, ${experienceSentence}. ` +
            `This experience has prepared me well for the challenges and opportunities at ${company}.`,
        );
      }
    }

    if (skills.length > 0) {
      const skillLine = `My technical toolkit includes ${skills.slice(0, 8).join(', ')}${skills.length > 8 ? ', among others' : ''}.`;
      if (template === 'concise_modern') {
        paragraphs.push(skillLine);
      } else {
        paragraphs.push(
          `${skillLine} I continuously invest in expanding my skill set to stay current with industry trends.`,
        );
      }
    }

    if (dto.jobDescription) {
      const keywords = this.extractJobKeywords(dto.jobDescription);
      const matchedSkills = skills.filter((s: string) =>
        keywords.some(k => s.toLowerCase().includes(k)),
      );
      if (matchedSkills.length > 0) {
        paragraphs.push(
          `Based on the role requirements, I bring direct experience with ${matchedSkills.slice(0, 5).join(', ')}, ` +
            `which I believe aligns well with what you are looking for.`,
        );
      }
    }

    // Closing paragraph
    paragraphs.push(
      `I would welcome the opportunity to discuss how my background, skills, and enthusiasm align with the needs of ${company}. ` +
        `${closing}`,
    );

    return `${greeting}\n\n${paragraphs.join('\n\n')}\n\nSincerely,\n${name}`;
  }

  private getGreeting(tone: string): string {
    switch (tone) {
      case 'casual':
        return 'Hi there!';
      case 'enthusiastic':
        return 'I am thrilled to apply!';
      default:
        return 'Dear Hiring Manager,';
    }
  }

  private getClosing(tone: string): string {
    switch (tone) {
      case 'casual':
        return 'Looking forward to chatting!';
      case 'enthusiastic':
        return 'I cannot wait to hear from you and explore this exciting opportunity!';
      default:
        return 'Thank you for considering my application. I look forward to hearing from you.';
    }
  }

  private computeTotalYears(
    experiences: { startDate?: Date | null; endDate?: Date | null }[],
  ): number {
    if (experiences.length === 0) return 0;
    let totalMonths = 0;
    for (const exp of experiences) {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      if (start) {
        totalMonths +=
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
      }
    }
    return Math.max(1, Math.floor(totalMonths / 12));
  }

  private extractJobKeywords(jobDescription: string): string[] {
    const words = jobDescription
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);
    return [...new Set(words)];
  }

  private extractHighlights(
    cv: Prisma.CvGetPayload<{ include: typeof CV_INCLUDE_ALL }>,
    dto: GenerateCoverLetterRequestDto,
  ): string[] {
    const highlights: string[] = [];
    const template = this.normalizeTemplate(dto.template);

    const experiences = cv.experiences ?? [];
    if (experiences.length > 0) {
      const years = this.computeTotalYears(experiences);
      highlights.push(
        `${years}+ years of professional experience across ${experiences.length} role(s)`,
      );
    }

    const skills = (cv.skills ?? []).map(s => s.name);
    if (skills.length > 0) {
      highlights.push(`Key skills: ${skills.slice(0, 4).join(', ')}`);
    }

    if (dto.company) {
      highlights.push(`Tailored for ${dto.company}`);
    }

    highlights.push(`Template: ${COVER_LETTER_TEMPLATE_LABELS[template]}`);

    const certs = cv.certifications ?? [];
    if (certs.length > 0) {
      highlights.push(`${certs.length} certification(s)`);
    }

    return highlights;
  }

  private normalizeTemplate(input?: string): CoverLetterTemplate {
    if (!input) {
      return DEFAULT_COVER_LETTER_TEMPLATE;
    }

    if (input in COVER_LETTER_TEMPLATE_LABELS) {
      return input as CoverLetterTemplate;
    }

    return DEFAULT_COVER_LETTER_TEMPLATE;
  }
}
