/**
 * AuthCredentials entity for login operations
 * Contains only email and password properties for authentication
 */
export class AuthCredentials {
  email!: string;
  password!: string;

  constructor() {}
}
