import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsArray } from 'class-validator';

export class AtsScoreRequestDto {
  @ApiProperty({ description: 'Full CV text content or sections joined' })
  @IsString()
  @MaxLength(20000)
  cvText!: string;

  @ApiProperty({ description: 'Target job description text' })
  @IsString()
  @MaxLength(10000)
  jobDescription!: string;

  @ApiPropertyOptional({ description: 'List of skills from the CV' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
}
