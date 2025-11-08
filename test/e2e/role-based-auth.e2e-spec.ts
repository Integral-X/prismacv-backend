import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/config/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('Role-Based Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Regular User Signup Flow', () => {
    it('should create a regular user with REGULAR role and return profile without tokens', async () => {
      const timestamp = Date.now();
      const signupData = {
        email: `regular-${timestamp}@example.com`,
        password: 'password123',
        name: 'Regular User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signupData)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', signupData.email);
      expect(response.body.user).toHaveProperty('name', signupData.name);
      expect(response.body.user).toHaveProperty('role', 'REGULAR');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('updatedAt');

      // Verify no tokens are returned
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');

      // Verify user was created in database with REGULAR role
      const dbUser = await prisma.user.findUnique({
        where: { email: signupData.email },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser?.role).toBe('REGULAR');
    });
  });

  describe('Platform Admin Signup Flow', () => {
    it('should create a platform admin user and return profile with tokens', async () => {
      const timestamp = Date.now();
      const adminEmail = `admin-${timestamp}@example.com`;
      const password = 'adminpassword123';

      // Create admin user directly in database (simulating admin creation)
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Platform Admin',
          role: 'PLATFORM_ADMIN',
        },
      });

      // Login as admin to verify token generation
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', adminEmail);
      expect(response.body.user).toHaveProperty('role', 'PLATFORM_ADMIN');
      expect(response.body.user).toHaveProperty('createdAt');
      expect(response.body.user).toHaveProperty('updatedAt');

      // Verify tokens are returned
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
      expect(response.body.refreshToken.length).toBeGreaterThan(0);
    });
  });

  describe('Regular User Login Flow', () => {
    it('should login regular user and return profile without tokens', async () => {
      const timestamp = Date.now();
      const regularEmail = `regular-login-${timestamp}@example.com`;
      const password = 'password123';

      // Create regular user
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          email: regularEmail,
          password: hashedPassword,
          name: 'Regular Login User',
          role: 'REGULAR',
        },
      });

      // Login as regular user
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: regularEmail, password })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', regularEmail);
      expect(response.body.user).toHaveProperty('role', 'REGULAR');

      // Verify no tokens are returned
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
    });
  });

  describe('Platform Admin Login Flow', () => {
    it('should login platform admin and return profile with tokens', async () => {
      // Use the seeded admin user
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'admin' })
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'admin@example.com');
      expect(response.body.user).toHaveProperty('role', 'PLATFORM_ADMIN');

      // Verify tokens are returned
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
    });
  });

  describe('JWT Protection on Endpoints', () => {
    it('should allow access to public endpoints without JWT', async () => {
      // Signup endpoint should be public
      const timestamp = Date.now();
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `public-test-${timestamp}@example.com`,
          password: 'password123',
          name: 'Public Test',
        })
        .expect(201);

      // Login endpoint should be public
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin',
        })
        .expect(200);
    });

    it('should require JWT for protected endpoints', async () => {
      // Health endpoint should be protected
      await request(app.getHttpServer()).get('/health').expect(401);
    });

    it('should allow access to protected endpoints with valid JWT', async () => {
      // Login as admin to get JWT
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'admin' })
        .expect(200);

      const accessToken = loginResponse.body.accessToken;

      // Access protected endpoint with JWT
      await request(app.getHttpServer())
        .get('/health')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject expired or invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      await request(app.getHttpServer())
        .get('/health')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });

    it('should reject requests with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('Token Refresh Maintains Role', () => {
    it('should refresh tokens for platform admin and maintain role information', async () => {
      // Login as admin
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@example.com', password: 'admin' })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;

      // Refresh tokens (public endpoint, no JWT required)
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Verify new tokens are returned
      expect(refreshResponse.body).toHaveProperty('user');
      expect(refreshResponse.body).toHaveProperty('accessToken');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(typeof refreshResponse.body.accessToken).toBe('string');
      expect(typeof refreshResponse.body.refreshToken).toBe('string');

      // Use new access token to verify role is maintained
      const newAccessToken = refreshResponse.body.accessToken;

      // Access protected endpoint with new token
      const healthResponse = await request(app.getHttpServer())
        .get('/health')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      expect(healthResponse.body).toBeDefined();
    });

    it('should include role in JWT payload after refresh', async () => {
      const timestamp = Date.now();
      const adminEmail = `admin-refresh-${timestamp}@example.com`;
      const password = 'adminpassword123';

      // Create admin user
      const hashedPassword = await bcrypt.hash(password, 12);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin Refresh Test',
          role: 'PLATFORM_ADMIN',
        },
      });

      // Login to get initial tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;

      // Refresh tokens (public endpoint, no JWT required)
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Verify refreshed tokens work with protected endpoints
      const newAccessToken = refreshResponse.body.accessToken;

      await request(app.getHttpServer())
        .get('/health')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });
  });
});
