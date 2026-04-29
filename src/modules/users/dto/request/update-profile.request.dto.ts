import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileRequestDto {
  @ApiPropertyOptional({
    description: 'Display name',
    example: 'Jane Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
