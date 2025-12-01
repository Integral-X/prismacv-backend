import { Controller, Get, Query } from '@nestjs/common';
import { UnleashService, FeatureFlag } from './unleash.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Feature Flags')
@ApiBearerAuth('JWT-auth')
@Controller('features')
export class UnleashController {
  constructor(private readonly unleashService: UnleashService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags with their current status' })
  @ApiResponse({
    status: 200,
    description: 'List of all feature flags',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              enabled: { type: 'boolean' },
              description: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'User ID for context',
  })
  @ApiQuery({
    name: 'environment',
    required: false,
    description: 'Environment context',
  })
  getAllFeatures(
    @Query('userId') userId?: string,
    @Query('environment') environment?: string,
  ): {
    success: boolean;
    data: FeatureFlag[];
    total: number;
    context?: any;
  } {
    const context: any = {};

    if (userId) context.userId = userId;
    if (environment) context.environment = environment;

    const features = this.unleashService.getAllFeatures(context);

    return {
      success: true,
      data: features,
      total: features.length,
      context: Object.keys(context).length > 0 ? context : undefined,
    };
  }

  @Get('check/:featureName')
  @ApiOperation({ summary: 'Check if a specific feature flag is enabled' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag status',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        feature: { type: 'string' },
        enabled: { type: 'boolean' },
        context: { type: 'object' },
      },
    },
  })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'environment', required: false })
  checkFeature(
    @Query('featureName') featureName: string,
    @Query('userId') userId?: string,
    @Query('environment') environment?: string,
  ) {
    const context: any = {};

    if (userId) context.userId = userId;
    if (environment) context.environment = environment;

    const enabled = this.unleashService.isEnabled(featureName, context);

    return {
      success: true,
      feature: featureName,
      enabled,
      context: Object.keys(context).length > 0 ? context : undefined,
    };
  }

  @Get('refresh')
  @ApiOperation({ summary: 'Refresh feature flags from Unleash server' })
  @ApiResponse({
    status: 200,
    description: 'Feature flags refreshed successfully',
  })
  async refreshFeatures() {
    await this.unleashService.refreshFeatures();

    return {
      success: true,
      message: 'Feature flags refresh initiated',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Unleash service status' })
  @ApiResponse({ status: 200, description: 'Service status information' })
  getStatus() {
    const isReady = this.unleashService.isReady();
    const features = this.unleashService.getAllFeatures();

    return {
      success: true,
      unleash: {
        connected: isReady,
        totalFeatures: features.length,
        enabledFeatures: features.filter(f => f.enabled).length,
        disabledFeatures: features.filter(f => !f.enabled).length,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
