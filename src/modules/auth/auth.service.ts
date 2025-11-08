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

  /**
   * Admin login - validates credentials and ensures PLATFORM_ADMIN role
   * Returns user and JWT tokens
   */
  async adminLogin(
    credentials: AuthCredentials,
  ): Promise<{ user: User; tokens: TokenPair }> {
    const user = await this.validateUser(credentials);
    if (!user) {
      this.logger.warn(
        `Admin login failed: invalid credentials, email=${credentials.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user has PLATFORM_ADMIN role
    if (user.role !== UserRole.PLATFORM_ADMIN) {
      this.logger.warn(
        `Admin login failed: user is not PLATFORM_ADMIN, email=${user.email}, role=${user.role}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens for admin
    const tokenData = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokenData.refreshToken);

    const tokens = new TokenPair();
    tokens.accessToken = tokenData.accessToken;
    tokens.refreshToken = tokenData.refreshToken;

    this.logger.log(
      `Admin login successful: email=${user.email}, userId=${user.id}`,
    );

    return { user, tokens };
  }

  /**
   * Admin signup - creates user with PLATFORM_ADMIN role
   * Returns user and JWT tokens
   */
  async adminSignup(user: User): Promise<{ user: User; tokens: TokenPair }> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create user entity with PLATFORM_ADMIN role
      const userToCreate = new User();
      userToCreate.email = user.email;
      userToCreate.password = hashedPassword;
      userToCreate.name = user.name;
      userToCreate.role = UserRole.PLATFORM_ADMIN;

      // Create the user
      const createdUser = await this.usersService.create(userToCreate);

      this.logger.log(
        `Admin signup successful: email=${createdUser.email}, userId=${createdUser.id}`,
      );

      // Generate tokens for admin
      const tokenData = await this.getTokens(
        createdUser.id,
        createdUser.email,
        createdUser.role,
      );
      await this.updateRefreshToken(createdUser.id, tokenData.refreshToken);

      const tokens = new TokenPair();
      tokens.accessToken = tokenData.accessToken;
      tokens.refreshToken = tokenData.refreshToken;

      return { user: createdUser, tokens };
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(
          `Admin signup attempt with existing email: ${user.email}`,
        );
        throw error;
      }

      this.logger.error('Error during admin signup:', error);
      throw error;
    }
  }

  /**
   * User login - validates credentials and ensures REGULAR role
   * Returns user profile only (no tokens)
   */
  async userLogin(credentials: AuthCredentials): Promise<{ user: User }> {
    const user = await this.validateUser(credentials);
    if (!user) {
      this.logger.warn(
        `User login failed: invalid credentials, email=${credentials.email}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure user has REGULAR role
    if (user.role !== UserRole.REGULAR) {
      this.logger.warn(
        `User login failed: user is not REGULAR, email=${user.email}, role=${user.role}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(
      `User login successful: email=${user.email}, userId=${user.id}`,
    );

    return { user };
  }

  /**
   * User signup - creates user with REGULAR role
   * Returns user profile only (no tokens)
   */
  async userSignup(user: User): Promise<{ user: User }> {
    try {
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Create user entity with REGULAR role
      const userToCreate = new User();
      userToCreate.email = user.email;
      userToCreate.password = hashedPassword;
      userToCreate.name = user.name;
      userToCreate.role = UserRole.REGULAR;

      // Create the user
      const createdUser = await this.usersService.create(userToCreate);

      this.logger.log(
        `User signup successful: email=${createdUser.email}, userId=${createdUser.id}`,
      );

      return { user: createdUser };
    } catch (error) {
      if (error instanceof ConflictException) {
        this.logger.warn(
          `User signup attempt with existing email: ${user.email}`,
        );
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
