import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { AuthService } from '@/modules/auth/auth.service';
import { PrismaService } from '@/config/prisma.service';

describe('Password reset flows (e2e)', () => {
  let app: INestApplication;
  let authService: {
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeAll(async () => {
    authService = {
      forgotPassword: jest.fn().mockResolvedValue({
        message:
          'If an account with that email exists, a password reset OTP has been sent.',
      }),
      resetPassword: jest.fn().mockResolvedValue({
        message: 'Password reset successfully.',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue(authService)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/user/forgot-password initiates reset flow', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/user/forgot-password')
      .send({ email: 'person@example.com' })
      .expect(200);

    expect(authService.forgotPassword).toHaveBeenCalledWith(
      'person@example.com',
    );
    expect(response.body.message).toContain('password reset OTP');
  });

  it('POST /auth/user/reset-password resets password with token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/user/reset-password')
      .send({
        resetToken: 'reset-token-123',
        newPassword: 'newStrongPassword123',
        confirmPassword: 'newStrongPassword123',
      })
      .expect(200);

    expect(authService.resetPassword).toHaveBeenCalledWith(
      'reset-token-123',
      'newStrongPassword123',
      'newStrongPassword123',
    );
    expect(response.body.message).toContain('Password reset successfully');
  });
});
