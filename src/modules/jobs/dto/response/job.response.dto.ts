import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';

export class JobNoteResponseDto {
  @ApiProperty({ description: 'Note ID' })
  id!: string;

  @ApiProperty({ description: 'Note content' })
  content!: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: string;
}

export class JobResponseDto {
  @ApiProperty({ description: 'Job ID' })
  id!: string;

  @ApiProperty({ description: 'Job title' })
  title!: string;

  @ApiProperty({ description: 'Company name' })
  company!: string;

  @ApiPropertyOptional({ description: 'Job listing URL' })
  url?: string;

  @ApiPropertyOptional({ description: 'Location' })
  location?: string;

  @ApiProperty({ description: 'Is remote' })
  isRemote!: boolean;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Salary currency' })
  salaryCurrency?: string;

  @ApiProperty({ description: 'Application status', enum: JobStatus })
  status!: JobStatus;

  @ApiPropertyOptional({ description: 'Application date' })
  appliedAt?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: string;

  @ApiPropertyOptional({ description: 'Job notes', type: [JobNoteResponseDto] })
  jobNotes?: JobNoteResponseDto[];
}

export class JobStatsResponseDto {
  @ApiProperty({ description: 'Total jobs' })
  total!: number;

  @ApiProperty({ description: 'Jobs by status' })
  byStatus!: Record<string, number>;

  @ApiProperty({ description: 'Applications this week' })
  appliedThisWeek!: number;

  @ApiProperty({ description: 'Pending interviews' })
  pendingInterviews!: number;

  @ApiProperty({ description: 'Active offers' })
  activeOffers!: number;
}
