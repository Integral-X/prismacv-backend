import { Injectable } from '@nestjs/common';
import { Profile } from 'passport-google-oauth20';
import {
  IOAuthProvider,
  OAuthProfile,
} from '../interfaces/oauth-provider.interface';
import { OAUTH_PROVIDERS } from '@/shared/constants/oauth.constants';

/**
 * Google OAuth provider implementation
 * Transforms Google's profile into a unified OAuthProfile format
 */
@Injectable()
export class GoogleOAuthProvider implements IOAuthProvider<Profile> {
  getProviderName(): string {
    return OAUTH_PROVIDERS.GOOGLE;
  }

  validateProfile(profile: Profile): OAuthProfile {
    // Basic validation to ensure Google provided required fields
    if (!profile?.id) {
      throw new Error('Invalid Google profile: missing id');
    }

    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('Invalid Google profile: missing email');
    }

    return {
      provider: this.getProviderName(),
      providerId: profile.id,
      email,
      name:
        profile.displayName ||
        `${profile.name?.givenName ?? ''} ${profile.name?.familyName ?? ''}`.trim() ||
        undefined,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      picture: profile.photos?.[0]?.value,
    };
  }
}
