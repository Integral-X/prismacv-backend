import { Module, Logger } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminAuthController } from './admin-auth.controller';
import { UserAuthController } from './user-auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersService } from './users.service';
import { PrismaService } from '@/config/prisma.service';
import { AuthMapper } from './mappers/auth.mapper';
import { JWT_EXPIRATION } from '@/shared/constants/jwt.constants';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => {
        const expiresIn =
          configService.get<string>('JWT_EXPIRES_IN') ||
          JWT_EXPIRATION.ACCESS_TOKEN;
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: { expiresIn: expiresIn as any },
        };
      },
      inject: [ConfigService],
    }),
    WinstonModule,
  ],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    UsersService,
    PrismaService,
    ConfigService,
    Logger,
    AuthMapper,
  ],
  controllers: [AuthController, AdminAuthController, UserAuthController],
  exports: [AuthService],
})
export class AuthModule {}
