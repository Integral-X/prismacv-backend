import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminLoginRequestDto } from './dto/request/admin-login.request.dto';
import { AdminSignupRequestDto } from './dto/request/admin-signup.request.dto';
import { AdminLoginResponseDto } from './dto/response/admin-login.response.dto';
import { AdminSignupResponseDto } from './dto/response/admin-signup.response.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Admin Authentication')
@Controller('auth/admin')
export class AdminAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Platform admin authentication',
    description:
      'Authenticates a platform administrator and returns JWT tokens only. This endpoint is for internal use only and does not require JWT authentication.',
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
  async login(
    @Body() loginRequestDto: AdminLoginRequestDto,
  ): Promise<AdminLoginResponseDto> {
    const credentials =
      this.authMapper.loginRequestToCredentials(loginRequestDto);
    const result = await this.authService.adminLogin(credentials);
    return this.authMapper.tokensToAdminLoginResponse(result.tokens);
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Platform admin registration',
    description:
      'Registers a new platform administrator and returns user profile. This endpoint is for internal use only and does not require JWT authentication. New admins are assigned PLATFORM_ADMIN role. An OTP will be sent to the email for verification.',
  })
  @ApiBody({ type: AdminSignupRequestDto })
  @ApiResponse({
    status: 201,
    description:
      'Admin registered successfully. Response includes admin profile. Use /auth/admin/login to get JWT tokens.',
    type: AdminSignupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation errors' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async signup(
    @Body() signupRequestDto: AdminSignupRequestDto,
  ): Promise<AdminSignupResponseDto> {
    const userEntity = this.authMapper.signupRequestToEntity(signupRequestDto);
    const result = await this.authService.adminSignup(userEntity);
    return this.authMapper.userToAdminSignupResponse(result.user);
  }
}
