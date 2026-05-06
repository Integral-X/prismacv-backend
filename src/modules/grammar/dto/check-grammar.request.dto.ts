import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum GrammarContext {
  SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  COVER_LETTER = 'cover_letter',
}

export class CheckGrammarRequestDto {
  @ApiProperty({ description: 'Text to analyze', maxLength: 10000 })
  @IsString()
  @MaxLength(10000)
  text!: string;

  @ApiPropertyOptional({
    enum: GrammarContext,
    description: 'Context of the text for tailored analysis',
  })
  @IsOptional()
  @IsEnum(GrammarContext)
  context?: GrammarContext;
}
