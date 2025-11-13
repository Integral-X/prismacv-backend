import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { HTTP_STATUS } from '@/shared/constants/http-status.constants';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { OAuthCallbackResponseDto } from './dto/oauth-callback.response.dto';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';
import { User } from '@/modules/auth/entities/user.entity';

@ApiTags('OAuth Authentication')
@ApiBearerAuth()
@Controller('oauth')
export class OAuthController {
  constructor(private readonly authMapper: AuthMapper) {}

  @Public()
  @Get('linkedin')
  @UseGuards(LinkedInAuthGuard)
  @ApiOperation({
    summary: 'Initiate LinkedIn OAuth flow',
    description:
      'Redirects user to LinkedIn for authentication. After successful authentication, user will be redirected to the callback URL.',
  })
  @ApiResponse({
    status: HTTP_STATUS.FOUND,
    description: 'Redirects to LinkedIn OAuth page',
  })
  async linkedinAuth() {
    // Passport will handle the redirect
  }

  @Public()
  @Get('linkedin/callback')
  @UseGuards(LinkedInAuthGuard)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'LinkedIn OAuth callback',
    description:
      'Handles the callback from LinkedIn after user authentication. Returns user profile only (no JWT tokens). This endpoint is called by LinkedIn and must be public.',
  })
  @ApiResponse({
    status: HTTP_STATUS.OK,
    description:
      'OAuth authentication successful. Returns user profile only (no JWT tokens).',
    type: OAuthCallbackResponseDto,
  })
  @ApiResponse({
    status: HTTP_STATUS.UNAUTHORIZED,
    description: 'Unauthorized - OAuth authentication failed',
  })
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    // req.user is set by Passport strategy after successful authentication
    // Type assertion: Passport strategy returns { user }
    const { user } = req.user as { user: User };

    // Map user to response DTO
    const userResponse = this.authMapper.userToUserAuthResponse(user);

    const response: OAuthCallbackResponseDto = {
      user: userResponse,
    };

    // In production, you might want to redirect to frontend
    // For now, return JSON response
    res.status(HTTP_STATUS.OK).json(response);
  }
}
