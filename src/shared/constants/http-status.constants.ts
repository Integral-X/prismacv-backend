/**
 * HTTP Status Code Constants
 * Centralized constants for HTTP status codes used in API responses
 */
export const HTTP_STATUS = {
  /**
   * OK - Request succeeded
   */
  OK: 200,

  /**
   * Created - Resource created successfully
   */
  CREATED: 201,

  /**
   * Found - Temporary redirect (commonly used for OAuth redirects)
   */
  FOUND: 302,

  /**
   * Bad Request - Invalid request parameters or validation errors
   */
  BAD_REQUEST: 400,

  /**
   * Unauthorized - Authentication required or failed
   */
  UNAUTHORIZED: 401,

  /**
   * Conflict - Resource conflict (e.g., duplicate email)
   */
  CONFLICT: 409,
} as const;
