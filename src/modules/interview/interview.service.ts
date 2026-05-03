import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import type { InterviewDifficulty } from '@prisma/client';

@Injectable()
export class InterviewService {
  private readonly logger = new Logger(InterviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    pagination: PaginationQueryDto,
    role?: string,
    category?: string,
    difficulty?: InterviewDifficulty,
    random?: boolean,
  ) {
    const where: any = {};
    if (role) where.role = role;
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    if (random) {
      // For random selection, get all matching and shuffle
      const all = await this.prisma.interviewQuestion.findMany({ where });
      const shuffled = this.shuffleArray(all);
      const paginated = shuffled.slice(
        pagination.skip,
        pagination.skip + pagination.take,
      );
      return PaginatedResponseDto.create(
        paginated,
        all.length,
        pagination.page,
        pagination.limit,
      );
    }

    const [questions, total] = await Promise.all([
      this.prisma.interviewQuestion.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.interviewQuestion.count({ where }),
    ]);

    return PaginatedResponseDto.create(
      questions,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async getRoles(): Promise<string[]> {
    const roles = await this.prisma.interviewQuestion.findMany({
      select: { role: true },
      distinct: ['role'],
      orderBy: { role: 'asc' },
    });
    return roles.map(r => r.role);
  }

  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.interviewQuestion.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return categories.map(c => c.category);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
