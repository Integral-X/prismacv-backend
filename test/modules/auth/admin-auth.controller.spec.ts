import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminAuthController } from '../../../src/modules/auth/admin-auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { AdminLoginRequestDto } from '../../../src/modules/auth/dto/request/admin-login.request.dto';
import { AdminSignupRequestDto } from '../../../src/modules/auth/dto/request/admin-signup.request.dto';
import { AdminAuthResponseDto } from '../../../src/modules/auth/dto/response/admin-auth.response.dto';
import { UserProfileResponseDto } from '../../../src/modules/auth/dto/response/user-profile.response.dto';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';
import { AuthCredentials } from '../../../src/modules/auth/entities/auth-credentials.entity';
import { TokenPair } from '../../../src/modules/auth/entities/token-pair.entity';

describe('AdminAuthController', () => {
  let controller: AdminAuthController;
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

  const mockAdminProfile: UserProfileResponseDto = {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.PLATFORM_ADMIN,
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

  beforeEach(async () => {
    const mockAuthService = {
      adminLogin: jest.fn(),
      adminSignup: jest.fn(),
    };

    const mockAuthMapper = {
      signupRequestToEntity: jest.fn(),
      loginRequestToCredentials: jest.fn(),
      userToAdminAuthResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAuthController],
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

    controller = module.get<AdminAuthController>(AdminAuthController);
    authService = module.get(AuthService);
    authMapper = module.get(AuthMapper);
  });

  describe('login', () => {
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

      const result = await controller.login(loginDto);

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

      await expect(controller.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.loginRequestToCredentials).toHaveBeenCalledWith(
        loginDto,
      );
      expect(authService.adminLogin).not.toHaveBeenCalled();
    });
  });

  describe('signup', () => {
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

      const result = await controller.signup(signupDto);

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

      await expect(controller.signup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authMapper.signupRequestToEntity).toHaveBeenCalledWith(signupDto);
      expect(authService.adminSignup).not.toHaveBeenCalled();
    });
  });
});
