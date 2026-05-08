import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

let sentryInitialized = false;

function parseSampleRate(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

export function initializeSentry(configService: ConfigService): boolean {
  if (sentryInitialized) {
    return true;
  }

  const dsn = configService.get<string>('SENTRY_DSN')?.trim();
  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment:
      configService.get<string>('SENTRY_ENVIRONMENT') ??
      configService.get<string>('NODE_ENV', 'development'),
    release:
      configService.get<string>('SENTRY_RELEASE') ??
      configService.get<string>('APP_VERSION'),
    tracesSampleRate: parseSampleRate(
      configService.get<string>('SENTRY_TRACES_SAMPLE_RATE'),
      0.05,
    ),
    sendDefaultPii: false,
  });

  sentryInitialized = true;
  return true;
}

export function isSentryReady(): boolean {
  return sentryInitialized && Boolean(Sentry.getClient());
}
