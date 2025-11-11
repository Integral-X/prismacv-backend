import { Injectable } from '@nestjs/common';
import { Profile } from 'passport-linkedin-oauth2';
import {
  IOAuthProvider,
  OAuthProfile,
} from '../interfaces/oauth-provider.interface';

/**
 * LinkedIn OAuth provider implementation
 * Handles LinkedIn-specific profile transformation
 */
@Injectable()
export class LinkedInOAuthProvider implements IOAuthProvider<Profile> {
  getProviderName(): string {
    return 'LINKEDIN';
  }

  validateProfile(profile: Profile): OAuthProfile {
    // LinkedIn profile structure from passport-linkedin-oauth2
    // https://github.com/auth0/passport-linkedin-oauth2
    if (!profile || !profile.id) {
      throw new Error('Invalid LinkedIn profile: missing id');
    }

    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('Invalid LinkedIn profile: missing email');
    }

    return {
      provider: this.getProviderName(),
      providerId: profile.id,
      email: email,
      name:
        profile.displayName ||
        `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
        undefined,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      picture: profile.photos?.[0]?.value,
    };
  }
}
