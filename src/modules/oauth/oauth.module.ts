import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './services/oauth.service';
import { LinkedInOAuthProvider } from './services/linkedin-oauth.provider';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { UsersService } from '@/modules/auth/users.service';
import { PrismaService } from '@/config/prisma.service';
import { AuthMapper } from '@/modules/auth/mappers/auth.mapper';
import { JWT_EXPIRATION } from '@/shared/constants/jwt.constants';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: JWT_EXPIRATION.ACCESS_TOKEN },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    LinkedInOAuthProvider,
    LinkedInStrategy,
    UsersService,
    PrismaService,
    AuthMapper,
  ],
  exports: [OAuthService],
})
export class OAuthModule {}
