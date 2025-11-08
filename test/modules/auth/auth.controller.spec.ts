import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { AdminLoginRequestDto } from '../../../src/modules/auth/dto/request/admin-login.request.dto';
import { AdminSignupRequestDto } from '../../../src/modules/auth/dto/request/admin-signup.request.dto';
import { UserLoginRequestDto } from '../../../src/modules/auth/dto/request/user-login.request.dto';
import { UserSignupRequestDto } from '../../../src/modules/auth/dto/request/user-signup.request.dto';
import { RefreshTokenRequestDto } from '../../../src/modules/auth/dto/request/refresh-token.request.dto';
import { AdminAuthResponseDto } from '../../../src/modules/auth/dto/response/admin-auth.response.dto';
import { UserAuthResponseDto } from '../../../src/modules/auth/dto/response/user-auth.response.dto';
import { UserProfileResponseDto } from '../../../src/modules/auth/dto/response/user-profile.response.dto';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';
import { AuthCredentials } from '../../../src/modules/auth/entities/auth-credentials.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let authMapper: jest.Mocked<AuthMapper>;

  const mockAdminUser: User = Object.assign(new User(), {
    id: '1',
    email: 'admin@example.com',
    password: 'hashedpassword',
    name: 'Admin User',
    role: UserRole.PLATFORM_ADMIN,
    refreshToken: 'refresh-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockRegularUser: User = Object.assign(new User(), {
    id: '2',
    email: 'user@example.com',
    password: 'hashedpassword',
    name: 'Regular User',
    role: UserRole.REGULAR,
    refreshToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockAdminProfile: UserProfileResponseDto = {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.PLATFORM_ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserProfile: UserProfileResponseDto = {
    id: '2',
    email: 'user@example.com',
    name: 'Regular User',
    role: UserRole.REGULAR,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenPair: TokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const mockAdminAuthResponse: AdminAuthResponseDto = {
    user: mockAdminProfile,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  const mockUserAuthResponse: UserAuthResponseDto = {
    user: mockUserProfile,
  };

  beforeEach(async () => {
    const mockAuthService = {
      refreshToken: jest.fn(),
      adminLogin: jest.fn(),
      adminSignup: jest.fn(),
      userLogin: jest.fn(),
      userSignup: jest.fn(),
    };

    const mockAuthMapper = {
      signupRequestToEntity: jest.fn(),
      loginRequestToCredentials: jest.fn(),
      userToAdminAuthResponse: jest.fn(),
      userToUserAuthResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
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

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    authMapper = module.get(AuthMapper);
  });

  describe('adminLogin', () => {
    it('should login admin successfully with DTOs and mapper', async () => {
      const loginDto: AdminLoginRequestDto = {
        email: 'admin@example.com',
        password: 'admin123',
      };

      const credentials = new AuthCredentials();
      credentials.email = loginDto.email;
      credentials.password = loginDto.password;

      authMapper.loginRequestToCredentials.mockReturnValue(credentials);
      authService.adminLogin.mockResolvedValue({
        user: mockAdminUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAdminAuthResponse.mockReturnValue(mockAdminAuthResponse);

      const result = await controller.adminLogin(loginDto);

      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.adminLogin).toHaveBeenCalledWith(credentials);
      expect(authMapper.userToAdminAuthResponse).toHaveBeenCalledWith(
        mockAdminUser,
        mockTokenPair,
      );
      expect(result).toEqual(mockAdminAuthResponse);
    });

    it('should handle mapper error during admin login', async () => {
      const loginDto: AdminLoginRequestDto = {
        email: 'admin@example.com',
        password: 'admin123',
      };

      authMapper.loginRequestToCredentials.mockImplementation(() => {
        throw new BadRequestException('Login data is required');
      });

      await expect(controller.adminLogin(loginDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.adminLogin).not.toHaveBeenCalled();
    });
  });

  describe('adminSignup', () => {
    it('should signup admin successfully with DTOs and mapper', async () => {
      const signupDto: AdminSignupRequestDto = {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Admin User',
      };

      const userEntity = new User();
      userEntity.email = signupDto.email;
      userEntity.password = signupDto.password;
      userEntity.name = signupDto.name;

      authMapper.signupRequestToEntity.mockReturnValue(userEntity);
      authService.adminSignup.mockResolvedValue({
        user: mockAdminUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAdminAuthResponse.mockReturnValue(mockAdminAuthResponse);

      const result = await controller.adminSignup(signupDto);

      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.adminSignup).toHaveBeenCalledWith(userEntity);
      expect(authMapper.userToAdminAuthResponse).toHaveBeenCalledWith(
        mockAdminUser,
        mockTokenPair,
      );
      expect(result).toEqual(mockAdminAuthResponse);
    });

    it('should handle mapper error during admin signup', async () => {
      const signupDto: AdminSignupRequestDto = {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Admin User',
      };

      authMapper.signupRequestToEntity.mockImplementation(() => {
        throw new BadRequestException('Signup data is required');
      });

      await expect(controller.adminSignup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.adminSignup).not.toHaveBeenCalled();
    });
  });

  describe('userLogin', () => {
    it('should login user successfully with DTOs and mapper', async () => {
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
      });
      authMapper.userToUserAuthResponse.mockReturnValue(mockUserAuthResponse);

      const result = await controller.userLogin(loginDto);

      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.userLogin).toHaveBeenCalledWith(credentials);
      expect(authMapper.userToUserAuthResponse).toHaveBeenCalledWith(
        mockRegularUser,
      );
      expect(result).toEqual(mockUserAuthResponse);
    });

    it('should handle mapper error during user login', async () => {
      const loginDto: UserLoginRequestDto = {
        email: 'user@example.com',
        password: 'user123',
      };

      authMapper.loginRequestToCredentials.mockImplementation(() => {
        throw new BadRequestException('Login data is required');
      });

      await expect(controller.userLogin(loginDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.userLogin).not.toHaveBeenCalled();
    });
  });

  describe('userSignup', () => {
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

      const result = await controller.userSignup(signupDto);

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

      await expect(controller.userSignup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.userSignup).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully with DTOs and mapper', async () => {
      const refreshDto: RefreshTokenRequestDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.refreshToken.mockResolvedValue({
        user: mockAdminUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAdminAuthResponse.mockReturnValue(mockAdminAuthResponse);

      const result = await controller.refresh(refreshDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
      expect(authMapper.userToAdminAuthResponse).toHaveBeenCalledWith(
        mockAdminUser,
        mockTokenPair,
      );
      expect(result).toEqual(mockAdminAuthResponse);
    });

    it('should handle service error during token refresh', async () => {
      const refreshDto: RefreshTokenRequestDto = {
        refreshToken: 'invalid-refresh-token',
      };

      authService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
      expect(authMapper.userToAdminAuthResponse).not.toHaveBeenCalled();
    });

    it('should handle mapper error during refresh response', async () => {
      const refreshDto: RefreshTokenRequestDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.refreshToken.mockResolvedValue({
        user: mockAdminUser,
        tokens: mockTokenPair,
      });
      authMapper.userToAdminAuthResponse.mockImplementation(() => {
        throw new BadRequestException('User data is required');
      });

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
      expect(authMapper.userToAdminAuthResponse).toHaveBeenCalledWith(
        mockAdminUser,
        mockTokenPair,
      );
    });
  });
});
