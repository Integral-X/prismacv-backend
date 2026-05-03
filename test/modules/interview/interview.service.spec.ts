import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { InterviewService } from '@/modules/interview/interview.service';
import { PrismaService } from '@/config/prisma.service';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';

function makePagination(page = 1, limit = 10): PaginationQueryDto {
  const p = new PaginationQueryDto();
  p.page = page;
  p.limit = limit;
  return p;
}

describe('InterviewService', () => {
  let service: InterviewService;
  let prisma: DeepMockProxy<PrismaService>;

  const mockQuestion = {
    id: 'q-1',
    question: 'Tell me about yourself',
    sampleAnswer: 'I am a software engineer...',
    category: 'Behavioral',
    role: 'Software Engineer',
    difficulty: 'EASY' as const,
    tips: 'Be concise',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<InterviewService>(InterviewService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated questions', async () => {
      prisma.interviewQuestion.findMany.mockResolvedValue([mockQuestion]);
      prisma.interviewQuestion.count.mockResolvedValue(1);

      const result = await service.findAll(makePagination());

      expect(result).toBeDefined();
      expect(prisma.interviewQuestion.findMany).toHaveBeenCalled();
    });

    it('should filter by role', async () => {
      prisma.interviewQuestion.findMany.mockResolvedValue([mockQuestion]);
      prisma.interviewQuestion.count.mockResolvedValue(1);

      await service.findAll(makePagination(), 'Software Engineer');

      expect(prisma.interviewQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'Software Engineer' }),
        }),
      );
    });
  });

  describe('getRoles', () => {
    it('should return distinct roles', async () => {
      prisma.interviewQuestion.findMany.mockResolvedValue([
        { ...mockQuestion, role: 'Software Engineer' },
        { ...mockQuestion, role: 'Product Manager' },
      ]);

      const result = await service.getRoles();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCategories', () => {
    it('should return distinct categories', async () => {
      prisma.interviewQuestion.findMany.mockResolvedValue([
        { ...mockQuestion, category: 'Behavioral' },
        { ...mockQuestion, category: 'Technical' },
      ]);

      const result = await service.getCategories();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
