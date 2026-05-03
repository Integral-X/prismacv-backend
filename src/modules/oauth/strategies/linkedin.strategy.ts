import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../services/oauth.service';
import { LinkedInOAuthProvider } from '../services/linkedin-oauth.provider';
import { User } from '@/modules/auth/entities/user.entity';
import { TokenPair } from '@/modules/auth/entities/token-pair.entity';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  private readonly logger = new Logger(LinkedInStrategy.name);
  private readonly configured: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    private readonly linkedinProvider: LinkedInOAuthProvider,
  ) {
    const clientID = configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackURL = configService.get<string>('LINKEDIN_CALLBACK_URL');

    // Use placeholders when env vars are missing so the module bootstraps
    // and routes are registered. Requests will fail gracefully in validate().
    super({
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      callbackURL: callbackURL || 'http://localhost/not-configured',
      scope: ['r_emailaddress', 'r_liteprofile'],
    });

    this.configured = !!(clientID && clientSecret && callbackURL);
    if (!this.configured) {
      this.logger.warn(
        'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_CALLBACK_URL to enable it.',
      );
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<{ user: User; tokens: TokenPair }> {
    // Transform LinkedIn profile to our OAuthProfile format
    const oauthProfile = this.linkedinProvider.validateProfile(profile);

    // Authenticate user via OAuth service
    const result = await this.oauthService.authenticate({
      profile: oauthProfile,
      accessToken,
      refreshToken,
    });

    return result;
  }
}
