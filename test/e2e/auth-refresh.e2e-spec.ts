import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';
import { PrismaService } from '@/config/prisma.service';

describe('Auth Refresh (e2e)', () => {
  let app: INestApplication;
  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'PLATFORM_ADMIN',
    emailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const mockAuthService = {
      refreshToken: jest.fn((token: string) => {
        if (token === 'valid-refresh-token') {
          return Promise.resolve({
            user: mockAdminUser,
            tokens: {
              accessToken: 'new-access-token',
              refreshToken: 'new-refresh-token',
            },
          });
        }
        throw new UnauthorizedException('invalid token');
      }),
    };

    const mockAuthMapper = {
      userToAdminAuthResponse: jest.fn(
        (
          user: typeof mockAdminUser,
          tokens: { accessToken: string; refreshToken: string },
        ) => ({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'platform_admin',
            emailVerified: user.emailVerified,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      ),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .overrideProvider(AuthMapper)
      .useValue(mockAuthMapper)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/admin/refresh (POST)', () => {
    it('should refresh tokens successfully with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/admin/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.accessToken).toBe('new-access-token');
          expect(res.body.refreshToken).toBe('new-refresh-token');
          expect(res.body.user.email).toBe('admin@example.com');
        });
    });

    it('should return 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/admin/refresh')
        .send({ refreshToken: 'invalidtoken' })
        .expect(401);
    });

    it('should return 400 for missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/admin/refresh')
        .send({})
        .expect(400); // Should now return 400 with our validation fix
    });

    it('should return 401 for expired refresh token', () =>
      request(app.getHttpServer())
        .post('/auth/admin/refresh')
        .send({ refreshToken: 'expired-token' })
        .expect(401));
  });
});
