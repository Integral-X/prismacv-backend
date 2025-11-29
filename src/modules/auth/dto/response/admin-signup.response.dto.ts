import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from './user-profile.response.dto';

export class AdminSignupResponseDto {
  @ApiProperty({
    description: 'Platform admin profile information',
    type: UserProfileResponseDto,
  })
  user: UserProfileResponseDto;
}
