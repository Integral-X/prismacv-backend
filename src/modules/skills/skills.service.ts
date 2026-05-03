import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { generateUuidv7 } from '@/shared/utils/uuid.util';
import type {
  SkillGapResponseDto,
  LearningRoadmapResponseDto,
  UserSkillProgressResponseDto,
} from './dto/skills.dto';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.skillCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getRoles() {
    const roles = await this.prisma.roleSkillMap.findMany({
      select: { role: true },
      distinct: ['role'],
      orderBy: { role: 'asc' },
    });
    return roles.map(r => r.role);
  }

  async assessSkills(
    userId: string,
    targetRole: string,
    currentSkills: string[],
  ): Promise<SkillGapResponseDto> {
    const roleSkills = await this.prisma.roleSkillMap.findMany({
      where: { role: targetRole },
      include: { category: true },
      orderBy: { importance: 'desc' },
    });

    const userProgress = await this.prisma.userSkillProgress.findMany({
      where: { userId },
    });

    const progressMap = new Map(
      userProgress.map(p => [p.skillName.toLowerCase(), p]),
    );

    const currentSkillsLower = new Set(currentSkills.map(s => s.toLowerCase()));

    const requiredSkills = roleSkills.map(rs => {
      const hasSkill = currentSkillsLower.has(rs.skillName.toLowerCase());
      const progress = progressMap.get(rs.skillName.toLowerCase());

      return {
        skillName: rs.skillName,
        category: rs.category.name,
        importance: rs.importance,
        hasSkill,
        userLevel: progress?.level ?? (hasSkill ? 50 : 0),
      };
    });

    const strengths = requiredSkills
      .filter(s => s.hasSkill)
      .map(s => s.skillName);

    const gaps = requiredSkills.filter(s => !s.hasSkill).map(s => s.skillName);

    const totalImportance = requiredSkills.reduce(
      (sum, s) => sum + s.importance,
      0,
    );
    const achievedImportance = requiredSkills
      .filter(s => s.hasSkill)
      .reduce((sum, s) => sum + s.importance, 0);

    const overallReadiness =
      totalImportance > 0
        ? Math.round((achievedImportance / totalImportance) * 100)
        : 0;

    return {
      targetRole,
      overallReadiness,
      requiredSkills,
      strengths,
      gaps,
    };
  }

  async getResources(skillName?: string, difficulty?: string) {
    const where: any = {};
    if (skillName) where.skillName = skillName;
    if (difficulty) where.difficulty = difficulty;

    return this.prisma.learningResource.findMany({
      where,
      orderBy: { skillName: 'asc' },
    });
  }

  async getUserProgress(
    userId: string,
  ): Promise<UserSkillProgressResponseDto[]> {
    const progress = await this.prisma.userSkillProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return progress.map(p => ({
      id: p.id,
      skillName: p.skillName,
      level: p.level,
      status: p.status,
      startedAt: p.startedAt?.toISOString() ?? undefined,
      completedAt: p.completedAt?.toISOString() ?? undefined,
    }));
  }

  async updateProgress(
    userId: string,
    skillName: string,
    level?: number,
    status?: string,
  ) {
    const existing = await this.prisma.userSkillProgress.findUnique({
      where: { userId_skillName: { userId, skillName } },
    });

    const now = new Date();
    const data: {
      level?: number;
      status?: string;
      startedAt?: Date;
      completedAt?: Date;
    } = {
      ...(level !== undefined ? { level } : {}),
      ...(status ? { status } : {}),
    };

    if (status === 'learning' && !existing?.startedAt) {
      data.startedAt = now;
    }
    if (status === 'completed') {
      data.completedAt = now;
      data.level = 100;
    }

    if (existing) {
      return this.prisma.userSkillProgress.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.userSkillProgress.create({
      data: {
        id: generateUuidv7(),
        userId,
        skillName,
        level: level ?? 0,
        status: status ?? 'not_started',
        startedAt: status === 'learning' ? now : undefined,
        completedAt: status === 'completed' ? now : undefined,
      },
    });
  }

  async getLearningRoadmap(
    userId: string,
    targetRole: string,
  ): Promise<LearningRoadmapResponseDto> {
    const roleSkills = await this.prisma.roleSkillMap.findMany({
      where: { role: targetRole },
      include: { category: true },
      orderBy: { importance: 'desc' },
    });

    const userProgress = await this.prisma.userSkillProgress.findMany({
      where: { userId },
    });
    const progressMap = new Map(
      userProgress.map(p => [p.skillName.toLowerCase(), p]),
    );

    const resources = await this.prisma.learningResource.findMany({
      where: {
        skillName: { in: roleSkills.map(rs => rs.skillName) },
      },
    });
    const resourceMap = new Map<string, typeof resources>();
    for (const r of resources) {
      const key = r.skillName.toLowerCase();
      if (!resourceMap.has(key)) resourceMap.set(key, []);
      resourceMap.get(key)!.push(r);
    }

    // Group skills into phases by importance
    const essential = roleSkills.filter(s => s.importance >= 4);
    const intermediate = roleSkills.filter(s => s.importance === 3);
    const advanced = roleSkills.filter(s => s.importance <= 2);

    const mapSkills = (skills: typeof roleSkills) =>
      skills.map(s => {
        const progress = progressMap.get(s.skillName.toLowerCase());
        const skillResources = resourceMap.get(s.skillName.toLowerCase()) ?? [];
        return {
          skillName: s.skillName,
          importance: s.importance,
          status: progress?.status ?? 'not_started',
          level: progress?.level ?? 0,
          resources: skillResources.map(r => ({
            id: r.id,
            skillName: r.skillName,
            title: r.title,
            url: r.url,
            platform: r.platform,
            difficulty: r.difficulty,
            duration: r.duration ?? undefined,
            isFree: r.isFree,
          })),
        };
      });

    const completedCount = roleSkills.filter(s => {
      const p = progressMap.get(s.skillName.toLowerCase());
      return p?.status === 'completed';
    }).length;

    return {
      targetRole,
      totalSkills: roleSkills.length,
      completedSkills: completedCount,
      milestones: [
        {
          phase: 'Foundation',
          description: 'Master the essential skills required for this role',
          skills: mapSkills(essential),
        },
        {
          phase: 'Growth',
          description: 'Build competency in intermediate skills',
          skills: mapSkills(intermediate),
        },
        {
          phase: 'Mastery',
          description: 'Develop advanced skills to stand out',
          skills: mapSkills(advanced),
        },
      ],
    };
  }
}
