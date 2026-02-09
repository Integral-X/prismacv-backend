import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetOtpResponseDto {
  @ApiProperty({
    example: 'reset-token-string',
    description: 'Short lived token used to reset password',
  })
  resetToken: string;
}
