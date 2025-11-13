import { JWT_EXPIRATION } from '@/shared/constants/jwt.constants';
import { APP_CONSTANTS } from '@/shared/constants/app.constants';

export const AppConfig = () => ({
  app: {
    name: process.env.APP_NAME || 'PrismaCV',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT, 10) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    environment: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
    testUrl: process.env.DATABASE_URL_TEST,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || JWT_EXPIRATION.DEFAULT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN ||
      JWT_EXPIRATION.DEFAULT_REFRESH_EXPIRES_IN,
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_SERVICE_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  ocr: {
    serviceUrl: process.env.OCR_SERVICE_URL || 'http://localhost:8001',
    confidenceThreshold:
      parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 0.8,
  },
  storage: {
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT, 10) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucketName: process.env.MINIO_BUCKET_NAME || 'prismacv-storage',
    },
  },
  notifications: {
    fcm: {
      serverKey: process.env.FCM_SERVER_KEY,
      projectId: process.env.FCM_PROJECT_ID,
    },
    email: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  cors: {
    disable: process.env.DISABLE_CORS === 'true',
    origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
  },
  upload: {
    maxFileSize:
      parseInt(process.env.MAX_FILE_SIZE, 10) || APP_CONSTANTS.MAX_FILE_SIZE,
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ],
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  pharmacy: {
    apiUrl: process.env.PHARMACY_API_URL,
    apiKey: process.env.PHARMACY_API_KEY,
  },
  medicineDb: {
    url: process.env.MEDICINE_DB_URL,
    apiKey: process.env.MEDICINE_DB_API_KEY,
  },
  unleash: {
    mock: process.env.UNLEASH_MOCK === 'true',
  },
});
