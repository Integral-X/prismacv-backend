import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '@/modules/auth/users.service';
import { LinkedinCvResponseDto } from '../dto/linkedin-cv.response.dto';
import { OAUTH_PROVIDERS } from '@/shared/constants/oauth.constants';
import { PrismaService } from '@/config/prisma.service';
import { Prisma } from '@prisma/client';
import { generateUuidv7 } from '@/shared/utils/uuid.util';

@Injectable()
export class LinkedInCvService {
  private readonly logger = new Logger(LinkedInCvService.name);
  private readonly linkedInApiBase = 'https://api.linkedin.com/v2';

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async importForUser(
    userId: string,
    handleOrUrl: string,
  ): Promise<LinkedinCvResponseDto> {
    const { handle, url } = this.normalizeHandle(handleOrUrl);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.provider !== OAUTH_PROVIDERS.LINKEDIN) {
      throw new ConflictException(
        'LinkedIn account is not connected. Use /oauth/linkedin to connect.',
      );
    }

    if (!user.oauthAccessToken) {
      throw new ConflictException(
        'LinkedIn access token is missing. Reconnect your LinkedIn account via /oauth/linkedin.',
      );
    }

    const warnings: string[] = [];
    // Only basic scopes are guaranteed for standard apps.
    const dataScope = ['r_liteprofile', 'r_emailaddress'];

    const profileData = await this.fetchLinkedInProfile(user.oauthAccessToken);
    const email = await this.fetchLinkedInEmail(
      user.oauthAccessToken,
      warnings,
    );

    // The following require enterprise r_basicprofile scope. We catch 403s gracefully.
    const experience = await this.fetchLinkedInExperience(
      user.oauthAccessToken,
    );
    const education = await this.fetchLinkedInEducation(user.oauthAccessToken);
    const skills = await this.fetchLinkedInSkills(user.oauthAccessToken);

    if (!experience.length && !education.length && !skills.length) {
      warnings.push(
        'Full profile data (experience, education, skills) is unavailable because the connected LinkedIn app does not have enterprise "r_basicprofile" approval. Only the Lite profile was imported.',
      );
    }

