import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserLoginRequestDto } from './dto/request/user-login.request.dto';
import { UserSignupRequestDto } from './dto/request/user-signup.request.dto';
import { UserAuthResponseDto } from './dto/response/user-auth.response.dto';
import { AuthMapper } from './mappers/auth.mapper';

@ApiTags('User Authentication')
@ApiBearerAuth('JWT-auth')
@Controller('auth/user')
export class UserAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authMapper: AuthMapper,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
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
  async login(
    @Body() loginRequestDto: UserLoginRequestDto,
  ): Promise<UserAuthResponseDto> {
    const credentials =
      this.authMapper.loginRequestToCredentials(loginRequestDto);
    const result = await this.authService.userLogin(credentials);
    return this.authMapper.userToUserAuthResponse(result.user);
  }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
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
  async signup(
    @Body() signupRequestDto: UserSignupRequestDto,
  ): Promise<UserAuthResponseDto> {
    const userEntity = this.authMapper.signupRequestToEntity(signupRequestDto);
    const result = await this.authService.userSignup(userEntity);
    return this.authMapper.userToUserAuthResponse(result.user);
  }
}
