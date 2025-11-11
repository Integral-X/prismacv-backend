import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { OAuthCallbackResponseDto } from './dto/oauth-callback.response.dto';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';

@ApiTags('OAuth Authentication')
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
    status: 302,
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
      'Handles the callback from LinkedIn after user authentication. Returns user profile and JWT tokens.',
  })
  @ApiResponse({
    status: 200,
    description:
      'OAuth authentication successful. Returns user profile and JWT tokens.',
    type: OAuthCallbackResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'OAuth authentication failed',
  })
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    // req.user is set by Passport strategy after successful authentication
    const { user, tokens } = req.user as any;

    // Map user to response DTO
    const userResponse = this.authMapper.userToUserAuthResponse(user);

    const response: OAuthCallbackResponseDto = {
      user: userResponse,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    // In production, you might want to redirect to frontend with tokens
    // For now, return JSON response
    res.status(HttpStatus.OK).json(response);
  }
}
