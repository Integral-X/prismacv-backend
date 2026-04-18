import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtUserAuthGuard } from './guards/jwt-user-auth.guard';
import { AuthService } from './auth.service';
import { UserLoginRequestDto } from './dto/request/user-login.request.dto';
import { UserSignupRequestDto } from './dto/request/user-signup.request.dto';
import { ForgotPasswordRequestDto } from './dto/request/forgot-password.request.dto';
import { ResetPasswordRequestDto } from './dto/request/reset-password.request.dto';
import { ChangePasswordRequestDto } from './dto/request/change-password.request.dto';
import { RefreshTokenRequestDto } from './dto/request/refresh-token.request.dto';
import { UserLoginResponseDto } from './dto/response/user-login.response.dto';
import { UserAuthResponseDto } from './dto/response/user-auth.response.dto';
import { ForgotPasswordResponseDto } from './dto/response/forgot-password.response.dto';
import { ResetPasswordResponseDto } from './dto/response/rese-password.response.dto';
import { ChangePasswordResponseDto } from './dto/response/change-password.response.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { User } from './entities/user.entity';

@ApiTags('User Authentication')
@Controller('auth/user')
export class UserAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Regular user authentication',
    description:
      'Authenticates a regular user and returns JWT tokens with profile data.',
  })
  @ApiBody({ type: UserLoginRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'User login successful. Response includes JWT tokens and user profile data.',
    type: UserLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials or email not verified',
  })
  async login(
    @Body() loginRequestDto: UserLoginRequestDto,
  ): Promise<UserLoginResponseDto> {
    const credentials =
      this.authMapper.loginRequestToCredentials(loginRequestDto);
    const result = await this.authService.userLogin(credentials);
    return this.authMapper.userToUserLoginResponse(result.user, result.tokens);
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Regular user registration',
    description:
      'Registers a new regular user with REGULAR role. New users receive profile data only and must verify email before logging in.',
  })
  @ApiBody({ type: UserSignupRequestDto })
  @ApiResponse({
    status: 201,
    description:
      'User registered successfully. Response includes user profile data. Verify email via OTP before logging in.',
    type: UserAuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation errors',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  async signup(
    @Body() signupRequestDto: UserSignupRequestDto,
  ): Promise<UserAuthResponseDto> {
    const userEntity = this.authMapper.signupRequestToEntity(signupRequestDto);
    const result = await this.authService.userSignup(userEntity);
    return this.authMapper.userToUserAuthResponse(result.user);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @ApiOperation({
    summary: 'Request password reset for user',
    description:
      'Initiates password reset process for regular users by sending OTP to registered email address. Rate limited to 5 attempts per 5 minutes for security.',
  })
  @ApiBody({ type: ForgotPasswordRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Password reset initiated successfully. If email exists in system, OTP has been sent to the email address.',
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid email format or validation errors',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too Many Requests - Rate limit exceeded (5 attempts per 5 minutes)',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordRequestDto,
  ): Promise<ForgotPasswordResponseDto> {
    return await this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset user password with token',
    description:
      'Resets user password using valid reset token obtained from OTP verification process. Requires matching password confirmation and enforces password policy (minimum 8 characters).',
  })
  @ApiBody({ type: ResetPasswordRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Password reset successfully. User can now login with new password.',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid reset token, passwords do not match, or password policy violation (minimum 8 characters required)',
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

  @Public()
  @UseGuards(JwtUserAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password for authenticated user',
    description:
      'Changes password for the currently authenticated user. Requires current password verification and enforces password policy (minimum 8 characters). All user sessions will be invalidated after successful password change for security.',
  })
  @ApiBody({ type: ChangePasswordRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Password changed successfully. All user sessions have been invalidated for security.',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Passwords do not match, password policy violation (minimum 8 characters), new password same as current, or OAuth user attempting password change',
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Current password is incorrect or missing JWT token',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordRequestDto,
    @GetUser() user: User,
  ): Promise<ChangePasswordResponseDto> {
    return await this.authService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
      changePasswordDto.confirmPassword,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh user access token',
    description:
      'Refreshes JWT access token using a valid refresh token. Only available for REGULAR users.',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Token refreshed successfully. Response includes user profile and new JWT tokens.',
    type: UserLoginResponseDto,
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
  ): Promise<UserLoginResponseDto> {
    if (!refreshTokenRequestDto?.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      const result = await this.authService.refreshToken(
        refreshTokenRequestDto.refreshToken,
        'user',
      );
      return this.authMapper.userToUserLoginResponse(
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
}
