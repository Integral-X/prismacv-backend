import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { OAuthService } from '../../../src/modules/oauth/services/oauth.service';
import { UsersService } from '../../../src/modules/auth/users.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRole } from '../../../src/modules/auth/entities/user.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';
import { mockUser } from '../../helpers/mock-user.helper';

describe('OAuthService', () => {
  let oauthService: OAuthService;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;

  const baseOAuthData = {
    profile: {
      provider: 'google',
      providerId: 'google-123',
      email: 'user@example.com',
      name: 'OAuth User',
      picture: 'https://example.com/photo.jpg',
    },
    accessToken: 'oauth-access-token',
    refreshToken: 'oauth-refresh-token',
    expiresAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OAuthService,
        {
          provide: UsersService,
          useValue: {
            findByProvider: jest.fn(),
            findByEmail: jest.fn(),
            createOAuthUser: jest.fn(),
            linkOAuthAccount: jest.fn(),
            updateOAuthMetadata: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            getTokens: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    oauthService = module.get<OAuthService>(OAuthService);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);
  });

  describe('authenticate', () => {
    it('should authenticate existing OAuth user and return tokens', async () => {
      const existingUser = mockUser({
        id: '1',
        email: 'user@example.com',
        role: UserRole.REGULAR,
        provider: 'google',
        providerId: 'google-123',
      });

      usersService.findByProvider.mockResolvedValue(existingUser);
      usersService.updateOAuthMetadata.mockResolvedValue(existingUser);
      authService.getTokens.mockResolvedValue({
        accessToken: 'jwt-access',
        refreshToken: 'jwt-refresh',
      });
      authService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await oauthService.authenticate(baseOAuthData);

      expect(result.user).toEqual(existingUser);
      expect(result.tokens).toBeInstanceOf(TokenPair);
      expect(result.tokens.accessToken).toBe('jwt-access');
      expect(result.tokens.refreshToken).toBe('jwt-refresh');
      expect(authService.getTokens).toHaveBeenCalledWith(
        '1',
        'user@example.com',
        UserRole.REGULAR,
        false,
        'user',
      );
    });

    it('should create new OAuth user when not found', async () => {
      const newUser = mockUser({
        id: '2',
        email: 'user@example.com',
        role: UserRole.REGULAR,
      });

      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      usersService.createOAuthUser.mockResolvedValue(newUser);
      usersService.updateOAuthMetadata.mockResolvedValue(newUser);
      authService.getTokens.mockResolvedValue({
        accessToken: 'jwt-access',
        refreshToken: 'jwt-refresh',
      });
      authService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await oauthService.authenticate(baseOAuthData);

      expect(usersService.createOAuthUser).toHaveBeenCalledWith(
        baseOAuthData.profile,
      );
      expect(result.tokens.accessToken).toBe('jwt-access');
    });

    it('should link OAuth to existing email-password user', async () => {
      const existingUser = mockUser({
        id: '3',
        email: 'user@example.com',
        role: UserRole.REGULAR,
        provider: null,
      });
      const linkedUser = mockUser({
        ...existingUser,
        provider: 'google',
        providerId: 'google-123',
      });

      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(existingUser);
      usersService.linkOAuthAccount.mockResolvedValue(linkedUser);
      usersService.updateOAuthMetadata.mockResolvedValue(linkedUser);
      authService.getTokens.mockResolvedValue({
        accessToken: 'jwt-access',
        refreshToken: 'jwt-refresh',
      });
      authService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await oauthService.authenticate(baseOAuthData);

      expect(usersService.linkOAuthAccount).toHaveBeenCalled();
      expect(result.tokens.accessToken).toBe('jwt-access');
    });

    it('should throw ConflictException when email exists with different OAuth provider', async () => {
      const existingUser = mockUser({
        id: '4',
        email: 'user@example.com',
        provider: 'linkedin',
      });

      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(existingUser);

      await expect(oauthService.authenticate(baseOAuthData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw UnauthorizedException for existing provider user with non-REGULAR role', async () => {
      const adminUser = mockUser({
        id: '5',
        email: 'admin@example.com',
        role: UserRole.PLATFORM_ADMIN,
      });

      usersService.findByProvider.mockResolvedValue(adminUser);

      await expect(oauthService.authenticate(baseOAuthData)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.updateOAuthMetadata).not.toHaveBeenCalled();
      expect(authService.getTokens).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException before linking if existing email user is non-REGULAR', async () => {
      const adminUser = mockUser({
        id: '6',
        email: 'admin@example.com',
        role: UserRole.PLATFORM_ADMIN,
        provider: null,
      });

      usersService.findByProvider.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(adminUser);

      await expect(oauthService.authenticate(baseOAuthData)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.linkOAuthAccount).not.toHaveBeenCalled();
      expect(usersService.updateOAuthMetadata).not.toHaveBeenCalled();
    });
  });
});
