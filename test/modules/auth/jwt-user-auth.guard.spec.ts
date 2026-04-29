import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtUserAuthGuard } from '../../../src/modules/auth/guards/jwt-user-auth.guard';

describe('JwtUserAuthGuard', () => {
  let guard: JwtUserAuthGuard;

  beforeEach(() => {
    guard = new JwtUserAuthGuard();
  });

  describe('canActivate', () => {
    it('should call super.canActivate (no @Public bypass)', () => {
      const context = createMockExecutionContext();

      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtUserAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);

      superCanActivateSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const mockUser = { id: '1', email: 'user@example.com', role: 'REGULAR' };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user is not provided', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with default message when no info', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        'Authentication required — valid JWT token required',
      );
    });

    it('should throw UnauthorizedException with info message when provided', () => {
      expect(() =>
        guard.handleRequest(null, null, { message: 'jwt expired' }),
      ).toThrow('jwt expired');
    });

    it('should throw UnauthorizedException when there is an error even with valid user', () => {
      const mockUser = { id: '1', email: 'user@example.com' };
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, mockUser, null)).toThrow(
        UnauthorizedException,
      );
    });
  });
});

function createMockExecutionContext(): ExecutionContext {
  return {
    getHandler: jest.fn().mockReturnValue({}),
    getClass: jest.fn().mockReturnValue({}),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({}),
      getResponse: jest.fn().mockReturnValue({}),
    }),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
}
