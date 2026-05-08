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
import { ensureCorrelationId } from '@/common/http/correlation-id';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const correlationId = ensureCorrelationId(request, response);
    const startTime = Date.now();

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
