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
}
