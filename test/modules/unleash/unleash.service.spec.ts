import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnleashService } from '@/modules/unleash/unleash.service';

type MockLogger = Pick<Logger, 'log' | 'warn' | 'error' | 'debug'>;

describe('UnleashService', () => {
  let configService: { get: jest.Mock };
  let logger: MockLogger;

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    };
    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  });

  it('initializes mock client when unleash.mock is enabled', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'unleash.mock') return true;
      return undefined;
    });

    const service = new UnleashService(
      configService as unknown as ConfigService,
      logger as Logger,
    );

    await service.onModuleInit();

    expect(service.isReady()).toBe(true);
    expect(service.isEnabled('some-feature')).toBe(true);
    expect(service.getAllFeatures().length).toBeGreaterThan(0);

    await service.onModuleDestroy();
  });

  it('maps feature definitions with enabled state', () => {
    const service = new UnleashService(
      configService as unknown as ConfigService,
      logger as Logger,
    );

    const mockUnleashClient = {
      isEnabled: jest.fn((name: string) => name === 'feature.alpha'),
      getFeatureToggleDefinitions: jest.fn(() => [
        { name: 'feature.alpha', description: 'Alpha feature' },
        { name: 'feature.beta', description: 'Beta feature' },
      ]),
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    (
      service as unknown as {
        unleash: typeof mockUnleashClient | null;
      }
    ).unleash = mockUnleashClient;

    const features = service.getAllFeatures({ userId: 'user-1' });

    expect(features).toEqual([
      {
        name: 'feature.alpha',
        enabled: true,
        description: 'Alpha feature',
        type: undefined,
        strategies: undefined,
        variants: undefined,
      },
      {
        name: 'feature.beta',
        enabled: false,
        description: 'Beta feature',
        type: undefined,
        strategies: undefined,
        variants: undefined,
      },
    ]);
  });

  it('refreshes feature cache when refreshCache is available', async () => {
    const service = new UnleashService(
      configService as unknown as ConfigService,
      logger as Logger,
    );

    const refreshCache = jest.fn().mockResolvedValue(undefined);
    const mockUnleashClient = {
      isEnabled: jest.fn().mockReturnValue(false),
      getFeatureToggleDefinitions: jest.fn().mockReturnValue([]),
      refreshCache,
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    (
      service as unknown as {
        unleash: typeof mockUnleashClient | null;
      }
    ).unleash = mockUnleashClient;

    await service.refreshFeatures();

    expect(refreshCache).toHaveBeenCalled();
  });

  it('returns false when isEnabled throws', () => {
    const service = new UnleashService(
      configService as unknown as ConfigService,
      logger as Logger,
    );

    (
      service as unknown as {
        unleash: {
          isEnabled: jest.Mock;
          destroy: jest.Mock;
        };
      }
    ).unleash = {
      isEnabled: jest.fn().mockImplementation(() => {
        throw new Error('boom');
      }),
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    expect(service.isEnabled('feature.broken')).toBe(false);
  });
});
