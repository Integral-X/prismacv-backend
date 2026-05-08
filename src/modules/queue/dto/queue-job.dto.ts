import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class QueuePdfExportRequestDto {
  @ApiProperty({
    description: 'CV UUID to export in the background',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  cvId!: string;
}

export class QueueAiAnalyzeRequestDto {
  @ApiProperty({
    description: 'CV UUID to analyze in the background',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  cvId!: string;
}

export class QueueAiOptimizeRequestDto {
  @ApiProperty({
    description: 'CV UUID to optimize in the background',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  cvId!: string;

  @ApiProperty({
    description: 'Job description used to optimize the CV',
    example: 'Looking for a backend engineer with NestJS and Kubernetes.',
  })
  @IsString()
  @IsNotEmpty()
  jobDescription!: string;
}

export class QueueJobAcceptedResponseDto {
  @ApiProperty({ example: '12345' })
  jobId!: string;

  @ApiProperty({
    example: '/api/v1/queue/jobs/12345',
    description: 'Poll this endpoint to retrieve queue job status and result.',
  })
  statusUrl!: string;
}

export class QueueJobStatusResponseDto {
  @ApiProperty({ example: '12345' })
  id!: string;

  @ApiProperty({
    example: 'completed',
    enum: [
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused',
      'waiting-children',
      'unknown',
    ],
  })
  state!: string;

  @ApiProperty({ example: 'pdf_export' })
  type!: string;

  @ApiProperty({ required: false, nullable: true })
  result?: unknown;

  @ApiProperty({ required: false, nullable: true })
  error?: string | null;

  @ApiProperty({ type: String, nullable: true })
  processedOn!: string | null;

  @ApiProperty({ type: String, nullable: true })
  finishedOn!: string | null;
}
