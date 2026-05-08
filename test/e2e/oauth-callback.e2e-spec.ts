import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { GoogleAuthGuard } from '@/modules/oauth/guards/google-auth.guard';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';
import { PrismaService } from '@/config/prisma.service';

describe('OAuth callback flow (e2e)', () => {
  let app: INestApplication;

  const mockUser = {
    id: 'oauth-user-1',
    email: 'oauth@example.com',
    name: 'OAuth User',
    role: 'REGULAR',
    emailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(GoogleAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            user: mockUser,
            tokens: {
              accessToken: 'oauth-access-token',
              refreshToken: 'oauth-refresh-token',
            },
          };
          return true;
        },
      })
      .overrideProvider(AuthMapper)
      .useValue({
        userToProfileResponse: jest.fn(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'regular',
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
      })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /oauth/google/callback redirects with encoded auth payload', async () => {
    const response = await request(app.getHttpServer())
      .get('/oauth/google/callback')
      .expect(302);

    const location = response.headers.location as string;
    expect(location).toContain('/auth/oauth-callback#token=');

    const encodedToken = location.split('#token=')[1];
    expect(encodedToken).toBeTruthy();

    const payload = JSON.parse(
      Buffer.from(encodedToken, 'base64url').toString('utf8'),
    ) as {
      accessToken: string;
      refreshToken: string;
      user: { email: string };
    };

    expect(payload.accessToken).toBe('oauth-access-token');
    expect(payload.refreshToken).toBe('oauth-refresh-token');
    expect(payload.user.email).toBe('oauth@example.com');
  });
});
