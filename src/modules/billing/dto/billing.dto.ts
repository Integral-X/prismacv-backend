import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserPlan } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export enum CheckoutPlan {
  PRO = 'PRO',
  TEAM = 'TEAM',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreateCheckoutSessionRequestDto {
  @ApiProperty({ enum: CheckoutPlan })
  @IsEnum(CheckoutPlan)
  plan!: CheckoutPlan;

  @ApiPropertyOptional({ enum: BillingCycle, default: BillingCycle.MONTHLY })
  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

export class CheckoutSessionResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  url!: string;
}

export class PortalSessionResponseDto {
  @ApiProperty()
  url!: string;
}

export class BillingProfileResponseDto {
  @ApiProperty({ enum: UserPlan })
  plan!: UserPlan;

  @ApiProperty({ required: false, nullable: true })
  stripeCustomerId!: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Current Stripe-backed subscription details if any',
  })
  subscription!: {
    id: string;
    status: string;
    planCode: UserPlan;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;

  @ApiProperty({
    description: 'Current AI monthly usage quota snapshot',
    type: 'object',
    properties: {
      used: { type: 'number' },
      limit: { type: 'number' },
      remaining: { type: 'number' },
      periodEnd: { type: 'string', format: 'date-time' },
    },
  })
  aiQuota!: {
    used: number;
    limit: number;
    remaining: number;
    periodEnd: string;
  };
}
