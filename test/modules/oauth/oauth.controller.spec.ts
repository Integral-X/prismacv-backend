import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthController } from '../../../src/modules/oauth/oauth.controller';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { LinkedInCvService } from '../../../src/modules/oauth/services/linkedin-cv.service';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';
import { mockUser } from '../../helpers/mock-user.helper';
import { UserRole } from '../../../src/modules/auth/entities/user.entity';

describe('OAuthController', () => {
  let controller: OAuthController;
  let authMapper: jest.Mocked<AuthMapper>;
  let linkedInCvService: jest.Mocked<LinkedInCvService>;

  const testUser = mockUser({
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    role: UserRole.REGULAR,
  });

  const testTokens = Object.assign(new TokenPair(), {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OAuthController],
      providers: [
        {
          provide: AuthMapper,
          useValue: {
            userToProfileResponse: jest.fn().mockReturnValue({
              id: '1',
              email: 'user@example.com',
              name: 'Test User',
              role: UserRole.REGULAR,
            }),
          },
        },
        {
          provide: LinkedInCvService,
          useValue: {
            importForUser: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:3001';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<OAuthController>(OAuthController);
    authMapper = module.get(AuthMapper);
    linkedInCvService = module.get(LinkedInCvService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('linkedinCallback', () => {
    it('should redirect to frontend with encoded tokens', async () => {
      const req = {
        user: { user: testUser, tokens: testTokens },
      } as any;
      const res = {
        redirect: jest.fn(),
      } as any;

      await controller.linkedinCallback(req, res);

      expect(authMapper.userToProfileResponse).toHaveBeenCalledWith(testUser);
      expect(res.redirect).toHaveBeenCalledWith(
        HttpStatus.FOUND,
        expect.stringContaining('/auth/oauth-callback#token='),
      );
    });
  });

  describe('googleCallback', () => {
    it('should redirect to frontend with encoded tokens', async () => {
      const req = {
        user: { user: testUser, tokens: testTokens },
      } as any;
      const res = {
        redirect: jest.fn(),
      } as any;

      await controller.googleCallback(req, res);

      expect(authMapper.userToProfileResponse).toHaveBeenCalledWith(testUser);
      expect(res.redirect).toHaveBeenCalledWith(
        HttpStatus.FOUND,
        expect.stringContaining('/auth/oauth-callback#token='),
      );
    });
  });

  describe('importLinkedInProfile', () => {
    it('should call linkedInCvService.importForUser with correct args', async () => {
      const mockResponse = { source: {}, profile: {} } as any;
      linkedInCvService.importForUser.mockResolvedValue(mockResponse);

      const body = { handleOrUrl: 'john-doe' };

      const result = await controller.importLinkedInProfile(testUser, body);

      expect(linkedInCvService.importForUser).toHaveBeenCalledWith(
        '1',
        'john-doe',
      );
      expect(result).toBe(mockResponse);
    });
  });
});
