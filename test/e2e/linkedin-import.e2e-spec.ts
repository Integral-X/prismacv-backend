import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { INestApplication } from '@nestjs/common';

describe('LinkedIn Import URL Validation (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get an access token
    const adminEmail =
      process.env.MASTER_ADMIN_EMAIL?.trim() ?? 'admin@example.com';
    const adminPassword = process.env.MASTER_ADMIN_PASSWORD ?? 'admin';

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/oauth/linkedin/import (POST)', () => {
    it('should reject invalid LinkedIn domains (CodeQL SSRF prevention)', () => {
      return request(app.getHttpServer())
        .post('/oauth/linkedin/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ handleOrUrl: 'https://malicious-linkedin.com/in/john-doe' })
        .expect(400)
        .expect(res => {
          expect(res.body.message).toBe('Invalid LinkedIn URL');
        });
    });

    it('should accept valid LinkedIn domains but fail on connected account mismatch', () => {
      return request(app.getHttpServer())
        .post('/oauth/linkedin/import')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ handleOrUrl: 'https://www.linkedin.com/in/john-doe' })
        .expect(res => {
          // The admin won't have a linked LinkedIn account, so it will throw a ConflictException
          // "LinkedIn account is not connected", not a 400 Bad Request for URL.
          expect(res.status).not.toBe(400);
          expect(res.status).toBe(409);
        });
    });
  });
});
