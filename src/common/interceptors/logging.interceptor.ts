import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const correlationId =
      (request.headers['x-correlation-id'] as string) || randomUUID();
    const startTime = Date.now();

    response.setHeader('x-correlation-id', correlationId);

    this.logger.log(
      `[${correlationId}] Incoming Request: ${method} ${url} - ${ip} ${userAgent}`,
    );

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `[${correlationId}] Request Completed: ${method} ${url} - ${duration}ms`,
        );
      }),
    );
  }
}
