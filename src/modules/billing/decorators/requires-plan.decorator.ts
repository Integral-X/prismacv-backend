import { SetMetadata } from '@nestjs/common';
import { UserPlan } from '@prisma/client';

export interface RequiresPlanOptions {
  plans: UserPlan[];
  feature: string;
  message?: string;
}

export const REQUIRES_PLAN_KEY = 'requires_plan';
export const RequiresPlan = (options: RequiresPlanOptions) =>
  SetMetadata(REQUIRES_PLAN_KEY, options);
