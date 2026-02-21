import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { AuthService } from './auth.service';
import { VerifyOtpRequestDto } from './dto/request/verify-otp.request.dto';
import { ResendOtpRequestDto } from './dto/request/resend-otp.request.dto';
import { VerifyResetOtpRequestDto } from './dto/request/verify-reset-otp.request';
import { OtpVerificationResponseDto } from './dto/response/otp-verification.response.dto';
import { OtpResendResponseDto } from './dto/response/otp-resend.response.dto';
import { VerifyResetOtpResponseDto } from './dto/response/verify-reset-otp.response.dto';
import { AuthMapper } from './mappers/auth.mapper';

@ApiTags('OTP Verification')
@ApiBearerAuth('JWT-auth')
@Controller('otp')
export class OtpController {
  constructor(
    private readonly otpService: OtpService,
    private readonly authService: AuthService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Post('verify-signup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 minutes
  @ApiOperation({
    summary: 'Verify email OTP for user signup',
    description:
      'Verifies the OTP sent to user email address during registration process. Upon successful verification, the email is marked as verified and user account is activated. Rate limited to 5 attempts per 5 minutes to prevent brute force attacks.',
  })
  @ApiBody({ type: VerifyOtpRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Email verified successfully. User account is now active and email is confirmed.',
    type: OtpVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid OTP code, expired OTP, or email already verified',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found with provided email address',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests - Maximum verification attempts (5) exceeded within 5 minutes. Request a new OTP or wait before retrying.',
  })
  async verifySignupOtp(
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

  @Post('resend-signup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 minutes
  @ApiOperation({
    summary: 'Resend signup email verification OTP',
    description:
      'Resends a new OTP to user email address for signup verification. Use this when the previous OTP has expired or was not received. Rate limited to 5 attempts per 5 minutes.',
  })
  @ApiBody({ type: ResendOtpRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'New OTP sent successfully to the email address. Check email for verification code.',
    type: OtpResendResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Email already verified or invalid email format',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found with provided email address',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests - Rate limit exceeded (5 attempts per 5 minutes)',
  })
  async resendSignupOtp(
    @Body() resendOtpRequestDto: ResendOtpRequestDto,
  ): Promise<OtpResendResponseDto> {
    const result = await this.otpService.resendOtp(resendOtpRequestDto.email);

    return {
      message: 'OTP sent successfully',
      expiresAt: result.expiresAt,
    };
  }

  @Post('verify-reset')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 minutes
  @ApiOperation({
    summary: 'Verify password reset OTP',
    description:
      'Verifies the OTP sent to user email for password reset process. Upon successful verification, returns a reset token that can be used to set new password. Rate limited to 5 attempts per 5 minutes.',
  })
  @ApiBody({ type: VerifyResetOtpRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Password reset OTP verified successfully. Reset token provided for password change.',
    type: VerifyResetOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid OTP format or validation errors',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid OTP code, expired OTP, or maximum attempts exceeded',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests - Rate limit exceeded (5 attempts per 5 minutes)',
  })
  async verifyResetOtp(
    @Body() verifyResetOtpDto: VerifyResetOtpRequestDto,
  ): Promise<VerifyResetOtpResponseDto> {
    return await this.authService.verifyPasswordResetOtp(
      verifyResetOtpDto.email,
      verifyResetOtpDto.otp,
    );
  }
}
