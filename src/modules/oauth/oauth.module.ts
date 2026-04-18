import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './services/oauth.service';
import { LinkedInOAuthProvider } from './services/linkedin-oauth.provider';
import { LinkedInCvService } from './services/linkedin-cv.service';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { GoogleOAuthProvider } from './services/google-oauth.provider';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuthModule } from '@/modules/auth/auth.module';
import { PrismaService } from '@/config/prisma.service';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';

@Module({
  imports: [PassportModule, AuthModule],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    LinkedInOAuthProvider,
    LinkedInCvService,
    LinkedInStrategy,
    GoogleOAuthProvider,
    GoogleStrategy,
    PrismaService,
    AuthMapper,
  ],
  exports: [OAuthService],
})
export class OAuthModule {}
