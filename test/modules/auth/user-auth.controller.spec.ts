import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserAuthController } from '../../../src/modules/auth/user-auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { UserLoginRequestDto } from '../../../src/modules/auth/dto/request/user-login.request.dto';
import { UserSignupRequestDto } from '../../../src/modules/auth/dto/request/user-signup.request.dto';
import { UserAuthResponseDto } from '../../../src/modules/auth/dto/response/user-auth.response.dto';
import { UserProfileResponseDto } from '../../../src/modules/auth/dto/response/user-profile.response.dto';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';
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
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockUserProfile: UserProfileResponseDto = {
    id: '2',
    email: 'user@example.com',
    name: 'Regular User',
    role: UserRole.REGULAR,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserAuthResponse: UserAuthResponseDto = {
    user: mockUserProfile,
  };

  beforeEach(async () => {
    const mockAuthService = {
      userLogin: jest.fn(),
      userSignup: jest.fn(),
    };

    const mockAuthMapper = {
      signupRequestToEntity: jest.fn(),
      loginRequestToCredentials: jest.fn(),
      userToUserAuthResponse: jest.fn(),
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

      const result = await controller.login(loginDto);

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
});
