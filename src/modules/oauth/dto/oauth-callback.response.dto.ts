import { ApiProperty } from '@nestjs/swagger';
import { UserAuthResponseDto } from '@/modules/auth/dto/response/user-auth.response.dto';

export class OAuthCallbackResponseDto {
  @ApiProperty({
    description: 'User profile information',
    type: UserAuthResponseDto,
  })
  user: UserAuthResponseDto;

  @ApiProperty({
    description: 'JWT Access Token for authentication',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT Refresh Token for token renewal',
  })
  refreshToken: string;
}
