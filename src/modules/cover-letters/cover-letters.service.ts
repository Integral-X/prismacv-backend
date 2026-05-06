import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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

@Injectable()
export class CoverLettersService {
  private readonly logger = new Logger(CoverLettersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cvService: CvService,
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

    const content = this.buildCoverLetter(cv, dto);
    const highlights = this.extractHighlights(cv, dto);

    return { content, highlights };
  }

  private buildCoverLetter(
    cv: any,
    dto: GenerateCoverLetterRequestDto,
  ): string {
    const name = cv.personalInfo?.fullName ?? 'there';
    const company = dto.company ?? 'your company';
    const jobTitle = dto.jobTitle ?? 'the open position';
    const tone = dto.tone ?? 'professional';

    // Gather experience details
    const experiences = cv.experiences ?? [];
    const totalYears = experiences.length > 0 ? experiences.length : 1;
    const topRole = experiences[0];
    const skills = (cv.skills ?? []).map((s: any) => s.name);
    const topSkills = skills.slice(0, 5).join(', ');

    const greeting = this.getGreeting(tone);
    const closing = this.getClosing(tone);

    const paragraphs: string[] = [];

    // Opening paragraph
    paragraphs.push(
      `${greeting} I am writing to express my interest in ${jobTitle} at ${company}. ` +
        `With ${totalYears}+ years of professional experience${topSkills ? ` and expertise in ${topSkills}` : ''}, ` +
        `I am confident in my ability to contribute meaningfully to your team.`,
    );

    // Experience paragraph
    if (topRole) {
      paragraphs.push(
        `In my most recent role as ${topRole.title} at ${topRole.company}, ` +
          `${topRole.description ? topRole.description.slice(0, 200) : 'I have developed strong skills and delivered impactful results'}. ` +
          `This experience has prepared me well for the challenges and opportunities at ${company}.`,
      );
    }

    // Skills paragraph
    if (skills.length > 0) {
      paragraphs.push(
        `My technical toolkit includes ${skills.slice(0, 8).join(', ')}${skills.length > 8 ? ', among others' : ''}. ` +
          `I continuously invest in expanding my skill set to stay current with industry trends.`,
      );
    }

    // Closing paragraph
    paragraphs.push(
      `I would welcome the opportunity to discuss how my background, skills, and enthusiasm align with the needs of ${company}. ` +
        `${closing}`,
    );

    return `Dear Hiring Manager,\n\n${paragraphs.join('\n\n')}\n\nSincerely,\n${name}`;
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

  private extractHighlights(
    cv: any,
    dto: GenerateCoverLetterRequestDto,
  ): string[] {
    const highlights: string[] = [];

    const experiences = cv.experiences ?? [];
    if (experiences.length > 0) {
      highlights.push(
        `${experiences.length}+ years of professional experience`,
      );
    }

    const skills = (cv.skills ?? []).map((s: any) => s.name);
    if (skills.length > 0) {
      highlights.push(`Key skills: ${skills.slice(0, 4).join(', ')}`);
    }

    if (dto.company) {
      highlights.push(`Tailored for ${dto.company}`);
    }

    const certs = cv.certifications ?? [];
    if (certs.length > 0) {
      highlights.push(`${certs.length} certification(s)`);
    }

    return highlights;
  }
}
