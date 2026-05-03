import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from './../../src/config/prisma.service';

describe('LinkedIn Import URL Validation (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  const testUserEmail = 'e2e-linkedin-import@prismacv.test';
  const testUserPassword = 'Test1234!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create & verify a regular user so we can obtain a user-audience JWT
    const prisma = app.get(PrismaService);
    const bcrypt = await import('bcryptjs');
    const { uuidv7 } = await import('uuidv7');

    await prisma.user.upsert({
      where: { email: testUserEmail },
      update: { emailVerified: true },
      create: {
        id: uuidv7(),
        email: testUserEmail,
        password: await bcrypt.hash(testUserPassword, 10),
        name: 'E2E LinkedIn Test User',
        role: 'REGULAR',
        isMasterAdmin: false,
        emailVerified: true,
        provider: null,
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/user/login')
      .send({ email: testUserEmail, password: testUserPassword })
      .expect(200);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { email: testUserEmail } });
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
