import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new JwtAuthGuard(reflector);
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

      // Mock the parent class canActivate
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
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

      const result = guard.handleRequest(null, mockUser);

      expect(result).toEqual(mockUser);
    });

    it('should throw ForbiddenException when user is not provided', () => {
      expect(() => guard.handleRequest(null, null)).toThrow(ForbiddenException);
      expect(() => guard.handleRequest(null, null)).toThrow(
        'Access denied - valid JWT token required',
      );
    });

    it('should throw ForbiddenException when user is undefined', () => {
      expect(() => guard.handleRequest(null, undefined)).toThrow(
        ForbiddenException,
      );
      expect(() => guard.handleRequest(null, undefined)).toThrow(
        'Access denied - valid JWT token required',
      );
    });

    it('should throw ForbiddenException when there is an error', () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      const error = new Error('Token expired');

      expect(() => guard.handleRequest(error, mockUser)).toThrow(
        ForbiddenException,
      );
      expect(() => guard.handleRequest(error, mockUser)).toThrow(
        'Access denied - valid JWT token required',
      );
    });

    it('should throw ForbiddenException when both error and no user', () => {
      const error = new Error('Invalid token');

      expect(() => guard.handleRequest(error, null)).toThrow(
        ForbiddenException,
      );
      expect(() => guard.handleRequest(error, null)).toThrow(
        'Access denied - valid JWT token required',
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
