import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserPlan } from '@prisma/client';
import { PrismaService } from '@/config/prisma.service';

interface CachedPlan {
  plan: UserPlan;
  expiresAt: number;
}

@Injectable()
export class PlanAccessService {
  private readonly cache = new Map<string, CachedPlan>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getUserPlan(userId: string): Promise<UserPlan> {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.plan;
    }

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

    const subscription = user.subscription;
    const paidStatuses = new Set(['active', 'trialing', 'past_due', 'unpaid']);
    const resolvedPlan =
      subscription && paidStatuses.has(subscription.status)
        ? subscription.plan.code
        : user.plan;

    const ttlSeconds =
      this.configService.get<number>('BILLING_PLAN_CACHE_TTL_SECONDS', 60) ??
      60;
    this.cache.set(userId, {
      plan: resolvedPlan,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return resolvedPlan;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}
