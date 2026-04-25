import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Valid email address for user registration',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'securepassword123',
    description: 'Password must be at least 8 characters long',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Optional full name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
