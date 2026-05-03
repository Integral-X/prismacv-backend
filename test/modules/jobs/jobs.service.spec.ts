import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { JobsService } from '@/modules/jobs/jobs.service';
import { PrismaService } from '@/config/prisma.service';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: DeepMockProxy<PrismaService>;

  const userId = 'user-123';
  const jobId = 'job-456';

  const mockJob = {
    id: jobId,
    userId,
    title: 'Software Engineer',
    company: 'TechCorp',
    url: 'https://example.com/job',
    location: 'Remote',
    isRemote: true,
    salaryMin: 80000,
    salaryMax: 120000,
    salaryCurrency: 'USD',
    status: 'SAVED' as const,
    appliedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    jobNotes: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a job with SAVED status by default', async () => {
      prisma.job.create.mockResolvedValue(mockJob);

      const result = await service.create(userId, {
        title: 'Software Engineer',
        company: 'TechCorp',
      });

      expect(result).toEqual(mockJob);
      expect(prisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            title: 'Software Engineer',
            company: 'TechCorp',
            status: 'SAVED',
          }),
        }),
      );
    });

    it('should set appliedAt when status is APPLIED', async () => {
      const appliedJob = { ...mockJob, status: 'APPLIED' as const, appliedAt: new Date() };
      prisma.job.create.mockResolvedValue(appliedJob);

      await service.create(userId, {
        title: 'Dev',
        company: 'Corp',
        status: 'APPLIED',
      });

      expect(prisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPLIED',
            appliedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a job owned by the user', async () => {
      prisma.job.findUnique.mockResolvedValue(mockJob);

      const result = await service.findOne(jobId, userId);
      expect(result).toEqual(mockJob);
    });

    it('should throw NotFoundException when job does not exist', async () => {
      prisma.job.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own the job', async () => {
      prisma.job.findUnique.mockResolvedValue({ ...mockJob, userId: 'other-user' });

      await expect(service.findOne(jobId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a job owned by the user', async () => {
      prisma.job.findUnique.mockResolvedValue(mockJob);
      prisma.job.delete.mockResolvedValue(mockJob);

      await service.remove(jobId, userId);
      expect(prisma.job.delete).toHaveBeenCalledWith({ where: { id: jobId } });
    });

    it('should throw when job not found', async () => {
      prisma.job.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregated stats', async () => {
      prisma.job.count.mockResolvedValueOnce(3); // total
      (prisma.job.groupBy as jest.Mock).mockResolvedValueOnce([
        { status: 'SAVED', _count: { status: 1 } },
        { status: 'APPLIED', _count: { status: 1 } },
        { status: 'INTERVIEW', _count: { status: 1 } },
      ]);
      prisma.job.count.mockResolvedValueOnce(1); // appliedThisWeek

      const result = await service.getStats(userId);
      expect(result).toHaveProperty('total', 3);
      expect(result).toHaveProperty('byStatus');
      expect(result.byStatus).toEqual({ SAVED: 1, APPLIED: 1, INTERVIEW: 1 });
      expect(result).toHaveProperty('appliedThisWeek', 1);
      expect(result).toHaveProperty('pendingInterviews', 1);
      expect(result).toHaveProperty('activeOffers', 0);
    });
  });
});
