import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from './user-profile.response.dto';

export class AuthResponseDto {
  @ApiProperty({
    description: 'User profile information',
    type: UserProfileResponseDto,
  })
  user: UserProfileResponseDto;

  @ApiProperty({
    description: 'JWT Access Token (only for PLATFORM_ADMIN users)',
    required: false,
  })
  accessToken?: string;

  @ApiProperty({
    description: 'JWT Refresh Token (only for PLATFORM_ADMIN users)',
    required: false,
  })
  refreshToken?: string;
}
