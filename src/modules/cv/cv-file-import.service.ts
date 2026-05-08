import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import type { Express } from 'express';
import OpenAI from 'openai';
import { CvService } from './cv.service';
import type { UpsertPersonalInfoRequestDto } from './dto/request/upsert-personal-info.request.dto';
import { SkillLevelDto } from './dto/request/upsert-sections.request.dto';

const SUMMARY_MAX = 5000;
const IMPORT_PREFIX = '[Imported from resume — review and refine]\n\n';
const MAX_LLM_IMPORT_CHARS = 12_000;

type SectionKey = 'experience' | 'education' | 'skills' | 'projects';

interface ParsedExperience {
  company: string;
  title: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  current?: boolean;
  description?: string;
}

interface ParsedEducation {
  institution: string;
  degree: string;
  field?: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

interface ParsedProject {
  name: string;
  description?: string;
  url?: string;
}

interface ParsedResumeSections {
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  skills: string[];
  projects: ParsedProject[];
}

const SECTION_HEADER_ALIASES: Record<SectionKey, string[]> = {
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'employment history',
    'career history',
  ],
  education: [
    'education',
    'academic background',
    'academic history',
    'education and training',
  ],
  skills: [
    'skills',
    'technical skills',
    'core skills',
    'key skills',
    'competencies',
  ],
  projects: ['projects', 'project experience', 'key projects'],
};

@Injectable()
export class CvFileImportService {
  private readonly logger = new Logger(CvFileImportService.name);
  private readonly openAiClient: OpenAI | null;
  private readonly aiModel: string;

  constructor(
    private readonly cvService: CvService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    this.openAiClient = apiKey ? new OpenAI({ apiKey }) : null;
    this.aiModel = this.configService.get<string>('AI_MODEL', 'gpt-4o-mini');
  }

  private titleFromFilename(originalname: string): string {
    const base = path
      .basename(originalname, path.extname(originalname))
      .replace(/[-_]+/g, ' ')
      .trim();
    const t = base ? `Imported: ${base}` : 'Imported resume';
    return t.length > 200 ? t.slice(0, 200) : t;
  }

