import { Injectable, BadRequestException } from '@nestjs/common';
import { SignupRequestDto } from '../dto/request/signup.request.dto';
import { LoginRequestDto } from '../dto/request/login.request.dto';
import { AuthResponseDto } from '../dto/response/auth.response.dto';
import { UserProfileResponseDto } from '../dto/response/user-profile.response.dto';
import { User } from '../entities/user.entity';
import { AuthCredentials } from '../entities/auth-credentials.entity';
import { TokenPair } from '../entities/token-pair.entity';

/**
 * AuthMapper service class for converting between DTOs and entities
 * Handles all transformations between API layer (DTOs) and business layer (entities)
 */
@Injectable()
export class AuthMapper {
  /**
   * Converts SignupRequestDto to User entity
   * @param dto - The signup request DTO from the client
   * @returns User entity for business logic processing
   * @throws BadRequestException if dto is null/undefined
   */
  signupRequestToEntity(dto: SignupRequestDto): User {
    if (!dto) {
      throw new BadRequestException('Signup data is required');
    }

    // Additional validation to ensure required fields are present
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = new User();
    user.email = dto.email?.toLowerCase().trim();
    user.password = dto.password;
    user.name = dto.name?.trim();

    return user;
  }

  /**
   * Converts LoginRequestDto to AuthCredentials entity
   * @param dto - The login request DTO from the client
   * @returns AuthCredentials entity for authentication processing
   * @throws BadRequestException if dto is null/undefined
   */
  loginRequestToCredentials(dto: LoginRequestDto): AuthCredentials {
    if (!dto) {
      throw new BadRequestException('Login data is required');
    }

    // Additional validation to ensure required fields are present
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const credentials = new AuthCredentials();
    credentials.email = dto.email?.toLowerCase().trim();
    credentials.password = dto.password;

    return credentials;
  }

  /**
   * Converts User entity to UserProfileResponseDto
   * @param user - The user entity from business logic
   * @returns UserProfileResponseDto for client response
   * @throws BadRequestException if user is null/undefined
   */
  userToProfileResponse(user: User): UserProfileResponseDto {
    if (!user) {
      throw new BadRequestException('User data is required');
    }

    const profile = new UserProfileResponseDto();
    profile.id = user.id;
    profile.email = user.email;
    profile.name = user.name;
    profile.role = user.role;
    profile.createdAt = user.createdAt;
    profile.updatedAt = user.updatedAt;

    return profile;
  }

  /**
   * Converts User entity and optional tokens to AuthResponseDto
   * @param user - The user entity from business logic
   * @param tokens - Optional token pair containing access and refresh tokens (only for PLATFORM_ADMIN users)
   * @returns AuthResponseDto for client response
   * @throws BadRequestException if user is null/undefined
   */
  userToAuthResponse(user: User, tokens?: TokenPair): AuthResponseDto {
    if (!user) {
      throw new BadRequestException('User data is required');
    }

    const response = new AuthResponseDto();
    response.user = this.userToProfileResponse(user);

    // Conditionally include tokens based on whether they are provided
    if (tokens) {
      response.accessToken = tokens.accessToken;
      response.refreshToken = tokens.refreshToken;
    }

    return response;
  }
}
