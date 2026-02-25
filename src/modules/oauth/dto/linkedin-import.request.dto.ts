import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LinkedinImportRequestDto {
  @ApiProperty({
    description: 'LinkedIn handle (e.g., john-doe) or profile URL',
    example: 'https://www.linkedin.com/in/john-doe',
  })
  @IsString()
  @MinLength(2)
  handleOrUrl: string;
}
