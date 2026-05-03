import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { SkillsService } from './skills.service';
import {
  AssessSkillsRequestDto,
  UpdateSkillProgressRequestDto,
  SkillGapResponseDto,
  SkillCategoryResponseDto,
  LearningResourceResponseDto,
  UserSkillProgressResponseDto,
  LearningRoadmapResponseDto,
} from './dto/skills.dto';

@ApiTags('Skills & Career Development')
@ApiBearerAuth('JWT-auth')
@Public()
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('categories')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List skill categories',
    description: 'Returns all skill categories.',
  })
  @ApiResponse({ status: 200, type: [SkillCategoryResponseDto] })
  async getCategories() {
    const categories = await this.skillsService.getCategories();
    return categories.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description ?? undefined,
      icon: c.icon ?? undefined,
    }));
  }

  @Get('roles')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List available roles',
    description: 'Returns distinct roles that have skill mappings.',
  })
  @ApiResponse({ status: 200, type: [String] })
  async getRoles(): Promise<string[]> {
    return this.skillsService.getRoles();
  }

  @Post('assess')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assess skill gap',
    description:
      'Evaluates user skills against a target role and returns gap analysis.',
  })
  @ApiBody({ type: AssessSkillsRequestDto })
  @ApiResponse({ status: 200, type: SkillGapResponseDto })
  async assessSkills(
    @GetUser() user: User,
    @Body() dto: AssessSkillsRequestDto,
  ): Promise<SkillGapResponseDto> {
    return this.skillsService.assessSkills(
      user.id,
      dto.targetRole,
      dto.currentSkills ?? [],
    );
  }

  @Get('resources')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List learning resources',
    description: 'Returns learning resources, optionally filtered by skill.',
  })
  @ApiQuery({ name: 'skill', required: false })
  @ApiQuery({
    name: 'difficulty',
    required: false,
    enum: ['beginner', 'intermediate', 'advanced'],
  })
  @ApiResponse({ status: 200, type: [LearningResourceResponseDto] })
  async getResources(
    @Query('skill') skill?: string,
    @Query('difficulty') difficulty?: string,
  ): Promise<LearningResourceResponseDto[]> {
    const resources = await this.skillsService.getResources(skill, difficulty);
    return resources.map(r => ({
      id: r.id,
      skillName: r.skillName,
      title: r.title,
      url: r.url,
      platform: r.platform,
      difficulty: r.difficulty,
      duration: r.duration ?? undefined,
      isFree: r.isFree,
    }));
  }

  @Get('progress')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user skill progress',
    description: 'Returns all skill progress records for the user.',
  })
  @ApiResponse({ status: 200, type: [UserSkillProgressResponseDto] })
  async getProgress(
    @GetUser() user: User,
  ): Promise<UserSkillProgressResponseDto[]> {
    return this.skillsService.getUserProgress(user.id);
  }

  @Patch('progress')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update skill progress',
    description: 'Updates or creates a skill progress record.',
  })
  @ApiBody({ type: UpdateSkillProgressRequestDto })
  @ApiResponse({ status: 200, type: UserSkillProgressResponseDto })
  async updateProgress(
    @GetUser() user: User,
    @Body() dto: UpdateSkillProgressRequestDto,
  ): Promise<UserSkillProgressResponseDto> {
    const progress = await this.skillsService.updateProgress(
      user.id,
      dto.skillName,
      dto.level,
      dto.status,
    );
    return {
      id: progress.id,
      skillName: progress.skillName,
      level: progress.level,
      status: progress.status,
      startedAt: progress.startedAt?.toISOString() ?? undefined,
      completedAt: progress.completedAt?.toISOString() ?? undefined,
    };
  }

  @Get('roadmap')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get learning roadmap',
    description:
      'Returns a phased learning plan for a target role with resources.',
  })
  @ApiQuery({ name: 'role', required: true })
  @ApiResponse({ status: 200, type: LearningRoadmapResponseDto })
  async getRoadmap(
    @GetUser() user: User,
    @Query('role') role: string,
  ): Promise<LearningRoadmapResponseDto> {
    return this.skillsService.getLearningRoadmap(user.id, role);
  }
}
