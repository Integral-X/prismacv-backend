import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeWebhookMiddleware } from './stripe-webhook.middleware';
import { PlanAccessService } from './plan-access.service';
import { RequiresPlanGuard } from './requires-plan.guard';

@Global()
@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    StripeWebhookMiddleware,
    PlanAccessService,
    RequiresPlanGuard,
  ],
  exports: [BillingService, PlanAccessService, RequiresPlanGuard],
})
export class BillingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(StripeWebhookMiddleware).forRoutes({
      path: 'billing/webhook',
      method: RequestMethod.POST,
    });
  }
}
