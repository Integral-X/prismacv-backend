import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoverLetterResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  cvId?: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional()
  jobTitle?: string | null;

  @ApiPropertyOptional()
  company?: string | null;

  @ApiProperty()
  tone!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class GeneratedCoverLetterResponseDto {
  @ApiProperty({ description: 'Generated cover letter content' })
  content!: string;

  @ApiPropertyOptional({ description: 'Key points highlighted' })
  highlights?: string[];
}
