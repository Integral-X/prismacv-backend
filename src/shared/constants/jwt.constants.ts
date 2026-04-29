export const JWT_EXPIRATION = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
} as const;

export const JWT_MIN_SECRET_LENGTH = 32;
