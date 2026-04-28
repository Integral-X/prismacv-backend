import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { generateUuidv7 } from '@/shared/utils/uuid.util';
import type { Prisma } from '@prisma/client';

interface LinkedInProfile {
  fullName?: string | null;
  headline?: string | null;
  location?: string | null;
  summary?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
}

interface LinkedInExperience {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

interface LinkedInEducation {
  school?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
}

interface LinkedInCertification {
  name?: string | null;
  authority?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  url?: string | null;
}

interface LinkedInProject {
  name?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  url?: string | null;
}

interface LinkedInLanguage {
  name?: string | null;
  proficiency?: string | null;
}

const CV_INCLUDE_ALL = {
  personalInfo: true,
  experiences: { orderBy: { sortOrder: 'asc' as const } },
  education: { orderBy: { sortOrder: 'asc' as const } },
  skills: { orderBy: { sortOrder: 'asc' as const } },
  certifications: { orderBy: { sortOrder: 'asc' as const } },
  projects: { orderBy: { sortOrder: 'asc' as const } },
  languages: { orderBy: { sortOrder: 'asc' as const } },
  customSections: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class CvImportService {
  private readonly logger = new Logger(CvImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importFromLinkedIn(
    userId: string,
    importId: string,
    title?: string,
    templateId?: string,
  ) {
    const linkedinImport = await this.prisma.linkedinCvImport.findUnique({
      where: { id: importId },
    });

    if (!linkedinImport) {
      throw new NotFoundException(`LinkedIn import ${importId} not found`);
    }

    if (linkedinImport.userId !== userId) {
      throw new ForbiddenException('You do not own this LinkedIn import');
    }

    const profile = linkedinImport.profile as unknown as LinkedInProfile;
    const experiences =
      (linkedinImport.experience as unknown as LinkedInExperience[]) ?? [];
    const educationItems =
      (linkedinImport.education as unknown as LinkedInEducation[]) ?? [];
    const skills = (linkedinImport.skills as unknown as string[]) ?? [];
    const certifications =
      (linkedinImport.certifications as unknown as LinkedInCertification[]) ??
      [];
    const projects =
      (linkedinImport.projects as unknown as LinkedInProject[]) ?? [];
    const languages =
      (linkedinImport.languages as unknown as LinkedInLanguage[]) ?? [];

    const cvTitle =
      title ?? (profile.fullName ? `${profile.fullName}'s CV` : 'Imported CV');
    const slug = this.generateSlug(cvTitle);
    const uniqueSlug = await this.ensureUniqueSlug(slug, userId);

    return this.prisma.$transaction(async (tx) => {
      const cvId = generateUuidv7();

      const cv = await tx.cv.create({
        data: {
          id: cvId,
          userId,
          title: cvTitle,
          slug: uniqueSlug,
          status: 'DRAFT',
          templateId: templateId ?? null,
          isDefault: false,
        },
      });

      // Personal Info
      if (profile) {
        await tx.personalInfo.create({
          data: {
            id: generateUuidv7(),
            cvId,
            fullName: profile.fullName ?? null,
            email: profile.email ?? null,
            phone: profile.phone ?? null,
            location: profile.location ?? null,
            website: profile.website ?? null,
            linkedinUrl: profile.linkedinUrl ?? null,
            summary: profile.summary ?? null,
            avatarUrl: profile.photoUrl ?? null,
          },
        });
      }

      // Experiences
      if (experiences.length) {
        await tx.experience.createMany({
          data: experiences.map((exp, i) => ({
            id: generateUuidv7(),
            cvId,
            company: exp.company ?? '',
            title: exp.title ?? '',
            location: exp.location ?? null,
            startDate: this.parseDate(exp.startDate) ?? new Date(),
            endDate: this.parseDate(exp.endDate),
            current: !exp.endDate,
            description: exp.description ?? null,
            sortOrder: i,
          })),
        });
      }

      // Education
      if (educationItems.length) {
        await tx.education.createMany({
          data: educationItems.map((edu, i) => ({
            id: generateUuidv7(),
            cvId,
            institution: edu.school ?? '',
            degree: edu.degree ?? '',
            field: edu.fieldOfStudy ?? null,
            startDate: this.parseDate(edu.startDate) ?? new Date(),
            endDate: this.parseDate(edu.endDate),
            gpa: edu.grade ?? null,
            description: null,
            sortOrder: i,
          })),
        });
      }

      // Skills
      if (skills.length) {
        await tx.skill.createMany({
          data: skills.map((name, i) => ({
            id: generateUuidv7(),
            cvId,
            name: typeof name === 'string' ? name : String(name),
            level: 'INTERMEDIATE' as const,
            category: null,
            sortOrder: i,
          })),
        });
      }

      // Certifications
      if (certifications.length) {
        await tx.certification.createMany({
          data: certifications.map((cert, i) => ({
            id: generateUuidv7(),
            cvId,
            name: cert.name ?? '',
            issuer: cert.authority ?? null,
            issueDate: this.parseDate(cert.startDate),
            expiryDate: this.parseDate(cert.endDate),
            credentialUrl: cert.url ?? null,
            sortOrder: i,
          })),
        });
      }

      // Projects
      if (projects.length) {
        await tx.project.createMany({
          data: projects.map((proj, i) => ({
            id: generateUuidv7(),
            cvId,
            name: proj.name ?? '',
            description: proj.description ?? null,
            url: proj.url ?? null,
            startDate: this.parseDate(proj.startDate),
            endDate: this.parseDate(proj.endDate),
            sortOrder: i,
          })),
        });
      }

      // Languages
      if (languages.length) {
        await tx.language.createMany({
          data: languages.map((lang, i) => ({
            id: generateUuidv7(),
            cvId,
            name: lang.name ?? '',
            proficiency: this.mapLanguageProficiency(lang.proficiency),
            sortOrder: i,
          })),
        });
      }

      this.logger.log(
        `Imported LinkedIn data into CV ${cvId} for user ${userId}`,
      );

      return tx.cv.findUniqueOrThrow({
        where: { id: cv.id },
        include: CV_INCLUDE_ALL,
      });
    });
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueSlug(
    slug: string,
    userId: string,
  ): Promise<string> {
    const existing = await this.prisma.cv.findFirst({
      where: { userId, slug },
    });
    if (!existing) return slug;
    const suffix = Date.now().toString(36);
    return `${slug}-${suffix}`;
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private mapLanguageProficiency(
    proficiency?: string | null,
  ): 'NATIVE' | 'FLUENT' | 'ADVANCED' | 'INTERMEDIATE' | 'BASIC' {
    if (!proficiency) return 'INTERMEDIATE';
    const lower = proficiency.toLowerCase();
    if (lower.includes('native') || lower.includes('mother'))
      return 'NATIVE';
    if (lower.includes('fluent') || lower.includes('full professional'))
      return 'FLUENT';
    if (lower.includes('advanced') || lower.includes('professional working'))
      return 'ADVANCED';
    if (lower.includes('intermediate') || lower.includes('limited working'))
      return 'INTERMEDIATE';
    return 'BASIC';
  }
}
