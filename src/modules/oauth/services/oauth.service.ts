import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { UsersService } from '@/modules/auth/users.service';
import { User } from '@/modules/auth/entities/user.entity';
import { OAuthUserData } from '../interfaces/oauth-user.interface';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Authenticate or register a user via OAuth
   * Returns user profile only (no JWT tokens)
   * OAuth users are REGULAR users and don't receive JWT tokens
   */
  async authenticate(oauthData: OAuthUserData): Promise<{ user: User }> {
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
        if (existingUser.provider) {
          // User exists with different provider - conflict
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

    this.logger.log(
      `OAuth authentication successful: email=${user.email}, userId=${user.id}, provider=${profile.provider}`,
    );

    return { user };
  }
}
