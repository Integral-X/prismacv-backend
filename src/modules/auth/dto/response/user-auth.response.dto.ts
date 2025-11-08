import { ApiProperty } from '@nestjs/swagger';
import { UserProfileResponseDto } from './user-profile.response.dto';

export class UserAuthResponseDto {
  @ApiProperty({
    description: 'Regular user profile information',
    type: UserProfileResponseDto,
  })
  user: UserProfileResponseDto;
}
