import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD } from '@nestjs/core';

// Configuration
import { DatabaseModule } from './config/database.module';
import { AppConfig } from './config/app.config';
import { LoggerConfig } from './config/logger.config';
import unleashConfig from './modules/unleash/unleash.config';

// Core modules
import { AuthModule } from './modules/auth/auth.module';
import { OAuthModule } from './modules/oauth/oauth.module';
import { UnleashModule } from './modules/unleash/unleash.module';
import { HealthModule } from './modules/health/health.module';
import { EmailModule } from './modules/email/email.module';

// Guards
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [AppConfig, unleashConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Logging
    WinstonModule.forRoot(LoggerConfig()),

    // Rate limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(process.env.THROTTLE_TTL || '60'),
          limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
        },
      ],
    }),

    // Database
    DatabaseModule,

    // Email
    EmailModule,

    // Core modules
    AuthModule,
    OAuthModule,
    UnleashModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
