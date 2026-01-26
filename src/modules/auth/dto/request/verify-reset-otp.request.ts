import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyResetOtpRequestDto {
  @ApiProperty({
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6 digit OTP sent to email',
  })
  @IsString()
  @Length(6, 6)
  otp: string;
}
