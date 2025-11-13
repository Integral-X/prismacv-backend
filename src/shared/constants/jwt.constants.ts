/**
 * JWT Token Expiration Constants
 * Centralized constants for JWT token expiration times
 */
export const JWT_EXPIRATION = {
  /**
   * Access token expiration time
   * Default: 15 minutes
   */
  ACCESS_TOKEN: '15m',

  /**
   * Refresh token expiration time
   * Default: 7 days
   */
  REFRESH_TOKEN: '7d',

  /**
   * Default JWT expiration time (used in config)
   * Default: 7 days
   */
  DEFAULT_EXPIRES_IN: '7d',

  /**
   * Default JWT refresh expiration time (used in config)
   * Default: 30 days
   */
  DEFAULT_REFRESH_EXPIRES_IN: '30d',
} as const;
