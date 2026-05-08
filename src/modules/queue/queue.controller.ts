import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserPlan } from '@prisma/client';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { RequiresPlanGuard } from '@/modules/billing/requires-plan.guard';
import { RequiresPlan } from '@/modules/billing/decorators/requires-plan.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { User } from '@/modules/auth/entities/user.entity';
import {
  QueueAiAnalyzeRequestDto,
  QueueAiOptimizeRequestDto,
  QueueJobAcceptedResponseDto,
  QueueJobStatusResponseDto,
  QueuePdfExportRequestDto,
} from './dto/queue-job.dto';
import { QueueService } from './queue.service';

@ApiTags('Queue')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtUserAuthGuard)
@Controller('queue/jobs')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('pdf-export')
  @UseGuards(RequiresPlanGuard)
  @RequiresPlan({
    plans: [UserPlan.PRO, UserPlan.TEAM],
    feature: 'cv_pdf_export',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue a background CV PDF export job' })
  @ApiResponse({
    status: 202,
    description: 'Background job accepted',
    type: QueueJobAcceptedResponseDto,
  })
  async queuePdfExport(
    @GetUser() user: User,
    @Body() dto: QueuePdfExportRequestDto,
  ): Promise<QueueJobAcceptedResponseDto> {
    const jobId = await this.queueService.enqueuePdfExport(user.id, dto.cvId);
    return {
      jobId,
      statusUrl: `/api/v1/queue/jobs/${jobId}`,
    };
  }

  @Post('ai/analyze')
  @UseGuards(RequiresPlanGuard)
  @RequiresPlan({
    plans: [UserPlan.PRO, UserPlan.TEAM],
    feature: 'ai_cv_analysis',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue a background AI CV analysis job' })
  @ApiResponse({
    status: 202,
    description: 'Background job accepted',
    type: QueueJobAcceptedResponseDto,
  })
  async queueAiAnalyze(
    @GetUser() user: User,
    @Body() dto: QueueAiAnalyzeRequestDto,
  ): Promise<QueueJobAcceptedResponseDto> {
    const jobId = await this.queueService.enqueueAiAnalyze(user.id, dto.cvId);
    return {
      jobId,
      statusUrl: `/api/v1/queue/jobs/${jobId}`,
    };
  }

  @Post('ai/optimize')
  @UseGuards(RequiresPlanGuard)
  @RequiresPlan({
    plans: [UserPlan.PRO, UserPlan.TEAM],
    feature: 'ai_cv_optimization',
  })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Queue a background AI CV optimization job' })
  @ApiResponse({
    status: 202,
    description: 'Background job accepted',
    type: QueueJobAcceptedResponseDto,
  })
  async queueAiOptimize(
    @GetUser() user: User,
    @Body() dto: QueueAiOptimizeRequestDto,
  ): Promise<QueueJobAcceptedResponseDto> {
    const jobId = await this.queueService.enqueueAiOptimize(
      user.id,
      dto.cvId,
      dto.jobDescription,
    );
    return {
      jobId,
      statusUrl: `/api/v1/queue/jobs/${jobId}`,
    };
  }

  @Get(':jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get background queue job status and result' })
  @ApiResponse({
    status: 200,
    description: 'Queue job status',
    type: QueueJobStatusResponseDto,
  })
  async getJobStatus(
    @GetUser() user: User,
    @Param('jobId') jobId: string,
  ): Promise<QueueJobStatusResponseDto> {
    return this.queueService.getJobStatus(user.id, jobId);
  }
}
