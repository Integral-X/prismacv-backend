import {
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { AuthCredentials } from './entities/auth-credentials.entity';
import { TokenPair } from './entities/token-pair.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger = new Logger(AuthService.name),
  ) {}

  async validateUser(credentials: AuthCredentials): Promise<User | null> {
    const user = await this.usersService.findByEmail(credentials.email);
    if (user && (await bcrypt.compare(credentials.password, user.password))) {
      this.logger.log(
        `User validation successful: email=${user.email}, role=${user.role}, userId=${user.id}`,
      );
      return user;
    }
    this.logger.warn(`User validation failed: email=${credentials.email}`);
    return null;
  }

  async login(
    user: User,
  ): Promise<{ user: User; tokens?: TokenPair | undefined }> {
    // Log authentication attempt with role information
    this.logger.log(
      `User login: email=${user.email}, role=${user.role}, userId=${user.id}`,
    );

    // Generate tokens only for PLATFORM_ADMIN users
    if (user.role === UserRole.PLATFORM_ADMIN) {
      const tokenData = await this.getTokens(user.id, user.email, user.role);
      await this.updateRefreshToken(user.id, tokenData.refreshToken);

      const tokens = new TokenPair();
      tokens.accessToken = tokenData.accessToken;
      tokens.refreshToken = tokenData.refreshToken;

      this.logger.log(
        `JWT tokens generated for PLATFORM_ADMIN: email=${user.email}, userId=${user.id}`,
      );

      return { user, tokens };
    }

    // Regular users don't get tokens
    this.logger.log(
      `Profile returned for REGULAR user: email=${user.email}, userId=${user.id}`,
    );
    return { user, tokens: undefined };
  }

  async signup(
    user: User,
  ): Promise<{ user: User; tokens?: TokenPair | undefined }> {
    try {
      // Hash the password using existing bcrypt patterns (salt rounds 10)
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create user entity with hashed password
      const userToCreate = new User();
      userToCreate.email = user.email;
      userToCreate.password = hashedPassword;
      userToCreate.name = user.name;
      // Set default role to REGULAR for new users
      userToCreate.role = user.role || UserRole.REGULAR;

      // Create the user using entity
      const createdUser = await this.usersService.create(userToCreate);

      this.logger.log(
        `User signup successful: email=${createdUser.email}, role=${createdUser.role}, userId=${createdUser.id}`,
      );

      // Generate tokens only for PLATFORM_ADMIN users
      if (createdUser.role === UserRole.PLATFORM_ADMIN) {
        const tokenData = await this.getTokens(
          createdUser.id,
          createdUser.email,
          createdUser.role,
        );
        await this.updateRefreshToken(createdUser.id, tokenData.refreshToken);

        const tokens = new TokenPair();
        tokens.accessToken = tokenData.accessToken;
        tokens.refreshToken = tokenData.refreshToken;

        this.logger.log(
          `JWT tokens generated for new PLATFORM_ADMIN: email=${createdUser.email}, userId=${createdUser.id}`,
        );

        return { user: createdUser, tokens };
      }

      // Regular users don't get tokens
      this.logger.log(
        `Profile returned for new REGULAR user: email=${createdUser.email}, userId=${createdUser.id}`,
      );
      return { user: createdUser, tokens: undefined };
    } catch (error) {
      // Handle duplicate email errors with appropriate responses
      if (error instanceof ConflictException) {
        this.logger.warn(`Signup attempt with existing email: ${user.email}`);
        throw error;
      }

      this.logger.error('Error during user signup:', error);
      throw error;
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ user: User; tokens?: TokenPair | undefined }> {
    const decoded = await this.decodeRefreshToken(refreshToken);
    const user = await this.usersService.findById(decoded.sub);
    if (!user || !user.refreshToken) {
      this.logger.warn(
        `Token refresh failed: user not found or no refresh token, userId=${decoded.sub}`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      this.logger.warn(
        `Token refresh failed: invalid refresh token, email=${user.email}, userId=${user.id}, role=${user.role}`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Maintain role-based token generation logic
    // Tokens contain role information from getTokens method
    const tokenData = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `Token refreshed successfully: email=${user.email}, userId=${user.id}, role=${user.role}`,
    );

    return { user, tokens };
  }

  async getTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
          role,
        },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: '15m',
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
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async decodeRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      this.logger.warn('Token verification failed: invalid or expired token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
