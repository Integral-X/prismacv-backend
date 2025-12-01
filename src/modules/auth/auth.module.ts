import { Module, Logger } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AuthController } from './auth.controller';
import { OtpController } from './otp.controller';
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
    OtpService,
    LocalStrategy,
    JwtStrategy,
    UsersService,
    PrismaService,
    ConfigService,
    Logger,
    AuthMapper,
  ],
  controllers: [AuthController, OtpController, UserAuthController],
  exports: [AuthService, OtpService],
})
export class AuthModule {}
