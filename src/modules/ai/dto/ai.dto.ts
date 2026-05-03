import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class OptimizeCvRequestDto {
  @ApiProperty({
    description: 'Job description to optimize the CV for',
    example:
      'We are looking for a Senior Software Engineer with experience in TypeScript, React, and Node.js...',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  jobDescription!: string;
}

export class CvAnalysisResponseDto {
  @ApiProperty({ description: 'Overall CV score (0-100)' })
  overallScore!: number;

  @ApiProperty({ description: 'Grammar score (0-100)' })
  grammarScore!: number;

  @ApiProperty({ description: 'Readability score (0-100)' })
  readabilityScore!: number;

  @ApiProperty({ description: 'ATS compatibility score (0-100)' })
  atsScore!: number;

  @ApiProperty({ description: 'Issues found in the CV' })
  issues!: CvIssueDto[];

  @ApiProperty({ description: 'Improvement suggestions' })
  suggestions!: CvSuggestionDto[];
}

export class CvOptimizationResponseDto {
  @ApiProperty({
    description: 'Match score with job description (0-100)',
  })
  matchScore!: number;

  @ApiProperty({ description: 'Keywords from job description missing in CV' })
  missingKeywords!: string[];

  @ApiProperty({ description: 'Optimization suggestions' })
  suggestions!: CvSuggestionDto[];

  @ApiProperty({ description: 'Section-specific recommendations' })
  sectionRecommendations!: SectionRecommendationDto[];
}

export class CvIssueDto {
  @ApiProperty() section!: string;
  @ApiProperty() type!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() suggestion?: string;
}

export class CvSuggestionDto {
  @ApiProperty() section!: string;
  @ApiProperty() type!: string;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() originalText?: string;
  @ApiPropertyOptional() suggestedText?: string;
}

export class SectionRecommendationDto {
  @ApiProperty() section!: string;
  @ApiProperty() action!: string;
  @ApiProperty() message!: string;
  @ApiProperty() priority!: string;
}
