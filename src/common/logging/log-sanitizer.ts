const REDACTED_VALUE = '[Redacted]';

const SENSITIVE_KEY_SEGMENTS = [
  'password',
  'passwd',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apiKey',
  'apikey',
  'accessToken',
  'refreshToken',
  'clientSecret',
  'privateKey',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldRedactKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return SENSITIVE_KEY_SEGMENTS.some(segment =>
    normalized.includes(segment.toLowerCase()),
  );
}

function sanitizeString(input: string): string {
  if (input.length === 0) {
    return input;
  }

  const withoutBearer = input.replace(
    /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    `Bearer ${REDACTED_VALUE}`,
  );

  return withoutBearer.replace(
    /eyJ[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+?\.[A-Za-z0-9_-]+/g,
    REDACTED_VALUE,
  );
}

export function sanitizeForLogging<T>(value: T, depth = 0): T {
  if (depth > 8) {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeString(value) as T;
  }

  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(entry => sanitizeForLogging(entry, depth + 1)) as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      stack: sanitizeString(value.stack ?? ''),
    } as T;
  }

  if (!isRecord(value)) {
    return value;
  }

  const sanitized: Record<PropertyKey, unknown> = {};

  for (const key of Reflect.ownKeys(value)) {
    const entryValue = (value as Record<PropertyKey, unknown>)[key];
    if (typeof key === 'string' && shouldRedactKey(key)) {
      sanitized[key] = REDACTED_VALUE;
      continue;
    }

    sanitized[key] = sanitizeForLogging(entryValue, depth + 1);
  }

  return sanitized as T;
}
