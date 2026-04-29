import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAdminAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('JwtAdminAuthGuard', () => {
  let guard: JwtAdminAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new JwtAdminAuthGuard(reflector);
  });

  describe('canActivate', () => {
    it('should return true for public endpoints', () => {
      const context = createMockExecutionContext();
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should call super.canActivate for protected endpoints', () => {
      const context = createMockExecutionContext();
      reflector.getAllAndOverride.mockReturnValue(false);

      const superCanActivateSpy = jest
        .spyOn(
          Object.getPrototypeOf(JwtAdminAuthGuard.prototype),
          'canActivate',
        )
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);

      superCanActivateSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      const mockUser = { id: '1', email: 'test@example.com' };

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

    it('should throw UnauthorizedException when there is an error', () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, mockUser, null)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when both error and no user', () => {
      const error = new Error('Invalid token');

      expect(() => guard.handleRequest(error, null, null)).toThrow(
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
