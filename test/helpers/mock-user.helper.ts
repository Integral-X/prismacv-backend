import { User, UserRole } from '@/modules/auth/entities/user.entity';

/**
 * Creates a mock User entity with all required properties including touch() method
 * @param overrides - Partial User properties to override defaults
 * @returns Mock User entity
 */
export function mockUser(overrides: Partial<User> = {}): User {
  const user = new User();

  // Set default values
  user.id = overrides.id || '01234567-89ab-cdef-0123-456789abcdef';
  user.email = overrides.email || 'test@example.com';
  user.password = overrides.password || 'hashedPassword123';
  user.name = overrides.name || 'Test User';
  user.role = overrides.role || UserRole.REGULAR;
  user.isMasterAdmin = overrides.isMasterAdmin || false;
  user.refreshToken = overrides.refreshToken || null;
  user.emailVerified = overrides.emailVerified || false;
  user.provider = overrides.provider || null;
  user.providerId = overrides.providerId || null;
  user.createdAt = overrides.createdAt || new Date();
  user.updatedAt = overrides.updatedAt || new Date();

  // Mock the touch method
  user.touch = jest.fn();

  // Apply any additional overrides
  Object.assign(user, overrides);

  return user;
}

/**
 * Creates a mock OTP entity for testing
 */
export function mockOtp(overrides: any = {}) {
  return {
    id: overrides.id || 'otp-123',
    userId: overrides.userId || '01234567-89ab-cdef-0123-456789abcdef',
    purpose: overrides.purpose || 'SIGNUP_EMAIL_VERIFICATION',
    otpHash: overrides.otpHash || 'hashedOtp123',
    attempts: overrides.attempts || 0,
    maxAttempts: overrides.maxAttempts || 3,
    expiresAt: overrides.expiresAt || new Date(Date.now() + 15 * 60 * 1000),
    usedAt: overrides.usedAt || null,
    createdAt: overrides.createdAt || new Date(),
    ...overrides,
  };
}
