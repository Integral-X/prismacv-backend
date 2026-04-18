import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users.service';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class JwtUserStrategy extends PassportStrategy(Strategy, 'jwt-user') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      audience: 'user',
      issuer: configService.get<string>('app.name', 'PrismaCV'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: any): Promise<User> {
    if (payload.role !== UserRole.REGULAR) {
      throw new UnauthorizedException('Insufficient permissions');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.role !== UserRole.REGULAR) {
      throw new UnauthorizedException('Insufficient permissions');
    }

    return user;
  }
}
