import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginResponseDto {
  @ApiProperty({
    description: 'JWT Access Token for platform admin authentication',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT Refresh Token for platform admin token renewal',
  })
  refreshToken: string;
}
