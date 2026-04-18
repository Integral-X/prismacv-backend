import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAdminStrategy } from '../../../src/modules/auth/strategies/jwt.strategy';
import { UsersService } from '../../../src/modules/auth/users.service';
import { UserRole } from '../../../src/modules/auth/entities/user.entity';
import { mockUser } from '../../helpers/mock-user.helper';

describe('JwtAdminStrategy', () => {
  let strategy: JwtAdminStrategy;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
    } as any;

    const configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          JWT_SECRET: 'test-jwt-secret-key-that-is-at-least-32-chars-long',
          'app.name': 'PrismaCV',
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    strategy = new JwtAdminStrategy(configService, usersService);
  });

  describe('validate', () => {
    it('should return user for valid PLATFORM_ADMIN payload', async () => {
      const adminUser = mockUser({
        id: '1',
        role: UserRole.PLATFORM_ADMIN,
        isMasterAdmin: true,
      });
      usersService.findById.mockResolvedValue(adminUser);

      const result = await strategy.validate({
        sub: '1',
        email: 'admin@example.com',
        role: UserRole.PLATFORM_ADMIN,
      });

      expect(result).toEqual(adminUser);
      expect(usersService.findById).toHaveBeenCalledWith('1');
    });

    it('should throw UnauthorizedException if payload role is not PLATFORM_ADMIN', async () => {
      await expect(
        strategy.validate({
          sub: '1',
          email: 'user@example.com',
          role: UserRole.REGULAR,
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found in DB', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        strategy.validate({
          sub: '1',
          email: 'admin@example.com',
          role: UserRole.PLATFORM_ADMIN,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if DB user role differs from payload', async () => {
      const regularUser = mockUser({
        id: '1',
        role: UserRole.REGULAR,
      });
      usersService.findById.mockResolvedValue(regularUser);

      await expect(
        strategy.validate({
          sub: '1',
          email: 'admin@example.com',
          role: UserRole.PLATFORM_ADMIN,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
