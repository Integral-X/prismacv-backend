import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export enum CvStatusDto {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export class UpdateCvRequestDto {
  @ApiPropertyOptional({
    description: 'CV title',
    example: 'Updated Resume Title',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Template ID',
    example: 'azuril',
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'CV status',
    enum: CvStatusDto,
  })
  @IsOptional()
  @IsEnum(CvStatusDto)
  status?: CvStatusDto;

  @ApiPropertyOptional({
    description: 'Whether this is the default CV',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
