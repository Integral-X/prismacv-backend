import {
  ExecutionContext,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPlan } from '@prisma/client';
import { RequiresPlanGuard } from '@/modules/billing/requires-plan.guard';
import { PlanAccessService } from '@/modules/billing/plan-access.service';
import { REQUIRES_PLAN_KEY } from '@/modules/billing/decorators/requires-plan.decorator';

function createHttpContext(userId?: string): ExecutionContext {
  return {
    getClass: jest.fn().mockReturnValue(class TestController {}),
    getHandler: jest.fn().mockReturnValue(() => undefined),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest
        .fn()
        .mockReturnValue(userId ? { user: { id: userId } } : {}),
      getResponse: jest.fn(),
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RequiresPlanGuard', () => {
  let guard: RequiresPlanGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let planAccessService: { getUserPlan: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    planAccessService = {
      getUserPlan: jest.fn(),
    };

    guard = new RequiresPlanGuard(
      reflector as unknown as Reflector,
      planAccessService as unknown as PlanAccessService,
    );
  });

  it('allows requests when no plan metadata is set', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(createHttpContext('user-1'))).resolves.toBe(
      true,
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      REQUIRES_PLAN_KEY,
      [expect.any(Function), expect.any(Function)],
    );
    expect(planAccessService.getUserPlan).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests when plan metadata is present', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      plans: [UserPlan.PRO],
      feature: 'ai_cv_analysis',
    });

    await expect(guard.canActivate(createHttpContext())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(planAccessService.getUserPlan).not.toHaveBeenCalled();
  });

  it('allows users who have one of the required plans', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      plans: [UserPlan.PRO, UserPlan.TEAM],
      feature: 'cv_share',
    });
    planAccessService.getUserPlan.mockResolvedValue(UserPlan.TEAM);

    await expect(guard.canActivate(createHttpContext('user-2'))).resolves.toBe(
      true,
    );
    expect(planAccessService.getUserPlan).toHaveBeenCalledWith('user-2');
  });

  it('throws a 402 envelope when user plan does not satisfy requirements', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      plans: [UserPlan.PRO],
      feature: 'cv_pdf_export',
    });
    planAccessService.getUserPlan.mockResolvedValue(UserPlan.FREE);

    try {
      await guard.canActivate(createHttpContext('user-3'));
      fail('Expected canActivate to throw');
    } catch (error) {
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(402);
      expect(exception.getResponse()).toEqual({
        message: 'This feature requires a higher subscription plan.',
        code: 'plan_required',
        feature: 'cv_pdf_export',
        currentPlan: UserPlan.FREE,
        requiredPlans: [UserPlan.PRO],
      });
    }
  });
});
