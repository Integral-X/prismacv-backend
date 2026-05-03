import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsUrl,
  MinLength,
  Min,
} from 'class-validator';
import { JobStatus } from '@prisma/client';

export class CreateJobRequestDto {
  @ApiProperty({ description: 'Job title', example: 'Software Engineer' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: 'Company name', example: 'Google' })
  @IsString()
  @MinLength(1)
  company!: string;

  @ApiPropertyOptional({ description: 'Job listing URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Job location', example: 'Berlin, DE' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Is remote position', default: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Salary currency', example: 'EUR' })
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional({
    description: 'Application status',
    enum: JobStatus,
    default: 'SAVED',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Notes about this application' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateJobRequestDto {
  @ApiPropertyOptional({ description: 'Job title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ description: 'Company name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  company?: string;

  @ApiPropertyOptional({ description: 'Job listing URL' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ description: 'Job location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Is remote position' })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  @IsOptional()
  @IsInt()
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional({ description: 'Salary currency' })
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional({
    description: 'Application status',
    enum: JobStatus,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateJobStatusRequestDto {
  @ApiProperty({ description: 'New job status', enum: JobStatus })
  @IsEnum(JobStatus)
  status!: JobStatus;
}

export class CreateJobNoteRequestDto {
  @ApiProperty({ description: 'Note content' })
  @IsString()
  @MinLength(1)
  content!: string;
}
