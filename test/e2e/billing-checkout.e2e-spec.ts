import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { PrismaService } from '@/config/prisma.service';
import { BillingService } from '@/modules/billing/billing.service';
import { UserPlan } from '@prisma/client';

type StripeCheckoutMock = {
  checkout: {
    sessions: {
      create: jest.Mock;
    };
  };
};

describe('Billing checkout (e2e)', () => {
  let app: INestApplication;

  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'billing-e2e@example.com',
    role: 'REGULAR',
    isMasterAdmin: false,
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: 'Billing E2E',
        stripeCustomerId: 'cus_test_existing',
      }),
      update: jest.fn(),
    },
    plan: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'plan-pro',
        code: UserPlan.PRO,
        name: 'Pro',
        isActive: true,
        stripePriceMonthly: 'price_pro_monthly',
        stripePriceYearly: 'price_pro_yearly',
      }),
    },
  };

  const stripeMock: StripeCheckoutMock = {
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        }),
      },
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtUserAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const billingService = moduleFixture.get(BillingService);
    (
      billingService as unknown as {
        stripe: StripeCheckoutMock | null;
      }
    ).stripe = stripeMock;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /billing/checkout-session creates a checkout session with mock Stripe', async () => {
    const response = await request(app.getHttpServer())
      .post('/billing/checkout-session')
      .send({ plan: 'PRO', billingCycle: 'monthly' })
      .expect(201);

    expect(response.body).toEqual({
      sessionId: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        customer: 'cus_test_existing',
        success_url: expect.stringContaining(
          '/settings/billing?checkout=success',
        ),
        cancel_url: expect.stringContaining(
          '/settings/billing?checkout=cancelled',
        ),
      }),
    );
  });
});
