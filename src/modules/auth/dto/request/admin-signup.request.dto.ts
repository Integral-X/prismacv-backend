import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminSignupRequestDto {
  @ApiProperty({
    example: 'admin@example.com',
    description: 'Valid email address for platform admin registration',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'secureAdminPass123',
    description: 'Password must be at least 8 characters long',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'Admin User',
    description: 'Optional full name of the platform admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;
}
