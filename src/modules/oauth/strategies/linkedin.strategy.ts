import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-linkedin-oauth2';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../services/oauth.service';
import { LinkedInOAuthProvider } from '../services/linkedin-oauth.provider';
import { User } from '@/modules/auth/entities/user.entity';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    private readonly linkedinProvider: LinkedInOAuthProvider,
  ) {
    super({
      clientID: configService.get<string>('LINKEDIN_CLIENT_ID'),
      clientSecret: configService.get<string>('LINKEDIN_CLIENT_SECRET'),
      callbackURL: configService.get<string>('LINKEDIN_CALLBACK_URL'),
      scope: ['r_emailaddress', 'r_liteprofile'],
    });
  }

  async validate(profile: Profile): Promise<{ user: User }> {
    // Transform LinkedIn profile to our OAuthProfile format
    const oauthProfile = this.linkedinProvider.validateProfile(profile);

    // Authenticate user via OAuth service
    const result = await this.oauthService.authenticate({
      profile: oauthProfile,
    });

    return result;
  }
}
