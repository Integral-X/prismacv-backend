import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminLoginRequestDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Platform admin email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'admin123',
    description: 'Platform admin password (minimum 4 characters)',
  })
  @IsString()
  @MinLength(4)
  password: string;
}
