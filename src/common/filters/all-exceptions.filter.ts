import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { ensureCorrelationId } from '@/common/http/correlation-id';
import { sanitizeForLogging } from '@/common/logging/log-sanitizer';
import { isSentryReady } from '@/config/sentry.config';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private captureWithSentry(
    exception: unknown,
    request: Request,
    correlationId: string,
    statusCode: number,
  ): void {
    if (!isSentryReady()) {
      return;
    }

    const user = (request as Request & { user?: { id?: string } }).user;
    const normalizedException =
      exception instanceof Error
        ? exception
        : new Error(
            typeof exception === 'string' ? exception : 'Unknown error',
          );

    Sentry.withScope(scope => {
      scope.setTag('correlationId', correlationId);
      scope.setTag('httpStatus', String(statusCode));
      scope.setTag('httpMethod', request.method);
      scope.setTag('path', request.url);
      if (user?.id) {
        scope.setUser({ id: user.id });
      }

      scope.setContext(
        'request',
        sanitizeForLogging({
          query: request.query,
          params: request.params,
          headers: {
            'x-correlation-id': correlationId,
            'user-agent': request.get('user-agent'),
          },
        }),
      );

      Sentry.captureException(normalizedException);
    });
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = ensureCorrelationId(request, response);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const error =
        typeof exceptionResponse === 'string'
          ? { message: exceptionResponse }
          : (exceptionResponse as object);

      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...error,
      };

      this.logger.error(
        `[${correlationId}] HTTP ${status} Error: ${request.method} ${request.url}`,
        JSON.stringify(sanitizeForLogging(exceptionResponse)),
      );

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.captureWithSentry(exception, request, correlationId, status);
      }

      response.status(status).json(errorResponse);
      return;
    }

    // Unhandled exceptions — never leak stack traces to clients
    const message =
      exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `[${correlationId}] Unhandled Exception: ${request.method} ${request.url} — ${message}`,
      stack,
    );

    this.captureWithSentry(
      exception,
      request,
      correlationId,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: 'Internal server error',
    });
  }
}
