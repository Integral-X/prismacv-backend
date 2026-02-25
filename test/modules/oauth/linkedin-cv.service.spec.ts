import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { LinkedInCvService } from '../../../src/modules/oauth/services/linkedin-cv.service';
import { UsersService } from '../../../src/modules/auth/users.service';
import { PrismaService } from '../../../src/config/prisma.service';
import { OAUTH_PROVIDERS } from '../../../src/shared/constants/oauth.constants';
import { User } from '../../../src/modules/auth/entities/user.entity';

describe('LinkedInCvService', () => {
  let service: LinkedInCvService;
  let usersService: DeepMockProxy<UsersService>;
  let prismaService: DeepMockProxy<PrismaService>;
  let linkedinCvImportModel: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkedInCvService,
        { provide: UsersService, useValue: mockDeep<UsersService>() },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<LinkedInCvService>(LinkedInCvService);
    usersService = module.get(UsersService);
    prismaService = module.get(PrismaService);
    linkedinCvImportModel = (prismaService as any).linkedinCvImport;

    jest
      .spyOn(global, 'fetch')
      .mockImplementation((input: string | URL | Request) => {
        const url = input.toString();

        if (url.includes('/v2/me')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              localizedFirstName: 'John',
              localizedLastName: 'Doe',
              localizedHeadline: 'Senior Software Engineer',
            }),
          } as Response);
        }

        if (url.includes('/v2/emailAddress')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              elements: [
                {
                  'handle~': {
                    emailAddress: 'john@example.com',
                  },
                },
              ],
            }),
          } as Response);
        }

        return Promise.resolve({
          ok: false,
          status: 403,
          text: async () => 'forbidden',
        } as Response);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException when user does not exist', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(service.importForUser('user-id', 'john-doe')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ConflictException when LinkedIn is not connected', async () => {
    const user = new User();
    user.id = 'user-id';
    user.email = 'user@example.com';
    user.provider = OAUTH_PROVIDERS.GOOGLE;

    usersService.findById.mockResolvedValue(user);

    await expect(service.importForUser('user-id', 'john-doe')).rejects.toThrow(
      ConflictException,
    );
  });

  it('should normalize handle and persist import', async () => {
    const user = new User();
    user.id = 'user-id';
    user.name = 'John Doe';
    user.email = 'john@example.com';
    user.avatarUrl = 'https://cdn.example.com/avatar.png';
    user.provider = OAUTH_PROVIDERS.LINKEDIN;
    user.oauthAccessToken = 'linkedin-access-token';

    usersService.findById.mockResolvedValue(user);
    linkedinCvImportModel.upsert.mockResolvedValue({
      id: 'import-id',
    } as any);

    const result = await service.importForUser('user-id', '@john-doe');

    expect(linkedinCvImportModel.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_linkedinUrl: {
            userId: 'user-id',
            linkedinUrl: 'https://www.linkedin.com/in/john-doe',
          },
        },
      }),
    );
    expect(result.source.provider).toBe(OAUTH_PROVIDERS.LINKEDIN);
    expect(result.source.handle).toBe('john-doe');
    expect(result.source.url).toBe('https://www.linkedin.com/in/john-doe');
    expect(result.source.importId).toBe('import-id');
    expect(result.profile.fullName).toBe('John Doe');
    expect(result.profile.headline).toBe('Senior Software Engineer');
  });

  it('should normalize linkedin profile URL and persist import', async () => {
    const user = new User();
    user.id = 'user-id';
    user.provider = OAUTH_PROVIDERS.LINKEDIN;
    user.oauthAccessToken = 'linkedin-access-token';

    usersService.findById.mockResolvedValue(user);
    linkedinCvImportModel.upsert.mockResolvedValue({
      id: 'import-id-2',
    } as any);

    const result = await service.importForUser(
      'user-id',
      'linkedin.com/in/jane-smith/',
    );

    expect(result.source.handle).toBe('jane-smith');
    expect(result.source.url).toBe('https://www.linkedin.com/in/jane-smith');
    expect(result.source.importId).toBe('import-id-2');
  });

  it('should reject invalid LinkedIn URL host', async () => {
    const user = new User();
    user.id = 'user-id';
    user.provider = OAUTH_PROVIDERS.LINKEDIN;
    usersService.findById.mockResolvedValue(user);

    await expect(
      service.importForUser('user-id', 'https://example.com/in/john-doe'),
    ).rejects.toThrow('Invalid LinkedIn URL');
  });

  it('should reject invalid LinkedIn handle', async () => {
    const user = new User();
    user.id = 'user-id';
    user.provider = OAUTH_PROVIDERS.LINKEDIN;
    usersService.findById.mockResolvedValue(user);

    await expect(service.importForUser('user-id', 'john doe')).rejects.toThrow(
      'Invalid LinkedIn handle',
    );
  });
});
