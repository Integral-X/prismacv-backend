import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateCvRequestDto {
  @ApiProperty({
    description: 'CV title',
    example: 'Software Engineer Resume',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    description: 'Template ID to use for this CV',
    example: '1',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}
