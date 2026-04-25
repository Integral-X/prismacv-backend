import { JWT_EXPIRATION } from '@/shared/constants/jwt.constants';
import { APP_CONSTANTS } from '@/shared/constants/app.constants';

function safeParseInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const AppConfig = () => ({
  app: {
    name: process.env.APP_NAME || 'PrismaCV',
    version: process.env.APP_VERSION || '1.0.0',
    port: safeParseInt(process.env.PORT, 3000),
    apiPrefix: process.env.API_PREFIX || 'api',
    environment: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
    testUrl: process.env.DATABASE_URL_TEST,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || JWT_EXPIRATION.ACCESS_TOKEN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN || JWT_EXPIRATION.REFRESH_TOKEN,
  },
  bcrypt: {
    rounds: safeParseInt(process.env.BCRYPT_ROUNDS, 12),
  },
  notifications: {
    email: {
      host: process.env.SMTP_HOST,
      port: safeParseInt(process.env.SMTP_PORT, 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  cors: {
    disable: process.env.DISABLE_CORS === 'true',
    origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
  },
  upload: {
    maxFileSize: safeParseInt(
      process.env.MAX_FILE_SIZE,
      APP_CONSTANTS.MAX_FILE_SIZE,
    ),
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ],
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  unleash: {
    mock: process.env.UNLEASH_MOCK === 'true',
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
  },
});
