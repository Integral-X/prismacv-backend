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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { OAuthCallbackResponseDto } from './dto/oauth-callback.response.dto';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';
import { User } from '@/modules/auth/entities/user.entity';

@ApiTags('OAuth Authentication')
@ApiBearerAuth('JWT-auth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly authMapper: AuthMapper) {}

  @Get('linkedin')
  @UseGuards(LinkedInAuthGuard)
  @ApiOperation({
    summary: 'Initiate LinkedIn OAuth flow',
    description:
      'Redirects user to LinkedIn for authentication. After successful authentication, user will be redirected to the callback URL.',
  })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to LinkedIn OAuth page',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Missing or invalid JWT token',
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
      'Handles the callback from LinkedIn after user authentication. Returns user profile.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OAuth authentication successful. Returns user profile.',
    type: OAuthCallbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - OAuth authentication failed',
  })
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    // req.user is set by Passport strategy after successful authentication
    const { user } = req.user as { user: User };

    // Map user to response DTO
    const userResponse = this.authMapper.userToUserAuthResponse(user);

    const response: OAuthCallbackResponseDto = {
      user: userResponse,
    };

    res.status(HttpStatus.OK).json(response);
  }
}
