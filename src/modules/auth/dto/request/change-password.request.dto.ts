import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsUUID } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({
    example: '01234567-89ab-cdef-0123-456789abcdef',
    description: 'User ID obtained from login response',
  })
  @IsString()
  @IsUUID()
  userId: string;

  @ApiProperty({
    example: 'OldPassword123',
    description: 'Current password of the user',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewStrongPassword123',
    description: 'New password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    example: 'NewStrongPassword123',
    description: 'Confirmation of new password (must match newPassword)',
  })
  @IsString()
  confirmPassword: string;
}
