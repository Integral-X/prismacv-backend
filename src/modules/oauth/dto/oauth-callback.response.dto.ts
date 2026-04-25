import { ApiProperty } from '@nestjs/swagger';
import { UserAuthResponseDto } from '@/modules/auth/dto/response/user-auth.response.dto';

export class OAuthCallbackResponseDto {
  @ApiProperty({
    description: 'User profile information',
    type: UserAuthResponseDto,
  })
  user!: UserAuthResponseDto;

  @ApiProperty({ description: 'JWT access token (15 min TTL)' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token (7 day TTL)' })
  refreshToken!: string;
}
