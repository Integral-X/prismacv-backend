import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersService } from '../../../src/modules/auth/users.service';
import { JwtService } from '@nestjs/jwt';
import {
  UnauthorizedException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../src/config/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { User } from '../../../src/modules/auth/entities/user.entity';
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
      user.name = null;
      user.refreshToken = null;
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
      user.name = null;
      user.refreshToken = null;
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
        authService.refreshToken('some-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = null;
      user.refreshToken = 'hashed-token';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      jest.spyOn(usersService, 'findById').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        authService.refreshToken('some-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user entity and new tokens if refresh is successful', async () => {
      const user = new User();
      user.id = '1';
      user.email = 'test@example.com';
      user.password = 'hashedpassword';
      user.name = null;
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

      const result = await authService.refreshToken('some-refresh-token');

      expect(result.user).toEqual(user);
      expect(result.tokens).toBeInstanceOf(TokenPair);
      expect(result.tokens.accessToken).toBe('new-access');
      expect(result.tokens.refreshToken).toBe('new-refresh');
    });
  });
});
