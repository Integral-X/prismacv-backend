import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { InterviewDifficulty } from '@prisma/client';

export class InterviewQuestionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() question!: string;
  @ApiPropertyOptional() sampleAnswer?: string;
  @ApiProperty() category!: string;
  @ApiProperty() role!: string;
  @ApiProperty({ enum: InterviewDifficulty }) difficulty!: InterviewDifficulty;
  @ApiPropertyOptional() tips?: string;
}

export class InterviewFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by difficulty',
    enum: InterviewDifficulty,
  })
  @IsOptional()
  @IsEnum(InterviewDifficulty)
  difficulty?: InterviewDifficulty;

  @ApiPropertyOptional({
    description: 'Randomize results',
    default: false,
  })
  @IsOptional()
  random?: string; // query params are strings
}
