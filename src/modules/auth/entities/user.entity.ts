import { BaseEntity } from '../../../shared/entities/base.entity';

/**
 * User role enumeration
 */
export enum UserRole {
  REGULAR = 'REGULAR',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

/**
 * User entity representing a user in the system
 * Contains only business properties without validation or API decorators
 */
export class User extends BaseEntity {
  email: string;
  password?: string; // Optional for OAuth users
  name?: string;
  role: UserRole;
  isMasterAdmin: boolean = false;
  refreshToken?: string;
  emailVerified: boolean = false;
  otpCode?: string;
  otpExpiresAt?: Date;
  otpAttempts: number = 0; // Track failed OTP verification attempts
  provider?: string; // OAuth provider (e.g., 'LINKEDIN', 'GOOGLE')
  providerId?: string; // OAuth provider user ID

  constructor() {
    super();
    this.emailVerified = false;
    this.otpAttempts = 0;
  }
}
