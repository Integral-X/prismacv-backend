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
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { OAuthCallbackResponseDto } from './dto/oauth-callback.response.dto';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';
import { User } from '@/modules/auth/entities/user.entity';

@ApiTags('OAuth Authentication')
@ApiBearerAuth('JWT-auth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly authMapper: AuthMapper) {}

  /* ---------------------------
        LINKEDIN AUTH FLOW
  ---------------------------- */

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
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - Missing or invalid JWT token',
  })
  async linkedinAuth() {
    // Handled by Passport
  }

  @Public()
  @Get('linkedin/callback')
  @UseGuards(LinkedInAuthGuard)
  @ApiExcludeEndpoint() // Keep hidden from Swagger
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    const { user } = req.user as { user: User };

    const userResponse = this.authMapper.userToUserAuthResponse(user);

    const response: OAuthCallbackResponseDto = {
      user: userResponse,
    };

    return res.status(HttpStatus.OK).json(response);
  }

  /* ---------------------------
            GOOGLE AUTH FLOW
  ---------------------------- */

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Initiate Google OAuth flow',
    description:
      'Redirects user to Google for authentication. After successful authentication, user will be redirected to the callback URL.',
  })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to Google OAuth page',
  })
  async googleAuth() {
    // Handled by Passport
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint() // Keep hidden from Swagger
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const { user } = req.user as { user: User };

    const userResponse = this.authMapper.userToUserAuthResponse(user);

    const response: OAuthCallbackResponseDto = {
      user: userResponse,
    };

    return res.status(HttpStatus.OK).json(response);
  }
}
