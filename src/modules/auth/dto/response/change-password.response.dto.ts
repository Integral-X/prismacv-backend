import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordResponseDto {
  @ApiProperty({
    example: 'Password changed successfully',
    description: 'Success message confirming password change',
  })
  message: string;
}