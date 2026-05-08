import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../../src/app.module';
import { JwtUserAuthGuard } from '@/modules/auth/guards/jwt-user-auth.guard';
import { RequiresPlanGuard } from '@/modules/billing/requires-plan.guard';
import { CvService } from '@/modules/cv/cv.service';
import { CvMapper } from '@/modules/cv/mappers/cv.mapper';
import { PrismaService } from '@/config/prisma.service';

describe('CV sharing flows (e2e)', () => {
  let app: INestApplication;
  let cvService: { shareCv: jest.Mock; getPublicCv: jest.Mock };

  const mockUser = {
    id: 'user-share-e2e',
    email: 'share@example.com',
    role: 'REGULAR',
    isMasterAdmin: false,
  };

  const cvId = '11111111-1111-1111-1111-111111111111';

  beforeAll(async () => {
    cvService = {
      shareCv: jest.fn().mockResolvedValue({
        id: 'share-1',
        cvId,
        shareSlug: 'public-share-slug',
        isPublic: true,
        viewCount: 0,
        downloadCount: 0,
        lastViewedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
      getPublicCv: jest.fn().mockResolvedValue({
        id: cvId,
        title: 'Shared CV',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtUserAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RequiresPlanGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(CvService)
      .useValue(cvService)
      .overrideProvider(CvMapper)
      .useValue({
        cvToResponse: jest.fn().mockImplementation(cv => ({
          id: cv.id,
          title: cv.title,
        })),
      })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /cv/:id/share creates a public share link', async () => {
    const response = await request(app.getHttpServer())
      .post(`/cv/${cvId}/share`)
      .send({ isPublic: true })
      .expect(201);

    expect(cvService.shareCv).toHaveBeenCalledWith(cvId, mockUser.id, true);
    expect(response.body.shareSlug).toBe('public-share-slug');
  });

  it('GET /cv/public/:slug returns shared CV data', async () => {
    const response = await request(app.getHttpServer())
      .get('/cv/public/public-share-slug')
      .expect(200);

    expect(cvService.getPublicCv).toHaveBeenCalledWith('public-share-slug');
    expect(response.body).toEqual({
      id: cvId,
      title: 'Shared CV',
    });
  });
});
