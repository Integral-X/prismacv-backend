import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { OtpService } from '../../../src/modules/auth/otp.service';
import { UsersService } from '../../../src/modules/auth/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../src/config/prisma.service';
import { EmailService } from '../../../src/modules/email/email.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';
import { AuthCredentials } from '../../../src/modules/auth/entities/auth-credentials.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';

describe('AuthService', () => {
  let authService: AuthService;

  let usersService: UsersService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let jwtService: JwtService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        JwtService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                OTP_EXPIRY_MINUTES: 10,
                APP_NAME: 'PrismaCV',
                'security.encryptionKey': '01234567890123456789012345678901',
                JWT_SECRET: '01234567890123456789012345678901',
                JWT_REFRESH_SECRET: '01234567890123456789012345678901',
                'app.name': 'PrismaCV',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendOtpEmail: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: OtpService,
          useValue: {
            generateOtpCode: jest.fn().mockReturnValue('123456'),
            generateAndSendOtp: jest
              .fn()
              .mockResolvedValue({ expiresAt: new Date() }),
            verifyOtp: jest.fn(),
            resendOtp: jest.fn().mockResolvedValue({ expiresAt: new Date() }),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user entity if validation is successful', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'test@example.com';
      credentials.password = 'password';

      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = undefined;
      user.refreshToken = undefined;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await authService.validateUser(credentials);
      expect(result).toEqual(user);
      expect(usersService.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        user.password,
      );
    });

    it('should return null if user is not found', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'test@example.com';
      credentials.password = 'password';

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      const result = await authService.validateUser(credentials);
      expect(result).toBeNull();
      expect(usersService.findByEmail).toHaveBeenCalledWith(credentials.email);
    });

    it('should return null if password does not match', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'test@example.com';
      credentials.password = 'password';

      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = undefined;
      user.refreshToken = undefined;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await authService.validateUser(credentials);
      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        credentials.password,
        user.password,
      );
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      jest
        .spyOn(authService, 'decodeRefreshToken')
        .mockResolvedValue({ sub: '1', email: 'test@example.com' });
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      jest.spyOn(usersService, 'findById').mockResolvedValue(null);
      await expect(
        authService.refreshToken('some-refresh-token', 'platform-admin'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = undefined;
      user.role = UserRole.PLATFORM_ADMIN;
      user.refreshToken = 'hashed-token';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findById').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        authService.refreshToken('some-refresh-token', 'platform-admin'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if role does not match audience', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.role = UserRole.REGULAR;
      user.refreshToken = 'hashed-token';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findById').mockResolvedValue(user);

      await expect(
        authService.refreshToken('some-refresh-token', 'platform-admin'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user entity and new tokens if refresh is successful', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = undefined;
      user.role = UserRole.PLATFORM_ADMIN;
      user.refreshToken = 'hashed-token';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const tokenData = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      };
      jest.spyOn(usersService, 'findById').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(authService, 'getTokens').mockResolvedValue(tokenData);
      jest
        .spyOn(authService, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      const result = await authService.refreshToken(
        'some-refresh-token',
        'platform-admin',
      );

      expect(result.user).toEqual(user);
      expect(result.tokens).toBeInstanceOf(TokenPair);
      expect(result.tokens.accessToken).toBe('new-access');
      expect(result.tokens.refreshToken).toBe('new-refresh');
    });
  });

  describe('onModuleInit', () => {
    it('should not throw when secrets are valid', () => {
      expect(() => authService.onModuleInit()).not.toThrow();
    });

    it('should throw when JWT_SECRET is missing', () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'JWT_SECRET') return undefined;
          if (key === 'JWT_REFRESH_SECRET')
            return '01234567890123456789012345678901';
          return undefined;
        }),
      } as unknown as ConfigService;

      const service = new AuthService(
        {} as any,
        {} as any,
        mockConfig,
        {} as any,
        {} as any,
        {} as any,
      );

      expect(() => service.onModuleInit()).toThrow(
        'JWT_SECRET is not set or too short',
      );
    });

    it('should throw when JWT_SECRET is too short', () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'JWT_SECRET') return 'short';
          if (key === 'JWT_REFRESH_SECRET')
            return '01234567890123456789012345678901';
          return undefined;
        }),
      } as unknown as ConfigService;

      const service = new AuthService(
        {} as any,
        {} as any,
        mockConfig,
        {} as any,
        {} as any,
        {} as any,
      );

      expect(() => service.onModuleInit()).toThrow(
        'JWT_SECRET is not set or too short',
      );
    });

    it('should throw when JWT_REFRESH_SECRET is missing', () => {
      const mockConfig = {
        get: jest.fn((key: string) => {
          if (key === 'JWT_SECRET') return '01234567890123456789012345678901';
          if (key === 'JWT_REFRESH_SECRET') return undefined;
          return undefined;
        }),
      } as unknown as ConfigService;

      const service = new AuthService(
        {} as any,
        {} as any,
        mockConfig,
        {} as any,
        {} as any,
        {} as any,
      );

      expect(() => service.onModuleInit()).toThrow(
        'JWT_REFRESH_SECRET is not set or too short',
      );
    });
  });

  describe('userLogin', () => {
    it('should return user and tokens for valid REGULAR user with verified email', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'user@example.com';
      credentials.password = 'password';

      const user = new User();
      user.id = '1';
      user.email = 'user@example.com';
      user.password = 'hashedpassword';
      user.role = UserRole.REGULAR;
      user.emailVerified = true;
      user.isMasterAdmin = false;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(authService, 'validateUser').mockResolvedValue(user);
      jest.spyOn(authService, 'getTokens').mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });
      jest
        .spyOn(authService, 'updateRefreshToken')
        .mockResolvedValue(undefined);

      const result = await authService.userLogin(credentials);

      expect(result.user).toEqual(user);
      expect(result.tokens).toBeInstanceOf(TokenPair);
      expect(result.tokens.accessToken).toBe('access');
      expect(result.tokens.refreshToken).toBe('refresh');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'user@example.com';
      credentials.password = 'wrong';

      jest.spyOn(authService, 'validateUser').mockResolvedValue(null);

      await expect(authService.userLogin(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is not REGULAR role', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'admin@example.com';
      credentials.password = 'password';

      const user = new User();
      user.id = '1';
      user.email = 'admin@example.com';
      user.password = 'hashedpassword';
      user.role = UserRole.PLATFORM_ADMIN;
      user.emailVerified = true;

      jest.spyOn(authService, 'validateUser').mockResolvedValue(user);

      await expect(authService.userLogin(credentials)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if email is not verified', async () => {
      const credentials = new AuthCredentials();
      credentials.email = 'user@example.com';
      credentials.password = 'password';

      const user = new User();
      user.id = '1';
      user.email = 'user@example.com';
      user.password = 'hashedpassword';
      user.role = UserRole.REGULAR;
      user.emailVerified = false;

      jest.spyOn(authService, 'validateUser').mockResolvedValue(user);

      await expect(authService.userLogin(credentials)).rejects.toThrow(
        'Email address not verified',
      );
    });
  });

  describe('getTokens', () => {
    it('should return access and refresh tokens', async () => {
      const result = await authService.getTokens(
        'user-1',
        'user@example.com',
        UserRole.REGULAR,
        false,
        'user',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });
  });

  describe('decodeRefreshToken', () => {
    it('should throw UnauthorizedException for invalid token', async () => {
      await expect(
        authService.decodeRefreshToken('invalid-token', 'user'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
