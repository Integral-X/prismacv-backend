import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<{ status: 'ok' | 'degraded'; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      this.logger.warn('Database health check failed', error);
      return { status: 'degraded', database: 'disconnected' };
    }
  }

  async getReadiness(): Promise<{
    status: 'ready' | 'not_ready';
    checks: { database: string };
  }> {
    const health = await this.getHealth();
    return {
      status: health.status === 'ok' ? 'ready' : 'not_ready',
      checks: {
        database: health.database,
      },
    };
  }
}
