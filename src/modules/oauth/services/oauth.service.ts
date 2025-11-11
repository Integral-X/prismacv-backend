import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/modules/auth/users.service';
import { User } from '@/modules/auth/entities/user.entity';
import { TokenPair } from '@/modules/auth/entities/token-pair.entity';
import { OAuthUserData } from '../interfaces/oauth-user.interface';
import { JWT_EXPIRATION } from '@/shared/constants/jwt.constants';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Authenticate or register a user via OAuth
   * Returns user and JWT tokens
   */
  async authenticate(
    oauthData: OAuthUserData,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const { profile } = oauthData;

    // Try to find existing user by provider + providerId
    let user = await this.usersService.findByProvider(
      profile.provider,
      profile.providerId,
    );

    if (!user) {
      // Try to find by email (account linking scenario)
      const existingUser = await this.usersService.findByEmail(profile.email);

      if (existingUser) {
        // If user exists but doesn't have OAuth, link the account
        if (!existingUser.provider) {
          this.logger.log(
            `Linking OAuth account to existing user: email=${profile.email}, provider=${profile.provider}`,
          );
          user = await this.usersService.linkOAuthAccount(
            existingUser.id,
            profile.provider,
            profile.providerId,
          );
        } else {
          // User exists with different provider - conflict
          throw new ConflictException(
            `An account with this email already exists using ${existingUser.provider} authentication`,
          );
        }
      } else {
        // Create new OAuth user
        this.logger.log(
          `Creating new OAuth user: email=${profile.email}, provider=${profile.provider}`,
        );
        user = await this.usersService.createOAuthUser(profile);
      }
    }

    // Generate JWT tokens
    const tokenData = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `OAuth authentication successful: email=${user.email}, userId=${user.id}, provider=${profile.provider}`,
    );

    return { user, tokens };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async getTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: JWT_EXPIRATION.ACCESS_TOKEN,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: JWT_EXPIRATION.REFRESH_TOKEN,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Update user's refresh token
   */
  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const bcrypt = await import('bcryptjs');
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
}
