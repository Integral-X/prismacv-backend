import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/config/prisma.service';
import { generateUuidv7 } from '@/shared/utils/uuid.util';
import { Plan, UserPlan } from '@prisma/client';
import * as Stripe from 'stripe';
import {
  BillingCycle,
  BillingProfileResponseDto,
  CreateCheckoutSessionRequestDto,
  CheckoutSessionResponseDto,
  PortalSessionResponseDto,
} from './dto/billing.dto';
import { PlanAccessService } from './plan-access.service';
import { MetricsService } from '@/modules/metrics/metrics.service';

type StripeClient = InstanceType<typeof Stripe>;
type StripeEvent = ReturnType<StripeClient['webhooks']['constructEvent']>;
type StripeSubscription = Awaited<
  ReturnType<StripeClient['subscriptions']['retrieve']>
>;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: StripeClient | null;
  private readonly processedWebhookEventIds = new Set<string>();
  private readonly webhookEventCacheLimit: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly planAccessService: PlanAccessService,
    private readonly metricsService: MetricsService,
  ) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY')?.trim();
    this.stripe = apiKey ? new Stripe(apiKey) : null;
    const configuredLimit =
      this.configService.get<number>('BILLING_WEBHOOK_CACHE_LIMIT', 500) ?? 500;
    this.webhookEventCacheLimit = Math.max(100, configuredLimit);
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionRequestDto,
  ): Promise<CheckoutSessionResponseDto> {
    const stripe = this.getStripe();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = await this.prisma.plan.findUnique({
      where: { code: dto.plan },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Selected billing plan is unavailable');
    }

    const priceId = this.resolvePriceId(plan, dto.billingCycle);
    if (!priceId) {
      throw new BadRequestException(
        `Stripe price is not configured for ${dto.plan} (${dto.billingCycle ?? BillingCycle.MONTHLY}).`,
      );
    }

    const customerId = await this.ensureStripeCustomer(userId, {
      email: user.email,
      name: user.name ?? undefined,
      existingCustomerId: user.stripeCustomerId ?? undefined,
    });

    const frontendUrl = this.resolveFrontendUrl();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/settings/billing?checkout=success`,
      cancel_url: `${frontendUrl}/settings/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        userId,
        planCode: dto.plan,
      },
    });

    if (!session.url) {
      throw new ServiceUnavailableException(
        'Stripe checkout session did not return a redirect URL',
      );
    }

    return { sessionId: session.id, url: session.url };
  }

  async createPortalSession(userId: string): Promise<PortalSessionResponseDto> {
    const stripe = this.getStripe();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer is associated with this account yet.',
      );
    }

    const frontendUrl = this.resolveFrontendUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/settings/billing`,
    });

    return { url: session.url };
  }

  async getBillingProfile(userId: string): Promise<BillingProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const aiQuota = await this.getAiQuotaSnapshot(user.id);

    return {
      plan: user.plan,
      stripeCustomerId: user.stripeCustomerId,
      subscription: user.subscription
        ? {
            id: user.subscription.id,
            status: user.subscription.status,
            planCode: user.subscription.plan.code,
            currentPeriodStart: user.subscription.currentPeriodStart
              ? user.subscription.currentPeriodStart.toISOString()
              : null,
            currentPeriodEnd: user.subscription.currentPeriodEnd
              ? user.subscription.currentPeriodEnd.toISOString()
              : null,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          }
        : null,
      aiQuota,
    };
  }

  async processWebhook(rawBody: Buffer, signature?: string): Promise<void> {
    const stripe = this.getStripe();
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'Stripe webhook secret is not configured.',
      );
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    let event: StripeEvent;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }
    const startedAt = Date.now();

    if (this.isProcessedWebhookEvent(event.id)) {
      this.logger.debug(`Ignoring duplicate Stripe event: ${event.id}`);
      this.metricsService.recordStripeEvent({
        eventType: event.type,
        status: 'ignored',
        durationMs: Date.now() - startedAt,
      });
      return;
    }

    try {
      await this.handleStripeEvent(event);
      this.markWebhookEventProcessed(event.id);
      this.metricsService.recordStripeEvent({
        eventType: event.type,
        status: 'success',
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      this.metricsService.recordStripeEvent({
        eventType: event.type,
        status: 'error',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }

  private async handleStripeEvent(event: StripeEvent): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as {
          subscription?: string | { id?: string } | null;
        };
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id;
        if (subscriptionId) {
          const stripe = this.getStripe();
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          await this.syncSubscriptionFromStripe(subscription);
        }
        return;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscription;
        await this.syncSubscriptionFromStripe(subscription);
        return;
      }
      default:
        this.logger.debug(`Ignoring unsupported Stripe event: ${event.type}`);
    }
  }

  private async syncSubscriptionFromStripe(
    subscription: StripeSubscription,
  ): Promise<void> {
    const customerId = this.extractCustomerId(subscription.customer);
    if (!customerId) {
      this.logger.warn(
        `Skipping Stripe subscription ${subscription.id}: missing customer id`,
      );
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (!user) {
      this.logger.warn(
        `Skipping Stripe subscription ${subscription.id}: no user matches customer ${customerId}`,
      );
      return;
    }

    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const mappedPlan = await this.resolvePlanFromPriceId(priceId);
    const plan = mappedPlan ?? (await this.getPlanByCode(UserPlan.PRO));

    if (!plan) {
      throw new ServiceUnavailableException(
        'No billing plan is configured for Stripe subscription synchronization.',
      );
    }

    const userPlan = this.mapStripeStatusToUserPlan(
      subscription.status,
      plan.code,
    );
    const subscriptionRecord = subscription as unknown as Record<
      string,
      unknown
    >;
    const currentPeriodStart = this.toDate(
      this.toUnixSeconds(subscriptionRecord.current_period_start),
    );
    const currentPeriodEnd = this.toDate(
      this.toUnixSeconds(subscriptionRecord.current_period_end),
    );

    await this.prisma.$transaction(async tx => {
      await tx.user.update({
        where: { id: user.id },
        data: { plan: userPlan, stripeCustomerId: customerId },
      });

      await tx.subscription.upsert({
        where: { userId: user.id },
        update: {
          planId: plan.id,
          status: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        create: {
          id: generateUuidv7(),
          userId: user.id,
          planId: plan.id,
          status: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          currentPeriodStart,
          currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
    });

    this.planAccessService.invalidate(user.id);
  }

  private mapStripeStatusToUserPlan(
    status: string,
    activePlan: UserPlan,
  ): UserPlan {
    const activeStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
    return activeStatuses.includes(status) ? activePlan : UserPlan.FREE;
  }

  private async ensureStripeCustomer(
    userId: string,
    input: {
      email: string;
      name?: string;
      existingCustomerId?: string;
    },
  ): Promise<string> {
    if (input.existingCustomerId) {
      return input.existingCustomerId;
    }

    const stripe = this.getStripe();
    const customer = await stripe.customers.create({
      email: input.email,
      name: input.name,
      metadata: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  private resolvePriceId(
    plan: Plan,
    cycle: BillingCycle = BillingCycle.MONTHLY,
  ): string | null {
    return cycle === BillingCycle.YEARLY
      ? plan.stripePriceYearly
      : plan.stripePriceMonthly;
  }

  private async resolvePlanFromPriceId(
    priceId: string | null,
  ): Promise<Plan | null> {
    if (!priceId) return null;
    return this.prisma.plan.findFirst({
      where: {
        OR: [{ stripePriceMonthly: priceId }, { stripePriceYearly: priceId }],
      },
    });
  }

  private async getPlanByCode(code: UserPlan): Promise<Plan | null> {
    return this.prisma.plan.findUnique({ where: { code } });
  }

  private extractCustomerId(
    customer: string | { id?: string } | null,
  ): string | null {
    if (!customer) return null;
    if (typeof customer === 'string') return customer;
    return customer.id ?? null;
  }

  private toDate(unixSeconds?: number | null): Date | null {
    if (!unixSeconds) return null;
    return new Date(unixSeconds * 1000);
  }

  private toUnixSeconds(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private async getAiQuotaSnapshot(userId: string): Promise<{
    used: number;
    limit: number;
    remaining: number;
    periodEnd: string;
  }> {
    const { periodStart, periodEnd } = this.getCurrentMonthlyPeriod();
    const usages = await this.prisma.aiUsage.findMany({
      where: {
        userId,
        periodStart,
        periodEnd,
      },
    });

    const used = usages.reduce((sum, entry) => sum + entry.callsUsed, 0);
    const limit =
      this.configService.get<number>('AI_MONTHLY_CALL_LIMIT', 200) ?? 200;
    const remaining = Math.max(0, limit - used);

    return {
      used,
      limit,
      remaining,
      periodEnd: periodEnd.toISOString(),
    };
  }

  private getCurrentMonthlyPeriod(now: Date = new Date()): {
    periodStart: Date;
    periodEnd: Date;
  } {
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
    );
    return { periodStart, periodEnd };
  }

  private resolveFrontendUrl(): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      this.configService.get<string>('CORS_ORIGIN') ??
      'http://localhost:3001';
    const normalized = frontendUrl.split(',')[0]?.trim();
    return normalized || 'http://localhost:3001';
  }

  private getStripe(): StripeClient {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe is not configured. Set STRIPE_SECRET_KEY first.',
      );
    }
    return this.stripe;
  }

  private isProcessedWebhookEvent(eventId?: string): boolean {
    if (!eventId) {
      return false;
    }
    return this.processedWebhookEventIds.has(eventId);
  }

  private markWebhookEventProcessed(eventId?: string): void {
    if (!eventId) {
      return;
    }

    this.processedWebhookEventIds.add(eventId);
    if (this.processedWebhookEventIds.size <= this.webhookEventCacheLimit) {
      return;
    }

    const oldestKey = this.processedWebhookEventIds.values().next().value;
    if (oldestKey) {
      this.processedWebhookEventIds.delete(oldestKey);
    }
  }
}
