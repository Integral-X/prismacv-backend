import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RefreshTokenRequestDto } from './dto/request/refresh-token.request.dto';
import { VerifyOtpRequestDto } from './dto/request/verify-otp.request.dto';
import { ResendOtpRequestDto } from './dto/request/resend-otp.request.dto';
import { AdminAuthResponseDto } from './dto/response/admin-auth.response.dto';
import { OtpVerificationResponseDto } from './dto/response/otp-verification.response.dto';
import { OtpResendResponseDto } from './dto/response/otp-resend.response.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Auth Utilities')
@ApiBearerAuth('JWT-auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refreshes JWT access token using a valid refresh token. Only available for PLATFORM_ADMIN users.',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Token refreshed successfully. Response includes admin profile and new JWT tokens.',
    type: AdminAuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired refresh token',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Refresh token is required',
  })
  async refresh(
    @Body() refreshTokenRequestDto: RefreshTokenRequestDto,
  ): Promise<AdminAuthResponseDto> {
    // Validate refresh token is provided
    if (!refreshTokenRequestDto?.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      // Call service with refresh token and convert result to response DTO
      const result = await this.authService.refreshToken(
        refreshTokenRequestDto.refreshToken,
      );
      return this.authMapper.userToAdminAuthResponse(
        result.user,
        result.tokens!,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  @Post('verify-otp')
    summary: 'Verify email OTP',
  @ApiOperation({
    summary: 'Verify email OTP',
    description:
      "Verifies the OTP sent to the user's email address during registration. Upon successful verification, the email is marked as verified. Requires platform admin JWT.",
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
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
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

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP',
    description:
      "Resends a new OTP to the user's email address. Use this when the previous OTP has expired or was not received. Requires platform admin JWT.",
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
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
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
