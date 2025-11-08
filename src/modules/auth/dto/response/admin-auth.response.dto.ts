import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from './user-profile.response.dto';

export class AdminAuthResponseDto {
  @ApiProperty({
    description: 'Platform admin profile information',
    type: UserProfileResponseDto,
  })
  user: UserProfileResponseDto;

  @ApiProperty({
    description: 'JWT Access Token for platform admin authentication',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT Refresh Token for platform admin token renewal',
  })
  refreshToken: string;
}
