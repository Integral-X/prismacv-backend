import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from '@/modules/auth/dto/response/user-profile.response.dto';

export class OAuthCallbackResponseDto {
  @ApiProperty({
    description: 'User profile information',
    type: UserProfileResponseDto,
  })
  user!: UserProfileResponseDto;

  @ApiProperty({ description: 'JWT access token (15 min TTL)' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token (7 day TTL)' })
  refreshToken!: string;
}
