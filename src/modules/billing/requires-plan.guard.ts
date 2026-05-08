import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPlan } from '@prisma/client';
import {
  REQUIRES_PLAN_KEY,
  RequiresPlanOptions,
} from './decorators/requires-plan.decorator';
import { PlanAccessService } from './plan-access.service';

@Injectable()
export class RequiresPlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly planAccessService: PlanAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RequiresPlanOptions>(
      REQUIRES_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string } }>();
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const plan = await this.planAccessService.getUserPlan(userId);
    if (this.hasAccess(plan, options.plans)) {
      return true;
    }

    throw new HttpException(
      {
        message:
          options.message ??
          'This feature requires a higher subscription plan.',
        code: 'plan_required',
        feature: options.feature,
        currentPlan: plan,
        requiredPlans: options.plans,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private hasAccess(currentPlan: UserPlan, requiredPlans: UserPlan[]): boolean {
    return requiredPlans.includes(currentPlan);
  }
}
