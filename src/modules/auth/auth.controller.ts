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
import { AdminLoginRequestDto } from './dto/request/admin-login.request.dto';
import { AdminSignupRequestDto } from './dto/request/admin-signup.request.dto';
import { UserLoginRequestDto } from './dto/request/user-login.request.dto';
import { UserSignupRequestDto } from './dto/request/user-signup.request.dto';
import { RefreshTokenRequestDto } from './dto/request/refresh-token.request.dto';
import { AdminAuthResponseDto } from './dto/response/admin-auth.response.dto';
import { UserAuthResponseDto } from './dto/response/user-auth.response.dto';
import { AuthResponseDto } from './dto/response/auth.response.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Admin Authentication')
  @ApiOperation({
    summary: 'Platform admin authentication',
    description:
      'Authenticates a platform administrator and returns JWT tokens. This endpoint is for internal use only and does not require JWT authentication.',
  })
  @ApiBody({ type: AdminLoginRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'Admin login successful. Response includes admin profile and JWT tokens (access token and refresh token).',
    type: AdminAuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid credentials or user is not a platform admin',
  })
  async adminLogin(
    @Body() loginRequestDto: AdminLoginRequestDto,
  ): Promise<AdminAuthResponseDto> {
    // Convert DTO to Entity using mapper
    const credentials =
      this.authMapper.loginRequestToCredentials(loginRequestDto);

    // Call admin login service method
    const result = await this.authService.adminLogin(credentials);

    // Convert result to response DTO
    return this.authMapper.userToAdminAuthResponse(result.user, result.tokens);
  }

  @Public()
  @Post('admin/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Admin Authentication')
  @ApiOperation({
    summary: 'Platform admin registration',
    description:
      'Registers a new platform administrator and returns JWT tokens. This endpoint is for internal use only and does not require JWT authentication. New admins are assigned PLATFORM_ADMIN role.',
  })
  @ApiBody({ type: AdminSignupRequestDto })
  @ApiResponse({
    status: 201,
    description:
      'Admin registered successfully. Response includes admin profile and JWT tokens (access token and refresh token).',
    type: AdminAuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Validation errors' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  async adminSignup(
    @Body() signupRequestDto: AdminSignupRequestDto,
  ): Promise<AdminAuthResponseDto> {
    // Convert DTO to Entity using mapper
    const userEntity = this.authMapper.signupRequestToEntity(signupRequestDto);

    // Call admin signup service method
    const result = await this.authService.adminSignup(userEntity);

    // Convert result to response DTO
    return this.authMapper.userToAdminAuthResponse(result.user, result.tokens);
  }

  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiTags('User Authentication')
  @ApiOperation({
    summary: 'Regular user authentication (JWT-protected)',
    description:
      'Authenticates a regular user and returns profile data only. This endpoint requires a valid JWT token from an authenticated platform administrator. No JWT tokens are returned in the response.',
  })
  @ApiBody({ type: UserLoginRequestDto })
  @ApiResponse({
    status: 200,
    description:
      'User login successful. Response includes user profile data without JWT tokens.',
    type: UserAuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description:
      'Unauthorized - Invalid credentials or missing/invalid JWT token',
  })
  async userLogin(
    @Body() loginRequestDto: UserLoginRequestDto,
  ): Promise<UserAuthResponseDto> {
    // Convert DTO to Entity using mapper
    const credentials =
      this.authMapper.loginRequestToCredentials(loginRequestDto);

    // Call user login service method
    const result = await this.authService.userLogin(credentials);

    // Convert result to response DTO (no tokens)
    return this.authMapper.userToUserAuthResponse(result.user);
  }

  @Post('user/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiTags('User Authentication')
  @ApiOperation({
    summary: 'Regular user registration (JWT-protected)',
    description:
      'Registers a new regular user with REGULAR role. This endpoint requires a valid JWT token from an authenticated platform administrator. New users receive profile data only, without JWT tokens.',
  })
  @ApiBody({ type: UserSignupRequestDto })
  @ApiResponse({
    status: 201,
    description:
      'User registered successfully. Response includes user profile data without JWT tokens.',
    type: UserAuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Validation errors',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid JWT token',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already exists',
  })
  async userSignup(
    @Body() signupRequestDto: UserSignupRequestDto,
  ): Promise<UserAuthResponseDto> {
    // Convert DTO to Entity using mapper
    const userEntity = this.authMapper.signupRequestToEntity(signupRequestDto);

    // Call user signup service method
    const result = await this.authService.userSignup(userEntity);

    // Convert result to response DTO (no tokens)
    return this.authMapper.userToUserAuthResponse(result.user);
  }

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
      'Token refreshed successfully. Response includes user profile and new JWT tokens.',
    type: AuthResponseDto,
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
  ): Promise<AuthResponseDto> {
    // Validate refresh token is provided
    if (!refreshTokenRequestDto?.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    try {
      // Call service with refresh token and convert result to response DTO
      const result = await this.authService.refreshToken(
        refreshTokenRequestDto.refreshToken,
      );
      return this.authMapper.userToAuthResponse(result.user, result.tokens);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      throw error;
    }
  }
}
