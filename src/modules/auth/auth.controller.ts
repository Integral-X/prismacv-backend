import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiSecurity,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminLoginRequestDto } from './dto/request/admin-login.request.dto';
import { AdminSignupRequestDto } from './dto/request/admin-signup.request.dto';
import { RefreshTokenRequestDto } from './dto/request/refresh-token.request.dto';
import { ForgotPasswordRequestDto } from './dto/request/forgot-password.request.dto';
import { ResetPasswordRequestDto } from './dto/request/reset-password.request.dto';
import { VerifyResetOtpRequestDto } from './dto/request/verify-reset-otp.request';
import { AdminLoginResponseDto } from './dto/response/admin-login.response.dto';
import { AdminSignupResponseDto } from './dto/response/admin-signup.response.dto';
import { AdminAuthResponseDto } from './dto/response/admin-auth.response.dto';
import { ForgotPasswordResponseDto } from './dto/response/forgot-password.response.dto';
import { ResetPasswordResponseDto } from './dto/response/rese-password.response.dto';
import { VerifyResetOtpResponseDto } from './dto/response/verify-reset-otp.response.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('Admin Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity({})
  @ApiOperation({
    summary: 'Platform admin authentication',
    description:
      'Authenticates a platform administrator and returns JWT tokens.',
  })
  @ApiBody({ type: AdminLoginRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Admin login successful. Response includes JWT tokens (access token and refresh token).',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid credentials or user is not a platform admin',
  })
  async adminLogin(
    @Body() loginRequestDto: AdminLoginRequestDto,
  ): Promise<AdminLoginResponseDto> {
    const credentials =
      this.authMapper.loginRequestToCredentials(loginRequestDto);
    const result = await this.authService.adminLogin(credentials);
    return this.authMapper.tokensToAdminLoginResponse(result.tokens);
  }

  @Post('admin/create')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create platform admin (master admin only)',
    description:
      'Creates a new platform administrator. Only master admins can perform this action. New admins are assigned PLATFORM_ADMIN role and receive an OTP email for verification.',
  })
  @ApiBody({ type: AdminSignupRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully. Response includes admin profile.',
    type: AdminSignupResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only master admins can create platform admins',
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation errors' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async adminSignup(
    @Body() signupRequestDto: AdminSignupRequestDto,
    @Req() req: { user?: { role?: UserRole; isMasterAdmin?: boolean } },
  ): Promise<AdminSignupResponseDto> {
    const requester = req.user;
    if (
      !requester ||
      requester.role !== UserRole.PLATFORM_ADMIN ||
      !requester.isMasterAdmin
    ) {
      throw new ForbiddenException(
        'Only master admins can create platform admins',
      );
    }
    const userEntity = this.authMapper.signupRequestToEntity(signupRequestDto);
    const result = await this.authService.adminSignup(userEntity);
    return this.authMapper.userToAdminSignupResponse(result.user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity({})
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

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity({})
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Initiates password reset process by sending OTP to registered email address.',
  })
  @ApiBody({ type: ForgotPasswordRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Password reset initiated. If email exists, OTP has been sent.',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid email format',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordRequestDto,
  ): Promise<ForgotPasswordResponseDto> {
    return await this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity({})
  @ApiOperation({
    summary: 'Verify password reset OTP',
    description:
      'Verifies the OTP sent to email and returns a reset token for password reset.',
  })
  @ApiBody({ type: VerifyResetOtpRequestDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully. Reset token provided.',
    type: VerifyResetOtpResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid OTP format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired OTP, or too many attempts',
  })
  async verifyResetOtp(
    @Body() verifyOtpDto: VerifyResetOtpRequestDto,
  ): Promise<VerifyResetOtpResponseDto> {
    return await this.authService.verifyResetOtp(
      verifyOtpDto.email,
      verifyOtpDto.otp,
    );
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity({})
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets user password using valid reset token obtained from OTP verification.',
  })
  @ApiBody({ type: ResetPasswordRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid token, passwords do not match, or password policy violation',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired reset token',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordRequestDto,
  ): Promise<ResetPasswordResponseDto> {
    return await this.authService.resetPassword(
      resetPasswordDto.resetToken,
      resetPasswordDto.newPassword,
      resetPasswordDto.confirmPassword,
    );
  }
}
