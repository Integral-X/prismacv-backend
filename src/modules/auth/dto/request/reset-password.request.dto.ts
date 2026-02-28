import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordRequestDto {
  @ApiProperty({
    example: 'reset-token-string',
  })
  @IsString()
  resetToken: string;

  @ApiProperty({
    example: 'StrongPassword123',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({
    example: 'StrongPassword123',
  })
  @IsString()
  confirmPassword: string;
}
