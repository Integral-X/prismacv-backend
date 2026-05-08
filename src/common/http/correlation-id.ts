import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

type RequestWithCorrelationId = Request & { correlationId?: string };

function normalizeHeaderValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const first = value.find(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0,
    );
    return first?.trim();
  }
  return undefined;
}

export function ensureCorrelationId(
  request: Request,
  response?: Response,
): string {
  const requestWithCorrelation = request as RequestWithCorrelationId;
  const fromRequest = normalizeHeaderValue(
    request.headers[CORRELATION_ID_HEADER],
  );
  const fromResponse = response
    ? normalizeHeaderValue(response.getHeader(CORRELATION_ID_HEADER))
    : undefined;

  const correlationId =
    requestWithCorrelation.correlationId ??
    fromRequest ??
    fromResponse ??
    randomUUID();

  requestWithCorrelation.correlationId = correlationId;
  request.headers[CORRELATION_ID_HEADER] = correlationId;
  response?.setHeader(CORRELATION_ID_HEADER, correlationId);

  return correlationId;
}
