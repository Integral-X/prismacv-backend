import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initialize, Unleash } from 'unleash-client';

// Interface for mock Unleash client
interface MockUnleashClient {
  isEnabled: (featureName: string, context?: any) => boolean;
  getVariant?: (featureName: string, context?: any) => any;
  getFeatureToggleDefinition?: (toggleName: string) => any;
  getFeatureToggleDefinitions?: () => any[];
  destroy: () => Promise<void>;
}

// Interface for feature flag information
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  type?: string;
  strategies?: any[];
  variants?: any[];
}

@Injectable()
export class UnleashService implements OnModuleInit, OnModuleDestroy {
  private unleash: Unleash | MockUnleashClient | null = null;
  private hasLoggedInitialFeatures = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger = new Logger(UnleashService.name),
  ) {}

  async onModuleInit() {
    const mockUnleash = this.configService.get<boolean>('unleash.mock');

    this.logger.log(`Unleash initialization - Mock mode: ${mockUnleash}`);
    this.logger.log(`Environment: ${process.env.NODE_ENV}`);
    this.logger.log(`API Token set: ${!!process.env.UNLEASH_API_TOKEN}`);

    if (mockUnleash) {
      this.logger.warn('Using mock Unleash client for development');
      this.unleash = {
        isEnabled: (featureName: string) => {
          this.logger.debug(
            `Mock Unleash: Feature "${featureName}" is enabled.`,
          );
          return true;
        },
        getVariant: () => ({
          name: 'enabled',
          enabled: true,
        }),
        getFeatureToggleDefinitions: () => [
          {
            name: 'mock-feature-1',
            enabled: true,
            description: 'Mock feature for development',
          },
          {
            name: 'mock-feature-2',
            enabled: false,
            description: 'Another mock feature',
          },
        ],
        destroy: () => Promise.resolve(),
      } as MockUnleashClient;

      this.logAvailableFeatures();
    } else {
      await this.initializeUnleashClient();
    }
  }

  async onModuleDestroy() {
    if (this.unleash) {
      await this.unleash.destroy();
      this.logger.log('Unleash client disconnected');
    }
  }

  private async initializeUnleashClient(): Promise<void> {
    try {
      const url = this.configService.get<string>('unleash.url');
      const appName = this.configService.get<string>('unleash.appName');
      const apiToken = this.configService.get<string>('UNLEASH_API_TOKEN'); // Server-side API token

      if (!url || !appName || !apiToken) {
        throw new Error(
          'Missing required Unleash configuration: url, appName, and apiToken are required',
        );
      }

      // Initialize Unleash server client
      this.unleash = initialize({
        url,
        appName,
        customHeaders: {
          Authorization: apiToken,
        },
        refreshInterval: 15000, // 15 seconds
        metricsInterval: 60000, // 1 minute
      });

      // Set up event listeners for monitoring
      this.unleash.on('ready', () => {
        this.logger.log('Unleash client initialized successfully');
      });

      this.unleash.on('error', error => {
        this.logger.error('Unleash client error:', error);
      });

      this.unleash.on('warn', warning => {
        this.logger.warn('Unleash client warning:', warning);
      });

      this.unleash.on('count', (name, enabled) => {
        this.logger.debug(`Feature "${name}" toggled: ${enabled}`);
      });

      this.unleash.on('synchronized', () => {
        this.logger.debug('Feature flags synchronized from server');
        if (!this.hasLoggedInitialFeatures) {
          this.logAvailableFeatures();
          this.hasLoggedInitialFeatures = true;
        }
      });
    } catch (error: unknown) {
      this.logger.error('Failed to initialize Unleash client:');
      this.logger.error('Error type:', typeof error);
      const errObj = error instanceof Error ? error : {};
      this.logger.error(
        'Error message:',
        (errObj as Record<string, unknown>).message ?? 'No message',
      );
      this.logger.error(
        'Error code:',
        (errObj as Record<string, unknown>).code ?? 'No code',
      );
      this.logger.error(
        'Error status:',
        (errObj as Record<string, unknown>).status ?? 'No status',
      );
      this.logger.error('Full error object:', JSON.stringify(error, null, 2));

      // Check configuration values
      const url = this.configService.get<string>('unleash.url');
      const appName = this.configService.get<string>('unleash.appName');
      const apiToken = this.configService.get<string>('UNLEASH_API_TOKEN');

      this.logger.error('Configuration used:');
      this.logger.error(`URL: ${url}`);
      this.logger.error(`App Name: ${appName}`);
      this.logger.error(
        `API Token: ${apiToken ? `${apiToken.substring(0, 10)}...` : 'NOT SET'}`,
      );

      // Fall back to a safe mock implementation
      this.logger.warn('Falling back to mock Unleash client');
      this.unleash = {
        isEnabled: () => false, // Safe default
        getVariant: () => ({ name: 'disabled', enabled: false }),
        destroy: () => Promise.resolve(),
      } as MockUnleashClient;
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureName: string, context?: any): boolean {
    if (!this.unleash) {
      this.logger.warn(
        `Unleash not initialized, returning false for "${featureName}"`,
      );
      return false;
    }

    try {
      return this.unleash.isEnabled(featureName, context);
    } catch (error) {
      this.logger.error(`Error checking feature "${featureName}":`, error);
      return false;
    }
  }

  /**
   * Get feature variant (for A/B testing)
   */
  getVariant(featureName: string, context?: any): any {
    if (!this.unleash) {
      this.logger.warn(
        `Unleash not initialized, returning disabled variant for "${featureName}"`,
      );
      return { name: 'disabled', enabled: false };
    }

    try {
      return (
        this.unleash.getVariant?.(featureName, context) ?? {
          name: 'disabled',
          enabled: false,
        }
      );
    } catch (error) {
      this.logger.error(`Error getting variant for "${featureName}":`, error);
      return { name: 'disabled', enabled: false };
    }
  }

  /**
   * Check if Unleash is ready
   */
  isReady(): boolean {
    return !!this.unleash;
  }

  /**
   * Get all available feature flags with their current status
   */
  getAllFeatures(context?: any): FeatureFlag[] {
    if (!this.unleash) {
      this.logger.warn('Unleash not initialized, returning empty feature list');
      return [];
    }

    try {
      if ('getFeatureToggleDefinitions' in this.unleash) {
        const definitions = this.unleash.getFeatureToggleDefinitions?.() ?? [];
        return definitions.map((def: any) => ({
          name: def.name,
          enabled: this.unleash!.isEnabled(def.name, context),
          description: def.description,
          type: def.type,
          strategies: def.strategies,
          variants: def.variants,
        }));
      }

      // If no access to definitions, return empty array
      return [];
    } catch (error) {
      this.logger.error('Error getting feature definitions:', error);
      return [];
    }
  }

  /**
   * Log all available features to console on startup
   */
  private logAvailableFeatures(): void {
    try {
      const features = this.getAllFeatures();

      if (features.length === 0) {
        this.logger.warn('No feature flags found or unable to retrieve them');
        return;
      }

      this.logger.log(
        `\n=== UNLEASH FEATURE FLAGS (${features.length} total) ===`,
      );

      features.forEach((feature, index) => {
        const status = feature.enabled ? 'ENABLED' : 'DISABLED';
        const statusIcon = feature.enabled ? '✓' : '✗';

        this.logger.log(`${index + 1}. ${feature.name}`);
        this.logger.log(`   Status: ${statusIcon} ${status}`);

        if (feature.description) {
          this.logger.log(`   Description: ${feature.description}`);
        }

        if (feature.type) {
          this.logger.log(`   Type: ${feature.type}`);
        }

        if (feature.strategies && feature.strategies.length > 0) {
          this.logger.log(
            `   Strategies: ${feature.strategies.length} configured`,
          );
        }

        if (feature.variants && feature.variants.length > 0) {
          this.logger.log(`   Variants: ${feature.variants.length} available`);
        }

        this.logger.log(''); // Empty line for readability
      });

      this.logger.log('=== END FEATURE FLAGS ===\n');

      // Summary
      const enabledCount = features.filter(f => f.enabled).length;
      const disabledCount = features.length - enabledCount;
      this.logger.log(
        `Feature Flags Summary: ${enabledCount} enabled, ${disabledCount} disabled`,
      );
    } catch (error) {
      this.logger.error('Error logging available features:', error);
    }
  }

  /**
   * Refresh feature flags from server
   */
  async refreshFeatures(): Promise<void> {
    if (!this.unleash || !('getFeatureToggleDefinitions' in this.unleash)) {
      this.logger.warn(
        'Cannot refresh features: Unleash client not properly initialized',
      );
      return;
    }

    try {
      // Force a refresh by calling the internal refresh method if available
      if (
        'refreshCache' in this.unleash &&
        typeof this.unleash.refreshCache === 'function'
      ) {
        await this.unleash.refreshCache();
        this.logger.log('Feature flags refreshed successfully');
        this.logAvailableFeatures();
      }
    } catch (error) {
      this.logger.error('Error refreshing features:', error);
    }
  }
}
