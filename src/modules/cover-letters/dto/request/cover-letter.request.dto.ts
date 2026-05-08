import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength, IsIn } from 'class-validator';

const COVER_LETTER_TEMPLATES = [
  'classic_professional',
  'impact_story',
  'concise_modern',
] as const;

export class CreateCoverLetterRequestDto {
  @ApiProperty({ example: 'Software Engineer at Google' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Link to an existing CV' })
  @IsOptional()
  @IsUUID()
  cvId?: string;

  @ApiPropertyOptional({ example: 'Senior Frontend Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({
    example: 'professional',
    description: 'Tone of the cover letter',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tone?: string;

  @ApiPropertyOptional({ description: 'Cover letter body text' })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;
}

export class UpdateCoverLetterRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  cvId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;
}

export class GenerateCoverLetterRequestDto {
  @ApiProperty({ description: 'CV to base the cover letter on' })
  @IsUUID()
  cvId!: string;

  @ApiPropertyOptional({ example: 'Senior Frontend Engineer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'Google' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiPropertyOptional({ description: 'Job description to tailor to' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  jobDescription?: string;

  @ApiPropertyOptional({
    example: 'professional',
    description: 'Tone: professional, casual, enthusiastic',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  tone?: string;

  @ApiPropertyOptional({
    description: 'Template style for generated output',
    enum: COVER_LETTER_TEMPLATES,
    example: 'classic_professional',
  })
  @IsOptional()
  @IsString()
  @IsIn(COVER_LETTER_TEMPLATES)
  template?: (typeof COVER_LETTER_TEMPLATES)[number];
}
