import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserAuthController } from '../../../src/modules/auth/user-auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { UserLoginRequestDto } from '../../../src/modules/auth/dto/request/user-login.request.dto';
import { UserSignupRequestDto } from '../../../src/modules/auth/dto/request/user-signup.request.dto';
import { UserAuthResponseDto } from '../../../src/modules/auth/dto/response/user-auth.response.dto';
import { UserLoginResponseDto } from '../../../src/modules/auth/dto/response/user-login.response.dto';
import { UserProfileResponseDto } from '../../../src/modules/auth/dto/response/user-profile.response.dto';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';
import { AuthCredentials } from '../../../src/modules/auth/entities/auth-credentials.entity';

describe('UserAuthController', () => {
  let controller: UserAuthController;
  let authService: jest.Mocked<AuthService>;
  let authMapper: jest.Mocked<AuthMapper>;

  const mockRegularUser: User = Object.assign(new User(), {
    id: '2',
    email: 'user@example.com',
    password: 'hashedpassword',
    name: 'Regular User',
    role: UserRole.REGULAR,
    refreshToken: null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockUserProfile: UserProfileResponseDto = {
    id: '2',
    email: 'user@example.com',
    name: 'Regular User',
    role: UserRole.REGULAR,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens: TokenPair = Object.assign(new TokenPair(), {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  });

  const mockUserAuthResponse: UserAuthResponseDto = {
    user: mockUserProfile,
  };

  const mockUserLoginResponse: UserLoginResponseDto = {
    user: mockUserProfile,
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockAuthService = {
      userLogin: jest.fn(),
      userSignup: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      changePassword: jest.fn(),
      refreshToken: jest.fn(),
    };

    const mockAuthMapper = {
      signupRequestToEntity: jest.fn(),
      loginRequestToCredentials: jest.fn(),
      userToUserAuthResponse: jest.fn(),
      userToUserLoginResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuthMapper,
          useValue: mockAuthMapper,
        },
      ],
    }).compile();

    controller = module.get<UserAuthController>(UserAuthController);
    authService = module.get(AuthService);
    authMapper = module.get(AuthMapper);
  });

  describe('login', () => {
    it('should login user successfully and return tokens', async () => {
      const loginDto: UserLoginRequestDto = {
        email: 'user@example.com',
        password: 'user123',
      };

      const credentials = new AuthCredentials();
      credentials.email = loginDto.email;
      credentials.password = loginDto.password;

      authMapper.loginRequestToCredentials.mockReturnValue(credentials);
      authService.userLogin.mockResolvedValue({
        user: mockRegularUser,
        tokens: mockTokens,
      });
      authMapper.userToUserLoginResponse.mockReturnValue(mockUserLoginResponse);

      const result = await controller.login(loginDto);

      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.userLogin).toHaveBeenCalledWith(credentials);
      expect(authMapper.userToUserLoginResponse).toHaveBeenCalledWith(
        mockRegularUser,
        mockTokens,
      );
      expect(result).toEqual(mockUserLoginResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should handle mapper error during user login', async () => {
      const loginDto: UserLoginRequestDto = {
        email: 'user@example.com',
        password: 'user123',
      };

      authMapper.loginRequestToCredentials.mockImplementation(() => {
        throw new BadRequestException('Login data is required');
      });

      await expect(controller.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.userLogin).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
    it('should signup user successfully with DTOs and mapper', async () => {
      const signupDto: UserSignupRequestDto = {
        email: 'user@example.com',
        password: 'user123',
        name: 'Regular User',
      };

      const userEntity = new User();
      userEntity.email = signupDto.email;
      userEntity.password = signupDto.password;
      userEntity.name = signupDto.name;

      authMapper.signupRequestToEntity.mockReturnValue(userEntity);
      authService.userSignup.mockResolvedValue({
        user: mockRegularUser,
      });
      authMapper.userToUserAuthResponse.mockReturnValue(mockUserAuthResponse);

      const result = await controller.signup(signupDto);

      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.userSignup).toHaveBeenCalledWith(userEntity);
      expect(authMapper.userToUserAuthResponse).toHaveBeenCalledWith(
        mockRegularUser,
      );
      expect(result).toEqual(mockUserAuthResponse);
    });

    it('should handle mapper error during user signup', async () => {
      const signupDto: UserSignupRequestDto = {
        email: 'user@example.com',
        password: 'user123',
        name: 'Regular User',
      };

      authMapper.signupRequestToEntity.mockImplementation(() => {
        throw new BadRequestException('Signup data is required');
      });

      await expect(controller.signup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.userSignup).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with email', async () => {
      const forgotDto = { email: 'user@example.com' };
      const expectedResponse = {
        message: 'If the email exists, an OTP has been sent.',
      };

      authService.forgotPassword.mockResolvedValue(expectedResponse);

      const result = await controller.forgotPassword(forgotDto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(
        'user@example.com',
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword with token and passwords', async () => {
      const resetDto = {
        resetToken: 'valid-token',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123',
      };
      const expectedResponse = { message: 'Password reset successfully' };

      authService.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(resetDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'valid-token',
        'newPass123',
        'newPass123',
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with user id from JWT', async () => {
      const changeDto = {
        currentPassword: 'oldPass123',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123',
      };
      const expectedResponse = { message: 'Password changed successfully' };

      authService.changePassword.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(
        changeDto,
        mockRegularUser,
      );

      expect(authService.changePassword).toHaveBeenCalledWith(
        '2',
        'oldPass123',
        'newPass123',
        'newPass123',
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('refresh', () => {
    it('should refresh user token successfully', async () => {
      const refreshDto = { refreshToken: 'valid-refresh-token' };

      authService.refreshToken.mockResolvedValue({
        user: mockRegularUser,
        tokens: mockTokens,
      });
      authMapper.userToUserLoginResponse.mockReturnValue(mockUserLoginResponse);

      const result = await controller.refresh(refreshDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
        'user',
      );
      expect(authMapper.userToUserLoginResponse).toHaveBeenCalledWith(
        mockRegularUser,
        mockTokens,
      );
      expect(result).toEqual(mockUserLoginResponse);
    });

    it('should throw BadRequestException when refresh token is missing', async () => {
      await expect(
        controller.refresh({ refreshToken: '' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshDto = { refreshToken: 'invalid-token' };

      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token'),
      );

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
