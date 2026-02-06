import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@/modules/auth/entities/user.entity';

/**
 * Custom decorator to extract the authenticated user from the request
 * This decorator works with JWT authentication and extracts the user
 * that was attached to the request by the JWT strategy
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
