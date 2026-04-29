import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class ImportLinkedInToCvRequestDto {
  @ApiProperty({
    description: 'UUID of the LinkedinCvImport record to convert',
    example: '01912345-6789-7abc-def0-123456789abc',
  })
  @IsUUID()
  importId!: string;

  @ApiProperty({
    description: 'Optional CV title (defaults to "{fullName}\'s CV")',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({
    description: 'Optional template ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}
