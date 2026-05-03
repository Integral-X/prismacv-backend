import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import { JobsService } from './jobs.service';
import { JobsMapper } from './jobs.mapper';
import {
  CreateJobRequestDto,
  UpdateJobRequestDto,
  UpdateJobStatusRequestDto,
  CreateJobNoteRequestDto,
} from './dto/request/job.request.dto';
import {
  JobResponseDto,
  JobNoteResponseDto,
  JobStatsResponseDto,
} from './dto/response/job.response.dto';
import type { JobStatus } from '@prisma/client';

@ApiTags('Jobs')
@ApiBearerAuth('JWT-auth')
@Public()
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobsMapper: JobsMapper,
  ) {}

  @Post()
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new job application',
    description: 'Tracks a new job application for the authenticated user.',
  })
  @ApiBody({ type: CreateJobRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Job created',
    type: JobResponseDto,
  })
  async create(
    @GetUser() user: User,
    @Body() dto: CreateJobRequestDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.create(user.id, dto);
    return this.jobsMapper.jobToResponse(job);
  }

  @Get()
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List job applications',
    description:
      'Returns a paginated list of job applications. Optionally filter by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED'],
  })
  @ApiResponse({ status: 200, description: 'Paginated job list' })
  async findAll(
    @GetUser() user: User,
    @Query() pagination: PaginationQueryDto,
    @Query('status') status?: JobStatus,
  ): Promise<PaginatedResponseDto<JobResponseDto>> {
    const result = await this.jobsService.findAllByUser(
      user.id,
      pagination,
      status,
    );
    return PaginatedResponseDto.create(
      result.data.map(job => this.jobsMapper.jobToResponse(job)),
      result.meta.total,
      result.meta.page,
      result.meta.limit,
    );
  }

  @Get('stats')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get job application statistics',
    description: 'Returns aggregate stats: counts by status, weekly rate.',
  })
  @ApiResponse({ status: 200, type: JobStatsResponseDto })
  async getStats(@GetUser() user: User): Promise<JobStatsResponseDto> {
    return this.jobsService.getStats(user.id);
  }

  @Get(':id')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a job application by ID',
    description: 'Returns job details with notes.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 200, type: JobResponseDto })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async findOne(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.findOne(id, user.id);
    return this.jobsMapper.jobToResponse(job);
  }

  @Patch(':id')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a job application',
    description: 'Updates job details.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiBody({ type: UpdateJobRequestDto })
  @ApiResponse({ status: 200, type: JobResponseDto })
  async update(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobRequestDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.update(id, user.id, dto);
    return this.jobsMapper.jobToResponse(job);
  }

  @Patch(':id/status')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update job application status',
    description: 'Changes the status of a job application (e.g., for kanban).',
  })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiBody({ type: UpdateJobStatusRequestDto })
  @ApiResponse({ status: 200, type: JobResponseDto })
  async updateStatus(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobStatusRequestDto,
  ): Promise<JobResponseDto> {
    const job = await this.jobsService.updateStatus(id, user.id, dto.status);
    return this.jobsMapper.jobToResponse(job);
  }

  @Delete(':id')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a job application',
    description: 'Permanently deletes a job application and all its notes.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({ status: 204, description: 'Job deleted' })
  async remove(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.jobsService.remove(id, user.id);
  }

  // ─── Notes ───────────────────────────────────────────────────────────────

  @Post(':id/notes')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a note to a job application',
    description: 'Creates a new note attached to a job application.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiBody({ type: CreateJobNoteRequestDto })
  @ApiResponse({ status: 201, type: JobNoteResponseDto })
  async addNote(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateJobNoteRequestDto,
  ): Promise<JobNoteResponseDto> {
    const note = await this.jobsService.addNote(id, user.id, dto.content);
    return this.jobsMapper.noteToResponse(note);
  }

  @Delete(':id/notes/:noteId')
  @UseGuards(JwtUserAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a note from a job application',
  })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiParam({ name: 'noteId', description: 'Note UUID' })
  @ApiResponse({ status: 204, description: 'Note deleted' })
  async deleteNote(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ): Promise<void> {
    await this.jobsService.deleteNote(id, noteId, user.id);
  }
}
