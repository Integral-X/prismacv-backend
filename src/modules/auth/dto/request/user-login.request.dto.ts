import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class UserLoginRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Regular user email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'userpass123',
    description: 'Regular user password (minimum 4 characters)',
  })
  @IsString()
  @MinLength(4)
  password: string;
}
