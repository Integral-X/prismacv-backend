import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';
import { InterviewService } from './interview.service';
import type { InterviewDifficulty } from '@prisma/client';

@ApiTags('Interview Preparation')
@Public()
@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Get('questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List interview questions',
    description: 'Returns paginated interview questions with optional filters.',
  })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: ['EASY', 'MEDIUM', 'HARD'],
  })
  @ApiQuery({ name: 'random', required: false })
  @ApiResponse({ status: 200, description: 'Paginated question list' })
  async getQuestions(
    @Query() pagination: PaginationQueryDto,
    @Query('role') role?: string,
    @Query('category') category?: string,
    @Query('difficulty') difficulty?: InterviewDifficulty,
    @Query('random') random?: string,
  ) {
    const result = await this.interviewService.findAll(
      pagination,
      role,
      category,
      difficulty,
      random === 'true',
    );
    return {
      data: result.data.map(q => ({
        id: q.id,
        question: q.question,
        sampleAnswer: q.sampleAnswer ?? undefined,
        category: q.category,
        role: q.role,
        difficulty: q.difficulty,
        tips: q.tips ?? undefined,
      })),
      meta: result.meta,
    };
  }

  @Get('roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List interview roles',
    description: 'Returns distinct roles available for interview prep.',
  })
  @ApiResponse({ status: 200, type: [String] })
  async getRoles(): Promise<string[]> {
    return this.interviewService.getRoles();
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List interview categories',
    description: 'Returns distinct question categories.',
  })
  @ApiResponse({ status: 200, type: [String] })
  async getCategories(): Promise<string[]> {
    return this.interviewService.getCategories();
  }
}
