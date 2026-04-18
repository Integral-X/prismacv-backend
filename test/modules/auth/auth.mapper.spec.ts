import { BadRequestException } from '@nestjs/common';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';

describe('AuthMapper', () => {
  let mapper: AuthMapper;

  const createTestUser = (): User => {
    const user = new User();
    user.id = '1';
    user.email = 'user@example.com';
    user.password = 'hashedpassword';
    user.name = 'Test User';
    user.role = UserRole.REGULAR;
    user.emailVerified = true;
    user.isMasterAdmin = false;
    user.createdAt = new Date();
    user.updatedAt = new Date();
    return user;
  };

  const createTestTokens = (): TokenPair => {
    const tokens = new TokenPair();
    tokens.accessToken = 'access-token';
    tokens.refreshToken = 'refresh-token';
    return tokens;
  };

  beforeEach(() => {
    mapper = new AuthMapper();
  });

  describe('userToUserLoginResponse', () => {
    it('should map user and tokens to UserLoginResponseDto', () => {
      const user = createTestUser();
      const tokens = createTestTokens();

      const result = mapper.userToUserLoginResponse(user, tokens);

      expect(result.user.id).toBe('1');
      expect(result.user.email).toBe('user@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.user.role).toBe(UserRole.REGULAR);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw BadRequestException when user is null', () => {
      const tokens = createTestTokens();

      expect(() => mapper.userToUserLoginResponse(null as any, tokens)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when tokens are null', () => {
      const user = createTestUser();

      expect(() =>
        mapper.userToUserLoginResponse(user, null as any),
      ).toThrow(BadRequestException);
    });
  });

  describe('userToProfileResponse', () => {
    it('should map user to UserProfileResponseDto', () => {
      const user = createTestUser();

      const result = mapper.userToProfileResponse(user);

      expect(result.id).toBe('1');
      expect(result.email).toBe('user@example.com');
      expect(result.name).toBe('Test User');
      expect(result.role).toBe(UserRole.REGULAR);
      expect(result.emailVerified).toBe(true);
    });

    it('should throw BadRequestException when user is null', () => {
      expect(() => mapper.userToProfileResponse(null as any)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('userToUserAuthResponse', () => {
    it('should map user to UserAuthResponseDto (no tokens)', () => {
      const user = createTestUser();

      const result = mapper.userToUserAuthResponse(user);

      expect(result.user.id).toBe('1');
      expect(result.user.email).toBe('user@example.com');
      expect(result).not.toHaveProperty('accessToken');
    });

    it('should throw BadRequestException when user is null', () => {
      expect(() => mapper.userToUserAuthResponse(null as any)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('signupRequestToEntity', () => {
    it('should map signup DTO to User entity', () => {
      const dto = { email: 'User@Example.COM', password: 'pass123', name: ' Test ' };

      const result = mapper.signupRequestToEntity(dto);

      expect(result.email).toBe('user@example.com');
      expect(result.password).toBe('pass123');
      expect(result.name).toBe('Test');
    });

    it('should throw BadRequestException when dto is null', () => {
      expect(() => mapper.signupRequestToEntity(null as any)).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when email is missing', () => {
      expect(() =>
        mapper.signupRequestToEntity({ email: '', password: 'pass', name: 'x' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('loginRequestToCredentials', () => {
    it('should map login DTO to AuthCredentials', () => {
      const dto = { email: 'User@Example.COM', password: 'pass123' };

      const result = mapper.loginRequestToCredentials(dto);

      expect(result.email).toBe('user@example.com');
      expect(result.password).toBe('pass123');
    });

    it('should throw BadRequestException when dto is null', () => {
      expect(() => mapper.loginRequestToCredentials(null as any)).toThrow(
        BadRequestException,
      );
    });
  });
});
