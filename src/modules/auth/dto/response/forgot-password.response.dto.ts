import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example: 'If the email exists, an OTP has been sent.',
  })
  message: string;
}
