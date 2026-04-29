import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDate,
  IsInt,
  Min,
  MaxLength,
  ValidateNested,
  IsArray,
  IsEnum,
  IsUrl,
} from 'class-validator';

// ─── Experience ──────────────────────────────────────────────────────────────

export class ExperienceItemDto {
  @ApiPropertyOptional({
    description: 'ID for existing entries (omit for new)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MaxLength(200)
  company!: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'San Francisco, CA' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiProperty({ example: '2022-01-15' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiPropertyOptional({ example: '2024-06-30' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  current?: boolean;

  @ApiPropertyOptional({ example: 'Led a team of 5 engineers...' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertExperienceRequestDto {
  @ApiProperty({ type: [ExperienceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceItemDto)
  items!: ExperienceItemDto[];
}

// ─── Education ───────────────────────────────────────────────────────────────

export class EducationItemDto {
  @ApiPropertyOptional({
    description: 'ID for existing entries (omit for new)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Stanford University' })
  @IsString()
  @MaxLength(200)
  institution!: string;

  @ApiProperty({ example: 'Bachelor of Science' })
  @IsString()
  @MaxLength(200)
  degree!: string;

  @ApiPropertyOptional({ example: 'Computer Science' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  field?: string;

  @ApiProperty({ example: '2018-09-01' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiPropertyOptional({ example: '2022-06-15' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ example: '3.9' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  gpa?: string;

  @ApiPropertyOptional({ example: 'Graduated with honors' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertEducationRequestDto {
  @ApiProperty({ type: [EducationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationItemDto)
  items!: EducationItemDto[];
}

// ─── Skills ──────────────────────────────────────────────────────────────────

export enum SkillLevelDto {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export class SkillItemDto {
  @ApiPropertyOptional({
    description: 'ID for existing entries (omit for new)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'TypeScript' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    enum: SkillLevelDto,
    default: SkillLevelDto.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(SkillLevelDto)
  level?: SkillLevelDto;

  @ApiPropertyOptional({ example: 'Programming Languages' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertSkillsRequestDto {
  @ApiProperty({ type: [SkillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillItemDto)
  items!: SkillItemDto[];
}

// ─── Certifications ──────────────────────────────────────────────────────────

export class CertificationItemDto {
  @ApiPropertyOptional({
    description: 'ID for existing entries (omit for new)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'AWS Solutions Architect' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string;

  @ApiPropertyOptional({ example: '2023-06-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  issueDate?: Date;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiryDate?: Date;

  @ApiPropertyOptional({ example: 'https://verify.aws.com/abc123' })
  @IsOptional()
  @IsUrl()
  credentialUrl?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertCertificationsRequestDto {
  @ApiProperty({ type: [CertificationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificationItemDto)
  items!: CertificationItemDto[];
}

// ─── Projects ────────────────────────────────────────────────────────────────

export class ProjectItemDto {
  @ApiPropertyOptional({
    description: 'ID for existing entries (omit for new)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'PrismaCV' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'AI-powered career platform' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/project' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertProjectsRequestDto {
  @ApiProperty({ type: [ProjectItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectItemDto)
  items!: ProjectItemDto[];
}

// ─── Languages ───────────────────────────────────────────────────────────────

export enum LanguageProficiencyDto {
  BASIC = 'BASIC',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  FLUENT = 'FLUENT',
  NATIVE = 'NATIVE',
}

export class LanguageItemDto {
  @ApiPropertyOptional({
    description: 'ID for existing entries (omit for new)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'English' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    enum: LanguageProficiencyDto,
    default: LanguageProficiencyDto.INTERMEDIATE,
  })
  @IsOptional()
  @IsEnum(LanguageProficiencyDto)
  proficiency?: LanguageProficiencyDto;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertLanguagesRequestDto {
  @ApiProperty({ type: [LanguageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageItemDto)
  items!: LanguageItemDto[];
}

// ─── Custom Sections ─────────────────────────────────────────────────────────

export class CustomSectionItemDto {
  @ApiPropertyOptional({
    description: 'ID for existing entries (omit for new)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'Volunteer Work' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: [{ heading: 'Red Cross', detail: 'Volunteer since 2020' }],
  })
  @IsArray()
  entries!: Record<string, unknown>[];

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class BulkUpsertCustomSectionsRequestDto {
  @ApiProperty({ type: [CustomSectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomSectionItemDto)
  items!: CustomSectionItemDto[];
}
