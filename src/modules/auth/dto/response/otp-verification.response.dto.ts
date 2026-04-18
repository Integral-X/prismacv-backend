import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from './user-profile.response.dto';

export class OtpVerificationResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Email verified successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated user profile with emailVerified set to true',
    type: UserProfileResponseDto,
  })
  user: UserProfileResponseDto;

  @ApiProperty({ description: 'JWT access token (15 min TTL)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token (7 day TTL)' })
  refreshToken: string;
}
