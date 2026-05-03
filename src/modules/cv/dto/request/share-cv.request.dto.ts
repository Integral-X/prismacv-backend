import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ShareCvRequestDto {
  @ApiPropertyOptional({
    description: 'Whether the CV should be publicly visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;
}

export class CvShareResponseDto {
  @ApiProperty({ description: 'Share record ID' })
  id!: string;

  @ApiProperty({ description: 'CV ID' })
  cvId!: string;

  @ApiProperty({ description: 'Public share slug' })
  shareSlug!: string;

  @ApiProperty({ description: 'Whether the share is public' })
  isPublic!: boolean;

  @ApiProperty({ description: 'Number of views' })
  viewCount!: number;

  @ApiProperty({ description: 'Number of downloads' })
  downloadCount!: number;

  @ApiPropertyOptional({ description: 'Last viewed timestamp' })
  lastViewedAt?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: string;
}
