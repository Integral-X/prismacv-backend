import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../entities';

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'User name', required: false })
  name?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.REGULAR,
  })
  role: UserRole;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Account last update timestamp' })
  updatedAt: Date;
}
