import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { SkillsService } from '@/modules/skills/skills.service';
import { PrismaService } from '@/config/prisma.service';

describe('SkillsService', () => {
  let service: SkillsService;
  let prisma: DeepMockProxy<PrismaService>;

  const userId = 'user-123';

  const mockCategory = {
    id: 'cat-1',
    name: 'Programming Languages',
    description: 'Core languages',
    icon: 'code',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoleSkillMap = {
    id: 'rs-1',
    role: 'Software Engineer',
    skillName: 'TypeScript',
    categoryId: 'cat-1',
    importance: 5,
    description: null,
    category: mockCategory,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCategories', () => {
    it('should return all skill categories', async () => {
      prisma.skillCategory.findMany.mockResolvedValue([mockCategory]);

      const result = await service.getCategories();
      expect(result).toEqual([mockCategory]);
      expect(prisma.skillCategory.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getRoles', () => {
    it('should return distinct roles', async () => {
      prisma.roleSkillMap.findMany.mockResolvedValue([
        { ...mockRoleSkillMap, role: 'Software Engineer' },
        { ...mockRoleSkillMap, role: 'Product Manager' },
      ]);

      const result = await service.getRoles();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('assessSkills', () => {
    it('should return assessment with readiness score', async () => {
      prisma.roleSkillMap.findMany.mockResolvedValue([
        { ...mockRoleSkillMap, skillName: 'TypeScript', importance: 5 },
        { ...mockRoleSkillMap, skillName: 'React', importance: 4 },
      ] as never);
      prisma.userSkillProgress.findMany.mockResolvedValue([]);

      const result = await service.assessSkills(
        userId,
        'Software Engineer',
        ['TypeScript', 'React'],
      );

      expect(result).toHaveProperty('targetRole', 'Software Engineer');
      expect(result).toHaveProperty('overallReadiness');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('gaps');
      expect(result.overallReadiness).toBeGreaterThanOrEqual(0);
      expect(result.overallReadiness).toBeLessThanOrEqual(100);
    });

    it('should identify gaps for missing skills', async () => {
      prisma.roleSkillMap.findMany.mockResolvedValue([
        { ...mockRoleSkillMap, skillName: 'TypeScript', importance: 5 },
        { ...mockRoleSkillMap, skillName: 'React', importance: 4 },
        { ...mockRoleSkillMap, skillName: 'Docker', importance: 3 },
      ] as never);
      prisma.userSkillProgress.findMany.mockResolvedValue([]);

      const result = await service.assessSkills(
        userId,
        'Software Engineer',
        ['TypeScript'],
      );

      // Should have gaps for React and Docker (not in currentSkills)
      expect(result.gaps).toContain('React');
      expect(result.gaps).toContain('Docker');
      expect(result.strengths).toContain('TypeScript');
    });
  });

  describe('getResources', () => {
    it('should return learning resources', async () => {
      const mockResource = {
        id: 'lr-1',
        skillName: 'TypeScript',
        title: 'TS Handbook',
        url: 'https://example.com',
        platform: 'Official',
        difficulty: 'beginner',
        duration: '10h',
        isFree: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.learningResource.findMany.mockResolvedValue([mockResource]);

      const result = await service.getResources();
      expect(result).toEqual([mockResource]);
    });

    it('should filter by skill name', async () => {
      prisma.learningResource.findMany.mockResolvedValue([]);

      await service.getResources('TypeScript');
      expect(prisma.learningResource.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ skillName: 'TypeScript' }),
        }),
      );
    });
  });
});