    const resolvedHandle = profileData.vanityName ?? handle;
    const resolvedUrl = resolvedHandle
      ? `https://www.linkedin.com/in/${resolvedHandle}`
      : url;
    const fullName = [
      profileData.localizedFirstName,
      profileData.localizedLastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const response: LinkedinCvResponseDto = {
      source: {
        provider: OAUTH_PROVIDERS.LINKEDIN,
        handle: resolvedHandle ?? handle ?? null,
        url: resolvedUrl ?? null,
        fetchedAt: new Date().toISOString(),
        dataScope,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      profile: {
        fullName: fullName || user.name || null,
        headline: profileData.localizedHeadline ?? null,
        location: null,
        summary: null,
        email: email ?? user.email ?? null,
        phone: null,
        website: null,
        photoUrl: profileData.photoUrl ?? user.avatarUrl ?? null,
        linkedinUrl: resolvedUrl ?? null,
        linkedinHandle: resolvedHandle ?? handle ?? null,
      },
      experience,
      education,
      skills,
      certifications: [],
      projects: [],
      publications: [],
      volunteer: [],
      honors: [],
      languages: [],
      courses: [],
    };

    const persistedImport = await this.prisma.linkedinCvImport.upsert({
      where: {
        userId_linkedinUrl: {
          userId,
          linkedinUrl: url,
        },
      },
      create: {
        id: generateUuidv7(),
        userId,
        provider: response.source.provider,
        linkedinHandle: response.source.handle,
        linkedinUrl: url,
        fetchedAt: new Date(response.source.fetchedAt),
        dataScope: this.toJson(response.source.dataScope),
        warnings: this.toJson(response.source.warnings ?? null),
        profile: this.toJson(response.profile),
        experience: this.toJson(response.experience),
        education: this.toJson(response.education),
        skills: this.toJson(response.skills),
        certifications: this.toJson(response.certifications),
        projects: this.toJson(response.projects),
        publications: this.toJson(response.publications),
        volunteer: this.toJson(response.volunteer),
        honors: this.toJson(response.honors),
        languages: this.toJson(response.languages),
        courses: this.toJson(response.courses),
      },
      update: {
        provider: response.source.provider,
        linkedinHandle: response.source.handle,
        fetchedAt: new Date(response.source.fetchedAt),
        dataScope: this.toJson(response.source.dataScope),
        warnings: this.toJson(response.source.warnings ?? null),
        profile: this.toJson(response.profile),
        experience: this.toJson(response.experience),
        education: this.toJson(response.education),
        skills: this.toJson(response.skills),
        certifications: this.toJson(response.certifications),
        projects: this.toJson(response.projects),
        publications: this.toJson(response.publications),
        volunteer: this.toJson(response.volunteer),
        honors: this.toJson(response.honors),
        languages: this.toJson(response.languages),
        courses: this.toJson(response.courses),
      },
    });

    response.source.importId = persistedImport.id;

    return response;
  }

  private async fetchLinkedInProfile(accessToken: string): Promise<{
    localizedFirstName?: string;
    localizedLastName?: string;
    localizedHeadline?: string;
    vanityName?: string;
    photoUrl?: string;
  }> {
    const projection = encodeURIComponent(
      '(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName,profilePicture(displayImage~:playableStreams))',
    );

    const profile = await this.fetchRequiredJson<Record<string, unknown>>(
      `${this.linkedInApiBase}/me?projection=${projection}`,
      accessToken,
      'Unable to fetch LinkedIn profile. Please reconnect LinkedIn and try again.',
    );

    return {
      localizedFirstName:
        typeof profile.localizedFirstName === 'string'
          ? profile.localizedFirstName
          : undefined,
      localizedLastName:
        typeof profile.localizedLastName === 'string'
          ? profile.localizedLastName
          : undefined,
      localizedHeadline:
        typeof profile.localizedHeadline === 'string'
          ? profile.localizedHeadline
          : undefined,
      vanityName:
        typeof profile.vanityName === 'string' ? profile.vanityName : undefined,
      photoUrl: this.extractProfilePhotoUrl(profile),
    };
  }

  private async fetchLinkedInEmail(
    accessToken: string,
    warnings: string[],
  ): Promise<string | null> {
    try {
      const projection = encodeURIComponent('(elements*(handle~))');
      const response = await this.fetchOptionalJson<Record<string, unknown>>(
        `${this.linkedInApiBase}/emailAddress?q=members&projection=${projection}`,
        accessToken,
      );

      const elements = Array.isArray(response?.elements)
        ? (response?.elements as Array<Record<string, unknown>>)
        : [];
      const firstElement = elements[0];
      const handle =
        firstElement && typeof firstElement['handle~'] === 'object'
          ? (firstElement['handle~'] as Record<string, unknown>)
          : null;

      return handle && typeof handle.emailAddress === 'string'
        ? handle.emailAddress
        : null;
    } catch (error) {
      this.logger.warn(
        `LinkedIn email fetch skipped: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      warnings.push('Unable to fetch LinkedIn email from LinkedIn API.');
      return null;
    }
  }

  private async fetchLinkedInExperience(
    accessToken: string,
  ): Promise<LinkedinCvResponseDto['experience']> {
    try {
      const projection = encodeURIComponent(
        '(elements*(title,summary,companyName,locationName,timePeriod,startDate,endDate,isCurrent))',
      );
      const response = await this.fetchOptionalJson<Record<string, unknown>>(
        `${this.linkedInApiBase}/positions?q=members&projection=${projection}`,
        accessToken,
      );

      // Return empty array if response is null (handled gracefully by fetchOptionalJson on 403)
      if (!response) {
        return [];
      }

      const elements = Array.isArray(response?.elements)
        ? (response.elements as Array<Record<string, unknown>>)
        : [];

      return elements.map(item => ({
        title: this.asString(item.title),
        company: this.asString(item.companyName),
        location: this.asString(item.locationName),
        startDate: this.formatLinkedInDate(item.startDate),
        endDate: this.formatLinkedInDate(item.endDate),
        employmentType: null,
        description: this.asString(item.summary),
      }));
    } catch {
      return [];
    }
  }

  private async fetchLinkedInEducation(
    accessToken: string,
  ): Promise<LinkedinCvResponseDto['education']> {
    try {
      const projection = encodeURIComponent(
        '(elements*(schoolName,degreeName,fieldOfStudy,startDate,endDate,activities,grade))',
      );
      const response = await this.fetchOptionalJson<Record<string, unknown>>(
        `${this.linkedInApiBase}/educations?q=members&projection=${projection}`,
        accessToken,
      );

      if (!response) {
        return [];
      }

      const elements = Array.isArray(response?.elements)
        ? (response.elements as Array<Record<string, unknown>>)
        : [];

      return elements.map(item => ({
        school: this.asString(item.schoolName),
        degree: this.asString(item.degreeName),
        fieldOfStudy: this.asString(item.fieldOfStudy),
        startDate: this.formatLinkedInDate(item.startDate),
        endDate: this.formatLinkedInDate(item.endDate),
        grade: this.asString(item.grade),
        activities: this.asString(item.activities),
      }));
    } catch {
      return [];
    }
  }

  private async fetchLinkedInSkills(accessToken: string): Promise<string[]> {
    try {
      const projection = encodeURIComponent('(elements*(name))');
      const response = await this.fetchOptionalJson<Record<string, unknown>>(
        `${this.linkedInApiBase}/skills?q=members&projection=${projection}`,
        accessToken,
      );

      if (!response) {
        return [];
      }

      const elements = Array.isArray(response?.elements)
        ? (response.elements as Array<Record<string, unknown>>)
        : [];

      return elements
        .map(item => this.asString(item.name))
        .filter((skill): skill is string => Boolean(skill));
    } catch {
      return [];
    }
  }

  private async fetchRequiredJson<T>(
    url: string,
    accessToken: string,
    clientErrorMessage: string,
  ): Promise<T> {
    try {
      return await this.fetchJson<T>(url, accessToken);
    } catch (error) {
      this.logger.error(
        `LinkedIn API required request failed (${url}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(clientErrorMessage);
    }
  }

  private async fetchOptionalJson<T>(
    url: string,
    accessToken: string,
  ): Promise<T | null> {
    try {
      return await this.fetchJson<T>(url, accessToken);
    } catch (error: any) {
      if (error && error.status === 403) {
        this.logger.debug(
          `LinkedIn API optional request forbidden (403) (${url}). Likely missing r_basicprofile enterprise scope.`,
        );
        return null;
      }
      this.logger.warn(
        `LinkedIn API optional request failed (${url}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async fetchJson<T>(url: string, accessToken: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`HTTP ${response.status}: ${body}`) as any;
      err.status = response.status;
      throw err;
    }

    return (await response.json()) as T;
  }

  private extractProfilePhotoUrl(
    profile: Record<string, unknown>,
  ): string | undefined {
    const profilePicture =
      typeof profile.profilePicture === 'object' && profile.profilePicture
        ? (profile.profilePicture as Record<string, unknown>)
        : null;
    const displayImage =
      profilePicture && typeof profilePicture['displayImage~'] === 'object'
        ? (profilePicture['displayImage~'] as Record<string, unknown>)
        : null;
    const elements = Array.isArray(displayImage?.elements)
      ? (displayImage?.elements as Array<Record<string, unknown>>)
      : [];

    const lastElement = elements[elements.length - 1];
    const identifiers = Array.isArray(lastElement?.identifiers)
      ? (lastElement?.identifiers as Array<Record<string, unknown>>)
      : [];
    const firstIdentifier = identifiers[0];

    return typeof firstIdentifier?.identifier === 'string'
      ? firstIdentifier.identifier
      : undefined;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private formatLinkedInDate(value: unknown): string | null {
    if (typeof value !== 'object' || !value) {
      return null;
    }

    const date = value as Record<string, unknown>;
    const year = typeof date.year === 'number' ? date.year : null;
    const month = typeof date.month === 'number' ? date.month : 1;
    const day = typeof date.day === 'number' ? date.day : 1;

    if (!year) {
      return null;
    }

    const isoMonth = String(month).padStart(2, '0');
    const isoDay = String(day).padStart(2, '0');
    return `${year}-${isoMonth}-${isoDay}`;
  }

  private normalizeHandle(input: string): {
    handle: string | null;
    url: string | null;
  } {
    const trimmed = input?.trim();
    if (!trimmed) {
      throw new BadRequestException('LinkedIn handle or URL is required');
    }

    const lowerTrimmed = trimmed.toLowerCase();
    const isUrlMode =
      lowerTrimmed.startsWith('http://') ||
      lowerTrimmed.startsWith('https://') ||
      lowerTrimmed.startsWith('www.linkedin.com') ||
      lowerTrimmed.startsWith('linkedin.com') ||
      trimmed.includes('/');

    if (isUrlMode) {
      const withScheme = lowerTrimmed.startsWith('http')
        ? trimmed
        : `https://${trimmed}`;
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(withScheme);
      } catch {
        throw new BadRequestException('Invalid LinkedIn URL');
      }

      const host = parsedUrl.hostname.toLowerCase();
      // Fix for CodeQL: Incomplete URL substring sanitization
      // Ensure it is exactly linkedin.com or ends with .linkedin.com
      // (prevents attacks from malicious-linkedin.com)
      if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
        throw new BadRequestException('Invalid LinkedIn URL');
      }

      const pathname = parsedUrl.pathname.replace(/\/+$/, '');
      const match = pathname.match(/\/(in|pub)\/([^/]+)/i);
      if (!match) {
        throw new BadRequestException(
          'LinkedIn URL must be in the format https://www.linkedin.com/in/{handle}',
        );
      }

      const handle = match[2];
      const url = `https://www.linkedin.com/${match[1].toLowerCase()}/${handle}`;
      return { handle, url };
    }

    const handle = trimmed.replace(/^@/, '');
    if (!/^[a-zA-Z0-9-_%]+$/.test(handle)) {
      throw new BadRequestException('Invalid LinkedIn handle');
    }

    return { handle, url: `https://www.linkedin.com/in/${handle}` };
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }
}
