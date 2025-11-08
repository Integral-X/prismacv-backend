import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { INestApplication } from '@nestjs/common';

describe('Auth Refresh (e2e)', () => {
  let app: INestApplication;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get a refresh token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({ email: 'admin@example.com', password: 'admin' });

    refreshToken = loginResponse.body.refreshToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh tokens successfully with valid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(typeof res.body.accessToken).toBe('string');
          expect(typeof res.body.refreshToken).toBe('string');
          // New tokens should be valid strings
          expect(res.body.refreshToken.length).toBeGreaterThan(0);
        });
    });

    it('should return 401 for invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalidtoken' })
        .expect(401);
    });

    it('should return 400 for missing refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400); // Should now return 400 with our validation fix
    });

    it('should return 401 for expired refresh token', () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);
    });
  });
});
