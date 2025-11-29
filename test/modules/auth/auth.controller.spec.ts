import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from '../../../src/modules/auth/auth.controller';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { AuthMapper } from '../../../src/modules/auth/mappers/auth.mapper';
import { RefreshTokenRequestDto } from '../../../src/modules/auth/dto/request/refresh-token.request.dto';
import { AdminAuthResponseDto } from '../../../src/modules/auth/dto/response/admin-auth.response.dto';
import { UserProfileResponseDto } from '../../../src/modules/auth/dto/response/user-profile.response.dto';
import { User, UserRole } from '../../../src/modules/auth/entities/user.entity';
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
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const mockAdminProfile: UserProfileResponseDto = {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: UserRole.PLATFORM_ADMIN,
    emailVerified: false,
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
      refreshToken: jest.fn(),
    };

    const mockAuthMapper = {
      userToAdminAuthResponse: jest.fn(),
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
