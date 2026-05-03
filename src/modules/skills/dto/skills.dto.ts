import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';

export class AssessSkillsRequestDto {
  @ApiProperty({
    description: 'Target role to assess skills against',
    example: 'Software Engineer',
  })
  @IsString()
  targetRole!: string;

  @ApiPropertyOptional({
    description: 'Current skills (comma-separated or from CV)',
    example: ['TypeScript', 'React', 'Node.js'],
  })
  @IsOptional()
  @IsString({ each: true })
  currentSkills?: string[];
}

export class UpdateSkillProgressRequestDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  skillName!: string;

  @ApiPropertyOptional({ description: 'Progress level 0-100', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  level?: number;

  @ApiPropertyOptional({
    description: 'Status: not_started, learning, completed',
    default: 'not_started',
  })
  @IsOptional()
  @IsIn(['not_started', 'learning', 'completed'])
  status?: string;
}

export class SkillGapResponseDto {
  @ApiProperty() targetRole!: string;
  @ApiProperty() overallReadiness!: number;
  @ApiProperty() requiredSkills!: SkillAssessmentDto[];
  @ApiProperty() strengths!: string[];
  @ApiProperty() gaps!: string[];
}

export class SkillAssessmentDto {
  @ApiProperty() skillName!: string;
  @ApiProperty() category!: string;
  @ApiProperty() importance!: number;
  @ApiProperty() hasSkill!: boolean;
  @ApiPropertyOptional() userLevel?: number;
}

export class SkillCategoryResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() icon?: string;
}

export class LearningResourceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() skillName!: string;
  @ApiProperty() title!: string;
  @ApiProperty() url!: string;
  @ApiProperty() platform!: string;
  @ApiProperty() difficulty!: string;
  @ApiPropertyOptional() duration?: string;
  @ApiProperty() isFree!: boolean;
}

export class UserSkillProgressResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() skillName!: string;
  @ApiProperty() level!: number;
  @ApiProperty() status!: string;
  @ApiPropertyOptional() startedAt?: string;
  @ApiPropertyOptional() completedAt?: string;
}

export class LearningRoadmapResponseDto {
  @ApiProperty() targetRole!: string;
  @ApiProperty() totalSkills!: number;
  @ApiProperty() completedSkills!: number;
  @ApiProperty() milestones!: RoadmapMilestoneDto[];
}

export class RoadmapMilestoneDto {
  @ApiProperty() phase!: string;
  @ApiProperty() skills!: RoadmapSkillDto[];
  @ApiProperty() description!: string;
}

export class RoadmapSkillDto {
  @ApiProperty() skillName!: string;
  @ApiProperty() importance!: number;
  @ApiProperty() status!: string;
  @ApiProperty() level!: number;
  @ApiProperty() resources!: LearningResourceResponseDto[];
}
