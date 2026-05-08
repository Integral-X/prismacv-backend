import { ApiProperty } from '@nestjs/swagger';

export enum GrammarIssueType {
  GRAMMAR = 'grammar',
  STYLE = 'style',
  IMPACT = 'impact',
}

export enum GrammarIssueSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export class GrammarIssueDto {
  @ApiProperty({ enum: GrammarIssueType })
  type!: GrammarIssueType;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  suggestion!: string;

  @ApiProperty()
  startIndex!: number;

  @ApiProperty()
  endIndex!: number;

  @ApiProperty({ enum: GrammarIssueSeverity })
  severity!: GrammarIssueSeverity;
}

export class CheckGrammarResponseDto {
  @ApiProperty({ type: [GrammarIssueDto] })
  issues!: GrammarIssueDto[];

  @ApiProperty({
    description: 'Content quality score',
    minimum: 0,
    maximum: 100,
  })
  score!: number;

  @ApiProperty({ description: 'Summary of the analysis' })
  summary!: string;
}
