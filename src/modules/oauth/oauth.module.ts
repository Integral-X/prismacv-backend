import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './services/oauth.service';
import { LinkedInOAuthProvider } from './services/linkedin-oauth.provider';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { GoogleOAuthProvider } from './services/google-oauth.provider';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersService } from '@/modules/auth/users.service';
import { PrismaService } from '@/config/prisma.service';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';

@Module({
  imports: [PassportModule],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    LinkedInOAuthProvider,
    LinkedInStrategy,
    GoogleOAuthProvider,
    GoogleStrategy,
    UsersService,
    PrismaService,
    AuthMapper,
  ],
  exports: [OAuthService],
})
export class OAuthModule {}
