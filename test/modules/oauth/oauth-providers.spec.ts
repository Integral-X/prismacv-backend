import { BadRequestException } from '@nestjs/common';
import { GoogleOAuthProvider } from '../../../src/modules/oauth/services/google-oauth.provider';
import { LinkedInOAuthProvider } from '../../../src/modules/oauth/services/linkedin-oauth.provider';
import { OAUTH_PROVIDERS } from '../../../src/shared/constants/oauth.constants';

describe('GoogleOAuthProvider', () => {
  let provider: GoogleOAuthProvider;

  beforeEach(() => {
    provider = new GoogleOAuthProvider();
  });

  it('should return google as provider name', () => {
    expect(provider.getProviderName()).toBe(OAUTH_PROVIDERS.GOOGLE);
  });

  it('should validate a valid Google profile', () => {
    const profile = {
      id: 'google-123',
      displayName: 'John Doe',
      name: { givenName: 'John', familyName: 'Doe' },
      emails: [{ value: 'john@example.com', verified: true }],
      photos: [{ value: 'https://example.com/photo.jpg' }],
    } as any;

    const result = provider.validateProfile(profile);

    expect(result.provider).toBe(OAUTH_PROVIDERS.GOOGLE);
    expect(result.providerId).toBe('google-123');
    expect(result.email).toBe('john@example.com');
    expect(result.name).toBe('John Doe');
    expect(result.picture).toBe('https://example.com/photo.jpg');
  });

  it('should throw BadRequestException for missing id', () => {
    const profile = {
      emails: [{ value: 'john@example.com' }],
    } as any;

    expect(() => provider.validateProfile(profile)).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException for missing email', () => {
    const profile = {
      id: 'google-123',
      emails: [],
    } as any;

    expect(() => provider.validateProfile(profile)).toThrow(
      BadRequestException,
    );
  });
});

describe('LinkedInOAuthProvider', () => {
  let provider: LinkedInOAuthProvider;

  beforeEach(() => {
    provider = new LinkedInOAuthProvider();
  });

  it('should return linkedin as provider name', () => {
    expect(provider.getProviderName()).toBe(OAUTH_PROVIDERS.LINKEDIN);
  });

  it('should validate a valid LinkedIn profile', () => {
    const profile = {
      id: 'linkedin-456',
      displayName: 'Jane Smith',
      name: { givenName: 'Jane', familyName: 'Smith' },
      emails: [{ value: 'jane@example.com' }],
      photos: [{ value: 'https://example.com/jane.jpg' }],
    } as any;

    const result = provider.validateProfile(profile);

    expect(result.provider).toBe(OAUTH_PROVIDERS.LINKEDIN);
    expect(result.providerId).toBe('linkedin-456');
    expect(result.email).toBe('jane@example.com');
    expect(result.name).toBe('Jane Smith');
  });

  it('should throw BadRequestException for missing id', () => {
    const profile = {
      emails: [{ value: 'jane@example.com' }],
    } as any;

    expect(() => provider.validateProfile(profile)).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException for missing email', () => {
    const profile = {
      id: 'linkedin-456',
      emails: [],
    } as any;

    expect(() => provider.validateProfile(profile)).toThrow(
      BadRequestException,
    );
  });
});
