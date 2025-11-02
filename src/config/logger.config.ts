import * as winston from 'winston';
import { WinstonModuleOptions } from 'nest-winston';

export const LoggerConfig = (): WinstonModuleOptions => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const isDevelopment = process.env.NODE_ENV === 'development';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, context, ms }) => {
          return `${timestamp} [${context}] ${level}: ${message} ${ms}`;
        }),
      ),
    }),
  ];

  // Add file transport in production
  if (!isDevelopment) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  }

  return {
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: {
      service:
        process.env.APP_NAME?.toLowerCase().replace(/\s+/g, '-') ||
        'prismacv-backend',
    },
    transports,
  };
};
