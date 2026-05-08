import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ensureCorrelationId } from '@/common/http/correlation-id';
import { sanitizeForLogging } from '@/common/logging/log-sanitizer';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const correlationId = ensureCorrelationId(request, response);
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

    // Log error details
    this.logger.error(
      `[${correlationId}] HTTP ${status} Error: ${request.method} ${request.url}`,
      `Error Details: ${JSON.stringify(sanitizeForLogging(exceptionResponse))}`,
      JSON.stringify(sanitizeForLogging(errorResponse)),
    );

    response.status(status).json(errorResponse);
  }
}
