import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { OAuthService } from '../services/oauth.service';
import { GoogleOAuthProvider } from '../services/google-oauth.provider';
import { User } from '@/modules/auth/entities/user.entity';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthService: OAuthService,
    private readonly googleProvider: GoogleOAuthProvider,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<{ user: User }> {
    // Transform Google profile → our internal format
    const oauthProfile = this.googleProvider.validateProfile(profile);

    // Let oauth service handle DB user creation / login
    const result = await this.oauthService.authenticate({
      profile: oauthProfile,
      accessToken,
      refreshToken,
    });

    return result;
  }
}
