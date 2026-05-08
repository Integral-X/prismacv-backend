import { sanitizeForLogging } from '@/common/logging/log-sanitizer';

describe('sanitizeForLogging', () => {
  it('preserves winston symbol keys while redacting sensitive fields', () => {
    const LEVEL = Symbol.for('level');
    const MESSAGE = Symbol.for('message');

    const info: Record<PropertyKey, unknown> = {
      level: 'info',
      message: 'hello',
      accessToken: 'secret-token',
      nested: {
        refreshToken: 'nested-secret',
      },
    };
    Object.defineProperty(info, LEVEL, {
      value: 'info',
      enumerable: false,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(info, MESSAGE, {
      value: '{"message":"hello"}',
      enumerable: false,
      writable: true,
      configurable: true,
    });

    const sanitized = sanitizeForLogging(info);

    expect(sanitized.accessToken).toBe('[Redacted]');
    expect(sanitized.nested).toEqual({ refreshToken: '[Redacted]' });
    expect(sanitized[LEVEL]).toBe('info');
    expect(sanitized[MESSAGE]).toBe('{"message":"hello"}');
  });
});
