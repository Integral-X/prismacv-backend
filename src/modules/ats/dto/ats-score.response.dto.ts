import { ApiProperty } from '@nestjs/swagger';

export class KeywordMatchDto {
  @ApiProperty()
  keyword!: string;

  @ApiProperty()
  found!: boolean;

  @ApiProperty({ enum: ['required', 'preferred', 'bonus'] })
  importance!: 'required' | 'preferred' | 'bonus';
}

export class AtsSectionScoreDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  feedback!: string;
}

export class AtsScoreResponseDto {
  @ApiProperty({ description: 'Overall ATS score 0-100' })
  overallScore!: number;

  @ApiProperty({ type: [KeywordMatchDto] })
  keywordMatches!: KeywordMatchDto[];

  @ApiProperty({ type: [AtsSectionScoreDto] })
  sectionScores!: AtsSectionScoreDto[];

  @ApiProperty({ description: 'List of improvement suggestions' })
  suggestions!: string[];

  @ApiProperty({ description: 'Keywords found in JD but missing from CV' })
  missingKeywords!: string[];

  @ApiProperty({ description: 'Match percentage for keywords' })
  keywordMatchRate!: number;
}
