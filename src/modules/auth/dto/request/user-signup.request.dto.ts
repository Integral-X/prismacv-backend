import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UserSignupRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Valid email address for regular user registration',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'secureUserPass123',
    description: 'Password must be at least 8 characters long',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Optional full name of the regular user',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
