import {
  Controller,
  Get,
  UseGuards,
  Req,
  Res,
  Post,
  Body,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { GetUser } from '@/common/decorators/get-user.decorator';
import { OAuthCallbackResponseDto } from './dto/oauth-callback.response.dto';
import { LinkedinImportRequestDto } from './dto/linkedin-import.request.dto';
import { LinkedinCvResponseDto } from './dto/linkedin-cv.response.dto';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';
import { User } from '@/modules/auth/entities/user.entity';
import { TokenPair } from '@/modules/auth/entities/token-pair.entity';
import { LinkedInCvService } from './services/linkedin-cv.service';

@ApiTags('OAuth Authentication')
@ApiBearerAuth('JWT-auth')
@Controller('oauth')
export class OAuthController {
  private readonly frontendUrl: string;

  constructor(
    private readonly authMapper: AuthMapper,
    private readonly linkedInCvService: LinkedInCvService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.resolveFrontendUrl();
  }

  private resolveFrontendUrl(): string {
    const defaultFrontendUrl = 'http://localhost:3001';
    const configuredFrontendUrl =
      this.configService.get<string>('FRONTEND_URL');

    if (configuredFrontendUrl?.trim()) {
      try {
        return new URL(configuredFrontendUrl.trim()).origin;
      } catch {
        return defaultFrontendUrl;
      }
    }

    const corsOrigin = this.configService.get<string>('CORS_ORIGIN')?.trim();
    if (!corsOrigin || corsOrigin === '*') {
      return defaultFrontendUrl;
    }

    const origins = corsOrigin
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);

    if (origins.length !== 1) {
      return defaultFrontendUrl;
    }

    try {
      return new URL(origins[0]).origin;
    } catch {
      return defaultFrontendUrl;
    }
  }

  private buildOAuthRedirectUrl(response: OAuthCallbackResponseDto): string {
    const payload = Buffer.from(JSON.stringify(response)).toString('base64url');
    return `${this.frontendUrl}/auth/oauth-callback#token=${payload}`;
  }

  /* ---------------------------
        LINKEDIN AUTH FLOW
  ---------------------------- */

  @Public()
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
  async linkedinAuth() {
    // Handled by Passport
  }

  @Public()
  @Get('linkedin/callback')
  @UseGuards(LinkedInAuthGuard)
  @ApiExcludeEndpoint() // Keep hidden from Swagger
  async linkedinCallback(@Req() req: Request, @Res() res: Response) {
    const { user, tokens } = req.user as { user: User; tokens: TokenPair };

    const response: OAuthCallbackResponseDto = {
      user: this.authMapper.userToProfileResponse(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    return res.redirect(HttpStatus.FOUND, this.buildOAuthRedirectUrl(response));
  }

  /* ---------------------------
            GOOGLE AUTH FLOW
  ---------------------------- */

  @Public()
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
    const { user, tokens } = req.user as { user: User; tokens: TokenPair };

    const response: OAuthCallbackResponseDto = {
      user: this.authMapper.userToProfileResponse(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };

    return res.redirect(HttpStatus.FOUND, this.buildOAuthRedirectUrl(response));
  }

  /* ---------------------------
        LINKEDIN CV IMPORT
  ---------------------------- */

  @Public()
  @UseGuards(JwtUserAuthGuard)
  @Post('linkedin/import')
  @ApiOperation({
    summary: 'Import LinkedIn profile data for CV generation',
    description:
      "Accepts a LinkedIn handle or profile URL and returns a CV-ready profile payload based on the authenticated user's own LinkedIn data. Requires the user to have connected LinkedIn via OAuth.",
  })
  @ApiResponse({
    status: 200,
    description: 'LinkedIn profile imported successfully.',
    type: LinkedinCvResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid LinkedIn handle or URL',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - LinkedIn account not connected or missing token',
  })
  async importLinkedInProfile(
    @GetUser() user: User,
    @Body() body: LinkedinImportRequestDto,
  ): Promise<LinkedinCvResponseDto> {
    return this.linkedInCvService.importForUser(user.id, body.handleOrUrl);
  }
}
