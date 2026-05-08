import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/config/prisma.service';
import { BillingService } from '@/modules/billing/billing.service';
import { PlanAccessService } from '@/modules/billing/plan-access.service';
import { MetricsService } from '@/modules/metrics/metrics.service';

type StripeWebhookClientMock = {
  webhooks: {
    constructEvent: jest.Mock;
  };
};

describe('BillingService webhooks', () => {
  let service: BillingService;
  let configService: { get: jest.Mock };
  let stripeMock: StripeWebhookClientMock;
  let metricsService: { recordStripeEvent: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'STRIPE_SECRET_KEY') return undefined;
        if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test_secret';
        if (key === 'BILLING_WEBHOOK_CACHE_LIMIT') return 500;
        return fallback;
      }),
    };
    metricsService = {
      recordStripeEvent: jest.fn(),
    };

    service = new BillingService(
      {} as PrismaService,
      configService as unknown as ConfigService,
      { invalidate: jest.fn() } as unknown as PlanAccessService,
      metricsService as unknown as MetricsService,
    );

    stripeMock = {
      webhooks: {
        constructEvent: jest.fn(),
      },
    };

    (
      service as unknown as {
        stripe: StripeWebhookClientMock | null;
      }
    ).stripe = stripeMock;
  });

  it('rejects webhook requests that do not include a Stripe signature', async () => {
    await expect(service.processWebhook(Buffer.from('{}'))).rejects.toThrow(
      BadRequestException,
    );
    expect(stripeMock.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it('rejects webhook requests with invalid signatures', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('signature mismatch');
    });

    await expect(
      service.processWebhook(Buffer.from('{}'), 'invalid-signature'),
    ).rejects.toThrow('Invalid Stripe signature');
  });

  it('processes each Stripe event id only once', async () => {
    const event = {
      id: 'evt_duplicate',
      type: 'customer.subscription.updated',
      data: { object: {} },
    };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);

    const internalService = service as unknown as {
      handleStripeEvent: (input: unknown) => Promise<void>;
    };
    const handleStripeEventSpy = jest
      .spyOn(internalService, 'handleStripeEvent')
      .mockResolvedValue(undefined);

    await service.processWebhook(Buffer.from('{}'), 'sig_one');
    await service.processWebhook(Buffer.from('{}'), 'sig_two');

    expect(handleStripeEventSpy).toHaveBeenCalledTimes(1);
  });
});
