import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../services/oauth.service';
import { LinkedInOAuthProvider } from '../services/linkedin-oauth.provider';
import { User } from '@/modules/auth/entities/user.entity';
import { TokenPair } from '@/modules/auth/entities/token-pair.entity';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    private readonly linkedinProvider: LinkedInOAuthProvider,
  ) {
    const clientID = configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackURL = configService.get<string>('LINKEDIN_CALLBACK_URL');
    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error(
        'LinkedIn OAuth requires LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_CALLBACK_URL',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['r_emailaddress', 'r_liteprofile'],
    });
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
