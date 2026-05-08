import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response, raw } from 'express';

@Injectable()
export class StripeWebhookMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    raw({ type: 'application/json' })(req, res, next);
  }
}
