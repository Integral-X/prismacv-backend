import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { VerifyOtpRequestDto } from './dto/request/verify-otp.request.dto';
import { ResendOtpRequestDto } from './dto/request/resend-otp.request.dto';
import { OtpVerificationResponseDto } from './dto/response/otp-verification.response.dto';
import { OtpResendResponseDto } from './dto/response/otp-resend.response.dto';
import { AuthMapper } from './mappers/auth.mapper';

@ApiTags('OTP Verification')
@ApiBearerAuth('JWT-auth')
@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email OTP',
    description:
      "Verifies the OTP sent to the user's email address during registration. Upon successful verification, the email is marked as verified. Rate limited to 5 attempts per OTP.",
  })
  @ApiBody({ type: VerifyOtpRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully.',
    type: OtpVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid or expired OTP',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests - Maximum verification attempts (5) exceeded. Request a new OTP.',
  })
  async verifyOtp(
    @Body() verifyOtpRequestDto: VerifyOtpRequestDto,
  ): Promise<OtpVerificationResponseDto> {
    const user = await this.otpService.verifyOtp(
      verifyOtpRequestDto.email,
      verifyOtpRequestDto.otp,
    );

    return {
      message: 'Email verified successfully',
      user: this.authMapper.userToProfileResponse(user),
    };
  }

  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP',
    description:
      "Resends a new OTP to the user's email address. Use this when the previous OTP has expired or was not received.",
  })
  @ApiBody({ type: ResendOtpRequestDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully.',
    type: OtpResendResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Email already verified',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  async resendOtp(
    @Body() resendOtpRequestDto: ResendOtpRequestDto,
  ): Promise<OtpResendResponseDto> {
    const result = await this.otpService.resendOtp(resendOtpRequestDto.email);

    return {
      message: 'OTP sent successfully',
      expiresAt: result.expiresAt,
    };
  }
}
