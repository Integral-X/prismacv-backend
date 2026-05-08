import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiUsageFeature } from '@prisma/client';
import { PrismaService } from '@/config/prisma.service';
import { generateUuidv7 } from '@/shared/utils/uuid.util';

@Injectable()
export class AiUsageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async consumeQuota(userId: string, feature: AiUsageFeature): Promise<void> {
    const limit = this.getMonthlyLimit(feature);
    if (limit <= 0) {
      return;
    }

    const { periodStart, periodEnd } = this.getMonthlyPeriod();

    await this.prisma.$transaction(async tx => {
      const existing = await tx.aiUsage.findUnique({
        where: {
          userId_feature_periodStart_periodEnd: {
            userId,
            feature,
            periodStart,
            periodEnd,
          },
        },
      });

      if (existing && existing.callsUsed >= limit) {
        throw new HttpException(
          `Monthly AI quota exceeded for ${feature.toLowerCase()}.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (existing) {
        await tx.aiUsage.update({
          where: { id: existing.id },
          data: { callsUsed: { increment: 1 } },
        });
        return;
      }

      await tx.aiUsage.create({
        data: {
          id: generateUuidv7(),
          userId,
          feature,
          periodStart,
          periodEnd,
          callsUsed: 1,
        },
      });
    });
  }

  async refundQuota(userId: string, feature: AiUsageFeature): Promise<void> {
    const limit = this.getMonthlyLimit(feature);
    if (limit <= 0) {
      return;
    }

    const { periodStart, periodEnd } = this.getMonthlyPeriod();

    await this.prisma.$transaction(async tx => {
      const existing = await tx.aiUsage.findUnique({
        where: {
          userId_feature_periodStart_periodEnd: {
            userId,
            feature,
            periodStart,
            periodEnd,
          },
        },
      });

      if (!existing || existing.callsUsed <= 0) {
        return;
      }

      if (existing.callsUsed === 1) {
        await tx.aiUsage.delete({
          where: { id: existing.id },
        });
        return;
      }

      await tx.aiUsage.update({
        where: { id: existing.id },
        data: { callsUsed: { decrement: 1 } },
      });
    });
  }

  private getMonthlyPeriod(now: Date = new Date()): {
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

  private getMonthlyLimit(feature: AiUsageFeature): number {
    const globalLimit =
      this.configService.get<number>('AI_MONTHLY_CALL_LIMIT', 200) ?? 200;

    const envKeyByFeature: Record<AiUsageFeature, string> = {
      [AiUsageFeature.CV_ANALYZE]: 'AI_MONTHLY_CV_ANALYZE_LIMIT',
      [AiUsageFeature.CV_OPTIMIZE]: 'AI_MONTHLY_CV_OPTIMIZE_LIMIT',
      [AiUsageFeature.GRAMMAR_CHECK]: 'AI_MONTHLY_GRAMMAR_CHECK_LIMIT',
      [AiUsageFeature.ATS_SCORE]: 'AI_MONTHLY_ATS_SCORE_LIMIT',
      [AiUsageFeature.COVER_LETTER_GENERATE]:
        'AI_MONTHLY_COVER_LETTER_GENERATE_LIMIT',
    };

    return (
      this.configService.get<number>(envKeyByFeature[feature], globalLimit) ??
      globalLimit
    );
  }
}
