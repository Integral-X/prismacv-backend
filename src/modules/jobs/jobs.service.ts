import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { generateUuidv7 } from '@/shared/utils/uuid.util';
import { PaginationQueryDto } from '@/shared/dto/pagination-query.dto';
import { PaginatedResponseDto } from '@/shared/dto/paginated-response.dto';
import {
  CreateJobRequestDto,
  UpdateJobRequestDto,
} from './dto/request/job.request.dto';
import { JobStatsResponseDto } from './dto/response/job.response.dto';
import type { JobStatus } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async findJobOrThrow(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { jobNotes: { orderBy: { createdAt: 'desc' } } },
    });

    if (!job) {
      throw new NotFoundException(`Job with id ${jobId} not found`);
    }

    if (job.userId !== userId) {
      throw new ForbiddenException('You do not have access to this job');
    }

    return job;
  }

  async create(userId: string, dto: CreateJobRequestDto) {
    const job = await this.prisma.job.create({
      data: {
        id: generateUuidv7(),
        userId,
        title: dto.title,
        company: dto.company,
        url: dto.url,
        location: dto.location,
        isRemote: dto.isRemote ?? false,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency,
        status: dto.status ?? 'SAVED',
        notes: dto.notes,
        appliedAt: dto.status === 'APPLIED' ? new Date() : undefined,
      },
      include: { jobNotes: true },
    });

    this.logger.log(`Job created: ${job.id} for user ${userId}`);
    return job;
  }

  async findAllByUser(
    userId: string,
    pagination: PaginationQueryDto,
    status?: JobStatus,
  ) {
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'title',
      'company',
      'status',
    ];
    const sortBy =
      pagination.sortBy && allowedSortFields.includes(pagination.sortBy)
        ? pagination.sortBy
        : 'updatedAt';

    const where = {
      userId,
      ...(status ? { status } : {}),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { [sortBy]: pagination.sortOrder },
        include: { jobNotes: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
      this.prisma.job.count({ where }),
    ]);

    return PaginatedResponseDto.create(
      jobs,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  async findOne(jobId: string, userId: string) {
    return this.findJobOrThrow(jobId, userId);
  }

  async update(jobId: string, userId: string, dto: UpdateJobRequestDto) {
    const existing = await this.findJobOrThrow(jobId, userId);

    const data: {
      title?: string;
      company?: string;
      url?: string;
      location?: string;
      isRemote?: boolean;
      salaryMin?: number;
      salaryMax?: number;
      salaryCurrency?: string;
      status?: JobStatus;
      notes?: string;
      appliedAt?: Date;
    } = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.company !== undefined) data.company = dto.company;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.isRemote !== undefined) data.isRemote = dto.isRemote;
    if (dto.salaryMin !== undefined) data.salaryMin = dto.salaryMin;
    if (dto.salaryMax !== undefined) data.salaryMax = dto.salaryMax;
    if (dto.salaryCurrency !== undefined) data.salaryCurrency = dto.salaryCurrency;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    // Set appliedAt when status changes to APPLIED
    if (dto.status === 'APPLIED' && !existing.appliedAt) {
      data.appliedAt = new Date();
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data,
      include: { jobNotes: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async updateStatus(jobId: string, userId: string, status: JobStatus) {
    const existing = await this.findJobOrThrow(jobId, userId);

    const data: { status: JobStatus; appliedAt?: Date } = { status };
    if (status === 'APPLIED' && !existing.appliedAt) {
      data.appliedAt = new Date();
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data,
      include: { jobNotes: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async remove(jobId: string, userId: string) {
    await this.findJobOrThrow(jobId, userId);
    await this.prisma.job.delete({ where: { id: jobId } });
    this.logger.log(`Job deleted: ${jobId}`);
  }

  async addNote(jobId: string, userId: string, content: string) {
    await this.findJobOrThrow(jobId, userId);

    return this.prisma.jobNote.create({
      data: {
        id: generateUuidv7(),
        jobId,
        content,
      },
    });
  }

  async deleteNote(jobId: string, noteId: string, userId: string) {
    await this.findJobOrThrow(jobId, userId);

    const note = await this.prisma.jobNote.findUnique({
      where: { id: noteId },
    });
    if (!note || note.jobId !== jobId) {
      throw new NotFoundException('Note not found');
    }

    await this.prisma.jobNote.delete({ where: { id: noteId } });
  }

  async getStats(userId: string): Promise<JobStatsResponseDto> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [total, statusCounts, appliedThisWeek] = await Promise.all([
      this.prisma.job.count({ where: { userId } }),
      this.prisma.job.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
      this.prisma.job.count({
        where: { userId, appliedAt: { gte: oneWeekAgo } },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = row._count.status;
    }

    return {
      total,
      byStatus,
      appliedThisWeek,
      pendingInterviews: byStatus['INTERVIEW'] || 0,
      activeOffers: byStatus['OFFER'] || 0,
    };
  }
}
