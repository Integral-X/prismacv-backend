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
    await this.findJobOrThrow(jobId, userId);

    const data: any = { ...dto };

    // Set appliedAt when status changes to APPLIED
    if (dto.status === 'APPLIED') {
      const existing = await this.prisma.job.findUnique({
        where: { id: jobId },
      });
      if (existing && !existing.appliedAt) {
        data.appliedAt = new Date();
      }
    }

    return this.prisma.job.update({
      where: { id: jobId },
      data,
      include: { jobNotes: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async updateStatus(jobId: string, userId: string, status: JobStatus) {
    await this.findJobOrThrow(jobId, userId);

    const data: any = { status };
    if (status === 'APPLIED') {
      const existing = await this.prisma.job.findUnique({
        where: { id: jobId },
      });
      if (existing && !existing.appliedAt) {
        data.appliedAt = new Date();
      }
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
    const jobs = await this.prisma.job.findMany({
      where: { userId },
      select: { status: true, appliedAt: true },
    });

    const byStatus: Record<string, number> = {};
    for (const job of jobs) {
      byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const appliedThisWeek = jobs.filter(
      j => j.appliedAt && j.appliedAt >= oneWeekAgo,
    ).length;

    return {
      total: jobs.length,
      byStatus,
      appliedThisWeek,
      pendingInterviews: byStatus['INTERVIEW'] || 0,
      activeOffers: byStatus['OFFER'] || 0,
    };
  }
}
