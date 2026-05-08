import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import { Job, Queue, Worker, type JobsOptions } from 'bullmq';
import { CvService } from '@/modules/cv/cv.service';
import { CvExportService } from '@/modules/cv/cv-export.service';
import { buildCvHtml } from '@/modules/cv/templates/cv-html-builder';
import { AiService } from '@/modules/ai/ai.service';

type QueueTaskName = 'pdf_export' | 'ai_analyze' | 'ai_optimize';

interface PdfExportPayload {
  userId: string;
  cvId: string;
}

interface AiAnalyzePayload {
  userId: string;
  cvId: string;
}

interface AiOptimizePayload {
  userId: string;
  cvId: string;
  jobDescription: string;
}

type QueueTaskPayload = PdfExportPayload | AiAnalyzePayload | AiOptimizePayload;

interface QueueTaskResult {
  [key: string]: unknown;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queueName: string;
  private readonly queueEnabled: boolean;
  private queue: Queue<
    QueueTaskPayload,
    QueueTaskResult,
    QueueTaskName
  > | null = null;
  private worker: Worker<
    QueueTaskPayload,
    QueueTaskResult,
    QueueTaskName
  > | null = null;
  private connection: IORedis | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly cvService: CvService,
    private readonly cvExportService: CvExportService,
    private readonly aiService: AiService,
  ) {
    this.queueName =
      this.configService.get<string>('QUEUE_NAME')?.trim() ?? 'prismacv-jobs';
    this.queueEnabled =
      this.configService.get<string>('QUEUE_ENABLED', 'false') === 'true';
  }

  onModuleInit(): void {
    if (!this.queueEnabled) {
      this.logger.log('Background queue is disabled (QUEUE_ENABLED=false).');
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL')?.trim();
    if (!redisUrl) {
      this.logger.warn(
        'QUEUE_ENABLED is true but REDIS_URL is missing. Queue endpoints will return 503.',
      );
      return;
    }

    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.queue = new Queue(this.queueName, {
      connection: this.connection,
    });

    this.worker = new Worker(
      this.queueName,
      async job => this.processJob(job),
      {
        connection: this.connection,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Queue job failed: ${job?.id ?? 'unknown'} (${job?.name ?? 'unknown'}) - ${error.message}`,
      );
    });

    this.logger.log(`Background queue initialized: ${this.queueName}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueuePdfExport(userId: string, cvId: string): Promise<string> {
    const job = await this.addJob('pdf_export', { userId, cvId });
    return job.id as string;
  }

  async enqueueAiAnalyze(userId: string, cvId: string): Promise<string> {
    const job = await this.addJob('ai_analyze', { userId, cvId });
    return job.id as string;
  }

  async enqueueAiOptimize(
    userId: string,
    cvId: string,
    jobDescription: string,
  ): Promise<string> {
    const job = await this.addJob('ai_optimize', {
      userId,
      cvId,
      jobDescription,
    });
    return job.id as string;
  }

  async getJobStatus(
    userId: string,
    jobId: string,
  ): Promise<{
    id: string;
    state: string;
    type: string;
    result?: unknown;
    error?: string | null;
    processedOn: string | null;
    finishedOn: string | null;
  }> {
    const queue = this.assertQueueAvailable();
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Queue job ${jobId} was not found.`);
    }

    const dataUserId = this.extractUserId(job.data);
    if (dataUserId !== userId) {
      throw new ForbiddenException('You do not have access to this queue job.');
    }

    const state = await job.getState();
    return {
      id: String(job.id),
      state,
      type: job.name,
      result: job.returnvalue ?? undefined,
      error: job.failedReason ?? null,
      processedOn: job.processedOn
        ? new Date(job.processedOn).toISOString()
        : null,
      finishedOn: job.finishedOn
        ? new Date(job.finishedOn).toISOString()
        : null,
    };
  }

  private async addJob(
    name: QueueTaskName,
    data: QueueTaskPayload,
  ): Promise<Job<QueueTaskPayload, QueueTaskResult, QueueTaskName>> {
    const queue = this.assertQueueAvailable();
    const options: JobsOptions = {
      removeOnComplete: {
        age: 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 60 * 60,
        count: 1000,
      },
      attempts: 1,
    };
    return queue.add(name, data, options);
  }

  private assertQueueAvailable(): Queue<
    QueueTaskPayload,
    QueueTaskResult,
    QueueTaskName
  > {
    if (!this.queueEnabled || !this.queue) {
      throw new ServiceUnavailableException(
        'Background queue is unavailable. Set QUEUE_ENABLED=true and REDIS_URL.',
      );
    }
    return this.queue;
  }

  private async processJob(
    job: Job<QueueTaskPayload, QueueTaskResult, QueueTaskName>,
  ): Promise<QueueTaskResult> {
    switch (job.name) {
      case 'pdf_export': {
        const payload = job.data as PdfExportPayload;
        const cv = await this.cvService.findOne(payload.cvId, payload.userId);
        const html = buildCvHtml(cv as never);
        const pdf = await this.cvExportService.generatePdf(html);
        return {
          filename: `${cv.slug || 'cv'}.pdf`,
          contentType: 'application/pdf',
          base64: pdf.toString('base64'),
        };
      }
      case 'ai_analyze': {
        const payload = job.data as AiAnalyzePayload;
        return this.aiService.analyzeCv(
          payload.cvId,
          payload.userId,
        ) as unknown as QueueTaskResult;
      }
      case 'ai_optimize': {
        const payload = job.data as AiOptimizePayload;
        return this.aiService.optimizeCvForJob(
          payload.cvId,
          payload.userId,
          payload.jobDescription,
        ) as unknown as QueueTaskResult;
      }
      default:
        throw new Error(`Unsupported queue job type: ${job.name as string}`);
    }
  }

  private extractUserId(payload: QueueTaskPayload): string {
    return payload.userId;
  }
}
