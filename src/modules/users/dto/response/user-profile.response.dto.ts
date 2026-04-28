import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiPropertyOptional()
  provider?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
