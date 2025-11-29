import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendOtpRequestDto {
  @ApiProperty({
    description: 'Email address of the user to resend OTP to',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;
}
