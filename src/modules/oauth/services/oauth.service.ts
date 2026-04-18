import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '@/modules/auth/users.service';
import { AuthService } from '@/modules/auth/auth.service';
import { User, UserRole } from '@/modules/auth/entities/user.entity';
import { TokenPair } from '@/modules/auth/entities/token-pair.entity';
import { OAuthUserData } from '../interfaces/oauth-user.interface';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  async authenticate(
    oauthData: OAuthUserData,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const { profile, accessToken, refreshToken, expiresAt } = oauthData;
    const oauthMetadata = {
      avatarUrl: profile.picture,
      oauthAccessToken: accessToken,
      oauthRefreshToken: refreshToken,
      oauthTokenExpiresAt: expiresAt,
    };

    let user = await this.usersService.findByProvider(
      profile.provider,
      profile.providerId,
    );

    if (!user) {
      const existingUser = await this.usersService.findByEmail(profile.email);

      if (existingUser) {
        if (existingUser.role !== UserRole.REGULAR) {
          throw new UnauthorizedException(
            'OAuth authentication is only available for regular users',
          );
        }

        if (existingUser.provider) {
          throw new ConflictException(
            `An account with this email already exists using ${existingUser.provider} authentication`,
          );
        } else {
          this.logger.log(
            `Linking OAuth account to existing user: email=${profile.email}, provider=${profile.provider}`,
          );
          user = await this.usersService.linkOAuthAccount(
            existingUser.id,
            profile.provider,
            profile.providerId,
            oauthMetadata,
          );
        }
      } else {
        this.logger.log(
          `Creating new OAuth user: email=${profile.email}, provider=${profile.provider}`,
        );
        user = await this.usersService.createOAuthUser(profile);
      }
    }

    if (user.role !== UserRole.REGULAR) {
      throw new UnauthorizedException(
        'OAuth authentication is only available for regular users',
      );
    }

    user = await this.usersService.updateOAuthMetadata(user.id, oauthMetadata);

    const tokenData = await this.authService.getTokens(
      user.id,
      user.email,
      user.role,
      user.isMasterAdmin,
      'user',
    );
    await this.authService.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `OAuth authentication successful: email=${user.email}, userId=${user.id}, provider=${profile.provider}`,
    );

    return { user, tokens };
  }
}
