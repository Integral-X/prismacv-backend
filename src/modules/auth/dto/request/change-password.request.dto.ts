import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordRequestDto {
  @ApiProperty({
    example: 'OldPassword123',
    description: 'Current password of the user',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewStrongPassword123',
    description: 'New password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;

  @ApiProperty({
    example: 'NewStrongPassword123',
    description: 'Confirmation of new password (must match newPassword)',
  })
  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}
