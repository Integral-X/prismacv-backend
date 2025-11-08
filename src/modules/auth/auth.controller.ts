import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RefreshTokenRequestDto } from './dto/request/refresh-token.request.dto';
import { AdminAuthResponseDto } from './dto/response/admin-auth.response.dto';
import { AuthMapper } from './mappers/auth.mapper';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Admin Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
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
}
