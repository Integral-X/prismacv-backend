/**
 * OAuth provider profile data structure
 * Standardized format that all OAuth providers should return
 */
export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name?: string;
  picture?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * OAuth provider interface
 * All OAuth providers (LinkedIn, Google, etc.) must implement this
 * @template TProfile - The provider-specific profile type (e.g., Profile from passport-linkedin-oauth2)
 */
export interface IOAuthProvider<TProfile = unknown> {
  /**
   * Get the provider name (e.g., 'LINKEDIN', 'GOOGLE')
   */
  getProviderName(): string;

  /**
   * Validate and transform provider-specific profile to OAuthProfile
   * @param profile - Raw profile data from OAuth provider
   */
  validateProfile(profile: TProfile): OAuthProfile;
}
