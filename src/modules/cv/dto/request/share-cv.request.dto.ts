import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ShareCvRequestDto {
  @ApiPropertyOptional({
    description: 'Whether the CV should be publicly visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;
}