  normalizeText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async extractPlainText(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const buf = file.buffer;

    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: buf });
      try {
        const textResult = await parser.getText();
        return this.normalizeText(textResult.text ?? '');
      } finally {
        await parser.destroy();
      }
    }

    if (
      ext === '.docx' ||
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ buffer: buf });
      return this.normalizeText(value ?? '');
    }

    throw new BadRequestException(
      'Unsupported file type. Upload a PDF or DOCX file.',
    );
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private extractContactHints(text: string): UpsertPersonalInfoRequestDto {
    const dto: UpsertPersonalInfoRequestDto = {};
    const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
    if (emailMatch?.[0] && this.isValidEmail(emailMatch[0])) {
      dto.email = emailMatch[0];
    }
    const phoneMatch = text.match(/\+?\d[\d\s().-]{9,22}\d/);
    if (phoneMatch) {
      dto.phone = phoneMatch[0].replace(/\s+/g, ' ').trim().slice(0, 50);
    }
    const li = text.match(
      /https?:\/\/(www\.)?linkedin\.com\/in\/[^\s)\]]+/i,
    )?.[0];
    if (li) {
      dto.linkedinUrl = li.split(/[\s>\],]/)[0]?.slice(0, 200);
    }
    return dto;
  }

  private detectSectionHeading(line: string): SectionKey | null {
    const normalized = line
      .trim()
      .toLowerCase()
      .replace(/^[\-\u2022•*]+\s*/, '')
      .replace(/[:|]+$/, '')
      .trim();
    if (!normalized || normalized.length > 50) {
      return null;
    }

    for (const [section, aliases] of Object.entries(SECTION_HEADER_ALIASES) as [
      SectionKey,
      string[],
    ][]) {
      if (
        aliases.some(
          alias => normalized === alias || normalized.startsWith(`${alias} `),
        )
      ) {
        return section;
      }
    }

    return null;
  }

  private collectSectionBlocks(text: string): Record<SectionKey, string> {
    const lines = text.split('\n');
    const buckets: Record<SectionKey, string[]> = {
      experience: [],
      education: [],
      skills: [],
      projects: [],
    };
    let current: SectionKey | null = null;

    for (const line of lines) {
      const heading = this.detectSectionHeading(line);
      if (heading) {
        current = heading;
        continue;
      }

      if (current) {
        buckets[current].push(line);
      }
    }

    return {
      experience: buckets.experience.join('\n').trim(),
      education: buckets.education.join('\n').trim(),
      skills: buckets.skills.join('\n').trim(),
      projects: buckets.projects.join('\n').trim(),
    };
  }

  private splitSectionEntries(sectionBody: string): string[] {
    const normalized = sectionBody
      .replace(/\r\n/g, '\n')
      .replace(/[•▪◦]/g, '-')
      .trim();
    if (!normalized) {
      return [];
    }

    const byParagraph = normalized
      .split(/\n{2,}/)
      .map(chunk => chunk.trim())
      .filter(Boolean);
    if (byParagraph.length > 1) {
      return byParagraph;
    }

    return normalized
      .split(/\n(?=\s*(?:[-*]|[A-Z][A-Za-z].{2,90}(?:\s[-|]\s|\sat\s)))/)
      .map(chunk => chunk.trim())
      .filter(Boolean);
  }

  private parseDateToken(token?: string): Date | undefined {
    if (!token) return undefined;
    const trimmed = token.trim();
    if (!trimmed) return undefined;
    if (/^\d{4}$/.test(trimmed)) {
      return new Date(Date.UTC(Number.parseInt(trimmed, 10), 0, 1));
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    return undefined;
  }

  private parseDateRange(text: string): {
    startDate?: Date;
    endDate?: Date;
    current?: boolean;
  } {
    const monthToken =
      '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
    const dateToken = `(?:${monthToken}\\s+\\d{4}|\\d{4})`;
    const rangeRegex = new RegExp(
      `(${dateToken})\\s*(?:-|–|—|to)\\s*(${dateToken}|present|current|now)`,
      'i',
    );
    const match = text.match(rangeRegex);
    if (!match) {
      return {};
    }

    const startDate = this.parseDateToken(match[1]);
    const endToken = match[2];
    const isCurrent = /present|current|now/i.test(endToken);
    const endDate = isCurrent ? undefined : this.parseDateToken(endToken);
    return { startDate, endDate, current: isCurrent };
  }

  private defaultStartDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
  }

  private parseExperienceEntries(sectionBody: string): ParsedExperience[] {
    const parsed: ParsedExperience[] = [];
    for (const [index, entry] of this.splitSectionEntries(
      sectionBody,
    ).entries()) {
      const lines = entry
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      const firstLine = lines[0];
      let title = '';
      let company = '';

      if (/\sat\s/i.test(firstLine)) {
        const [left, right] = firstLine.split(/\sat\s/i, 2);
        title = left?.trim() ?? '';
        company = right?.trim() ?? '';
      } else if (firstLine.includes('|')) {
        const [left, right] = firstLine.split('|', 2);
        title = left?.trim() ?? '';
        company = right?.trim() ?? '';
      } else if (firstLine.includes(' - ')) {
        const [left, right] = firstLine.split(' - ', 2);
        title = left?.trim() ?? '';
        company = right?.trim() ?? '';
      } else {
        title = firstLine;
      }

      const dateInfo = this.parseDateRange(entry);
      const description = lines.slice(1).join(' ').trim();

      parsed.push({
        company: (company || 'Unknown Company').slice(0, 200),
        title: (title || `Role ${index + 1}`).slice(0, 200),
        startDate: dateInfo.startDate ?? this.defaultStartDate(),
        endDate: dateInfo.endDate,
        current: dateInfo.current ?? false,
        description: description ? description.slice(0, 5000) : undefined,
      });

      if (parsed.length >= 12) break;
    }

    return parsed;
  }

  private parseEducationEntries(sectionBody: string): ParsedEducation[] {
    const parsed: ParsedEducation[] = [];
    for (const [index, entry] of this.splitSectionEntries(
      sectionBody,
    ).entries()) {
      const lines = entry
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      const firstLine = lines[0];
      let degree = '';
      let institution = '';

      if (firstLine.includes(' - ')) {
        const [left, right] = firstLine.split(' - ', 2);
        degree = left?.trim() ?? '';
        institution = right?.trim() ?? '';
      } else if (firstLine.includes('|')) {
        const [left, right] = firstLine.split('|', 2);
        degree = left?.trim() ?? '';
        institution = right?.trim() ?? '';
      } else {
        institution = firstLine;
      }

      const dateInfo = this.parseDateRange(entry);
      const description = lines.slice(1).join(' ').trim();

      parsed.push({
        institution: (institution || `Institution ${index + 1}`).slice(0, 200),
        degree: (degree || 'Degree').slice(0, 200),
        startDate: dateInfo.startDate ?? this.defaultStartDate(),
        endDate: dateInfo.endDate,
        description: description ? description.slice(0, 5000) : undefined,
      });

      if (parsed.length >= 12) break;
    }

    return parsed;
  }

  private parseSkillEntries(sectionBody: string): string[] {
    return [
      ...new Set(
        sectionBody
          .split(/[\n,;|/]+/)
          .map(skill => skill.replace(/^[\-\u2022•*\s]+/, '').trim())
          .filter(skill => skill.length >= 2 && skill.length <= 80),
      ),
    ].slice(0, 40);
  }

  private isValidUrl(value?: string): boolean {
    if (!value) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private parseProjectEntries(sectionBody: string): ParsedProject[] {
    const parsed: ParsedProject[] = [];
    for (const [index, entry] of this.splitSectionEntries(
      sectionBody,
    ).entries()) {
      const lines = entry
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      if (lines.length === 0) continue;

      const firstLine = lines[0];
      const [namePart, descPart] = firstLine.split(' - ', 2);
      const name = (namePart || firstLine || `Project ${index + 1}`).trim();
      const description = [descPart, ...lines.slice(1)]
        .filter(Boolean)
        .join(' ');
      const urlMatch = entry.match(/https?:\/\/[^\s)\]]+/i)?.[0];

      parsed.push({
        name: name.slice(0, 200),
        description: description ? description.slice(0, 5000) : undefined,
        url: this.isValidUrl(urlMatch) ? urlMatch : undefined,
      });

      if (parsed.length >= 12) break;
    }

    return parsed;
  }

  private extractSectionsByRegexAnchors(text: string): ParsedResumeSections {
    const blocks = this.collectSectionBlocks(text);
    return {
      experiences: this.parseExperienceEntries(blocks.experience),
      education: this.parseEducationEntries(blocks.education),
      skills: this.parseSkillEntries(blocks.skills),
      projects: this.parseProjectEntries(blocks.projects),
    };
  }

  private shouldUseLlmFallback(): boolean {
    const provider = this.configService
      .get<string>('AI_PROVIDER', 'builtin')
      ?.trim()
      .toLowerCase();
    return provider === 'openai' && Boolean(this.openAiClient);
  }

  private async extractSectionsWithLlm(
    text: string,
  ): Promise<ParsedResumeSections | null> {
    if (!this.openAiClient) {
      return null;
    }

    try {
      const completion = await this.openAiClient.chat.completions.create({
        model: this.aiModel,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extract resume sections into JSON only. Return keys: experiences, education, skills, projects. ' +
              'experiences items: {title, company, description, startDate, endDate, current}. ' +
              'education items: {institution, degree, field, startDate, endDate, description}. ' +
              'skills: array of strings. projects items: {name, description, url}. ' +
              'Use YYYY-MM-DD when possible for dates; use null when unknown.',
          },
          {
            role: 'user',
            content: text.slice(0, MAX_LLM_IMPORT_CHARS),
          },
        ],
      });

      const payload = completion.choices[0]?.message?.content;
      if (!payload) {
        return null;
      }

      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const asArray = <T = Record<string, unknown>>(value: unknown): T[] =>
        Array.isArray(value) ? (value as T[]) : [];
      const asString = (value: unknown): string =>
        typeof value === 'string' ? value.trim() : '';

      const llmExperience = asArray(parsed.experiences)
        .map((item, index) => {
          const exp = item as Record<string, unknown>;
          const startDate =
            this.parseDateToken(asString(exp.startDate)) ??
            this.defaultStartDate();
          const endDate = this.parseDateToken(asString(exp.endDate));
          const title = asString(exp.title) || `Role ${index + 1}`;
          const company = asString(exp.company) || 'Unknown Company';
          const description = asString(exp.description);
          return {
            title: title.slice(0, 200),
            company: company.slice(0, 200),
            startDate,
            endDate,
            current: typeof exp.current === 'boolean' ? exp.current : !endDate,
            description: description ? description.slice(0, 5000) : undefined,
          } satisfies ParsedExperience;
        })
        .slice(0, 12);

      const llmEducation = asArray(parsed.education)
        .map((item, index) => {
          const edu = item as Record<string, unknown>;
          const startDate =
            this.parseDateToken(asString(edu.startDate)) ??
            this.defaultStartDate();
          const endDate = this.parseDateToken(asString(edu.endDate));
          const institution =
            asString(edu.institution) || `Institution ${index + 1}`;
          const degree = asString(edu.degree) || 'Degree';
          const field = asString(edu.field);
          const description = asString(edu.description);
          return {
            institution: institution.slice(0, 200),
            degree: degree.slice(0, 200),
            field: field ? field.slice(0, 200) : undefined,
            startDate,
            endDate,
            description: description ? description.slice(0, 5000) : undefined,
          } satisfies ParsedEducation;
        })
        .slice(0, 12);

      const llmSkills = [
        ...new Set(
          asArray<string | number>(parsed.skills)
            .map(skill => String(skill).trim())
            .filter(skill => skill.length >= 2 && skill.length <= 80),
        ),
      ].slice(0, 40);

      const llmProjects = asArray(parsed.projects)
        .map((item, index) => {
          const project = item as Record<string, unknown>;
          const name = asString(project.name) || `Project ${index + 1}`;
          const description = asString(project.description);
          const url = asString(project.url);
          return {
            name: name.slice(0, 200),
            description: description ? description.slice(0, 5000) : undefined,
            url: this.isValidUrl(url) ? url : undefined,
          } satisfies ParsedProject;
        })
        .slice(0, 12);

      return {
        experiences: llmExperience,
        education: llmEducation,
        skills: llmSkills,
        projects: llmProjects,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `LLM structured import fallback failed, keeping regex-only parsing. ${message}`,
      );
      return null;
    }
  }

  private mergeSections(
    regexParsed: ParsedResumeSections,
    llmParsed: ParsedResumeSections | null,
  ): ParsedResumeSections {
    if (!llmParsed) {
      return regexParsed;
    }

    return {
      experiences:
        regexParsed.experiences.length > 0
          ? regexParsed.experiences
          : llmParsed.experiences,
      education:
        regexParsed.education.length > 0
          ? regexParsed.education
          : llmParsed.education,
      skills: [
        ...new Set(
          [...regexParsed.skills, ...llmParsed.skills].map(skill =>
            skill.trim(),
          ),
        ),
      ]
        .filter(Boolean)
        .slice(0, 40),
      projects:
        regexParsed.projects.length > 0
          ? regexParsed.projects
          : llmParsed.projects,
    };
  }

  private async extractStructuredSections(
    text: string,
  ): Promise<ParsedResumeSections> {
    const regexParsed = this.extractSectionsByRegexAnchors(text);
    if (!this.shouldUseLlmFallback()) {
      return regexParsed;
    }

    const llmParsed = await this.extractSectionsWithLlm(text);
    return this.mergeSections(regexParsed, llmParsed);
  }

  async importFromFile(userId: string, file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Empty file upload');
    }

    const text = await this.extractPlainText(file);
    if (text.length < 30) {
      throw new BadRequestException(
        'Could not extract enough text. Try another PDF/DOCX or copy text manually.',
      );
    }

    const hints = this.extractContactHints(text);
    const maxBody = Math.max(0, SUMMARY_MAX - IMPORT_PREFIX.length);
    hints.summary = `${IMPORT_PREFIX}${text.slice(0, maxBody)}`;
    const sections = await this.extractStructuredSections(text);

    const title = this.titleFromFilename(file.originalname);
    const cv = await this.cvService.create(userId, { title });
    await this.cvService.upsertPersonalInfo(cv.id, userId, hints);

    if (sections.experiences.length > 0) {
      await this.cvService.bulkUpsertExperiences(cv.id, userId, {
        items: sections.experiences.map((exp, index) => ({
          company: exp.company,
          title: exp.title,
          location: exp.location,
          startDate: exp.startDate,
          endDate: exp.endDate,
          current: exp.current,
          description: exp.description,
          sortOrder: index,
        })),
      });
    }

    if (sections.education.length > 0) {
      await this.cvService.bulkUpsertEducation(cv.id, userId, {
        items: sections.education.map((edu, index) => ({
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          startDate: edu.startDate,
          endDate: edu.endDate,
          description: edu.description,
          sortOrder: index,
        })),
      });
    }

    if (sections.skills.length > 0) {
      await this.cvService.bulkUpsertSkills(cv.id, userId, {
        items: sections.skills.map((skill, index) => ({
          name: skill,
          level: SkillLevelDto.INTERMEDIATE,
          sortOrder: index,
        })),
      });
    }

    if (sections.projects.length > 0) {
      await this.cvService.bulkUpsertProjects(cv.id, userId, {
        items: sections.projects.map((project, index) => ({
          name: project.name,
          description: project.description,
          url: project.url,
          sortOrder: index,
        })),
      });
    }

    this.logger.log(`CV ${cv.id} created from file import for user ${userId}`);
    return this.cvService.findOne(cv.id, userId);
  }
}
