import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '@/modules/health/health.controller';
import { HealthService } from '@/modules/health/health.service';
import { PrismaService } from '@/config/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return ok status when database is connected', async () => {
      prismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.check();
      expect(result).toEqual({ status: 'ok', database: 'connected' });
    });

    it('should return degraded status when database is disconnected', async () => {
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Connection refused'),
      );

      const result = await controller.check();
      expect(result).toEqual({ status: 'degraded', database: 'disconnected' });
    });
  });
});
