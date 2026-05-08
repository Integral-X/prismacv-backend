import {
  Controller,
  Get,
  HttpStatus,
  Res,
  Version,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    return this.healthService.getHealth();
  }

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('ready')
  @ApiOperation({ summary: 'Readiness endpoint for probes' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async readiness(@Res() response: Response): Promise<void> {
    const readiness = await this.healthService.getReadiness();
    const statusCode =
      readiness.status === 'ready'
        ? HttpStatus.OK
        : HttpStatus.SERVICE_UNAVAILABLE;
    response.status(statusCode).json(readiness);
  }
}
