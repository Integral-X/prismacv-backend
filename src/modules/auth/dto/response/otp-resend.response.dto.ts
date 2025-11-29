import { ApiProperty } from '@nestjs/swagger';

export class OtpResendResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'OTP sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Timestamp when the OTP will expire',
    example: '2025-11-29T21:00:00.000Z',
  })
  expiresAt: Date;
}
