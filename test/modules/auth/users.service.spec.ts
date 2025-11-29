import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../../src/modules/auth/users.service';
import { PrismaService } from '../../../src/config/prisma.service';
import { ConflictException } from '@nestjs/common';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Prisma, UserRole } from '@prisma/client';
import { User } from '../../../src/modules/auth/entities/user.entity';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaService: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  describe('create', () => {
    let userEntity: User;

    beforeEach(() => {
      userEntity = new User();
      userEntity.email = 'test@example.com';
      userEntity.password = 'hashedpassword123';
      userEntity.name = 'Test User';
    });

    it('should create a new user successfully', async () => {
      const createdPrismaUser = {
        id: '1',
        email: userEntity.email,
        password: userEntity.password,
        name: userEntity.name,
        role: UserRole.REGULAR,
        refreshToken: null,
        emailVerified: false,
        otpCode: null,
        otpExpiresAt: null,
        avatarUrl: null,
        provider: null,
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUserEntity = new User();
      expectedUserEntity.id = '1';
      expectedUserEntity.email = userEntity.email;
      expectedUserEntity.password = userEntity.password;
      expectedUserEntity.name = userEntity.name;
      expectedUserEntity.refreshToken = null;
      expectedUserEntity.createdAt = createdPrismaUser.createdAt;
      expectedUserEntity.updatedAt = createdPrismaUser.updatedAt;

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(createdPrismaUser);

      const result = await usersService.create(userEntity);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: userEntity.email },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: userEntity.email,
            password: userEntity.password,
            name: userEntity.name,
            role: userEntity.role,
          }),
        }),
      );
      // Verify that a UUIDv7 id was generated (36 chars with dashes)
      const callArgs = (prismaService.user.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(expectedUserEntity.id);
      expect(result.email).toBe(expectedUserEntity.email);
      expect(result.password).toBe(expectedUserEntity.password);
      expect(result.name).toBe(expectedUserEntity.name);
    });

    it('should throw ConflictException when user already exists', async () => {
      const existingPrismaUser = {
        id: '1',
        email: userEntity.email,
        password: 'existingpassword',
        name: 'Existing User',
        role: UserRole.REGULAR,
        refreshToken: null,
        emailVerified: false,
        otpCode: null,
        otpExpiresAt: null,
        avatarUrl: null,
        provider: null,
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(existingPrismaUser);

      await expect(usersService.create(userEntity)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: userEntity.email },
      });
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should handle Prisma unique constraint violation', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        },
      );

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockRejectedValue(prismaError);

      await expect(usersService.create(userEntity)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create user without name field', async () => {
      const userEntityWithoutName = new User();
      userEntityWithoutName.email = 'test@example.com';
      userEntityWithoutName.password = 'hashedpassword123';
      // name is undefined

      const createdPrismaUser = {
        id: '2',
        email: userEntityWithoutName.email,
        password: userEntityWithoutName.password,
        name: null,
        role: UserRole.REGULAR,
        refreshToken: null,
        emailVerified: false,
        otpCode: null,
        otpExpiresAt: null,
        avatarUrl: null,
        provider: null,
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(createdPrismaUser);

      const result = await usersService.create(userEntityWithoutName);

      expect(prismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: userEntityWithoutName.email,
            password: userEntityWithoutName.password,
            name: undefined,
            role: userEntityWithoutName.role,
          }),
        }),
      );
      // Verify that a UUIDv7 id was generated
      const callArgs = (prismaService.user.create as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(result).toBeInstanceOf(User);
      expect(result.email).toBe(userEntityWithoutName.email);
      expect(result.password).toBe(userEntityWithoutName.password);
      expect(result.name).toBeNull();
    });

    it('should rethrow other Prisma errors', async () => {
      const otherPrismaError = new Prisma.PrismaClientKnownRequestError(
        'Database connection failed',
        {
          code: 'P1001',
          clientVersion: '4.0.0',
        },
      );

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockRejectedValue(otherPrismaError);

      await expect(usersService.create(userEntity)).rejects.toThrow(
        otherPrismaError,
      );
    });

    it('should rethrow non-Prisma errors', async () => {
      const genericError = new Error('Generic database error');

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockRejectedValue(genericError);

      await expect(usersService.create(userEntity)).rejects.toThrow(
        genericError,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return User entity when found', async () => {
      const prismaUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.REGULAR,
        refreshToken: null,
        emailVerified: false,
        otpCode: null,
        otpExpiresAt: null,
        avatarUrl: null,
        provider: null,
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(prismaUser);

      const result = await usersService.findByEmail('test@example.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(prismaUser.id);
      expect(result.email).toBe(prismaUser.email);
      expect(result.password).toBe(prismaUser.password);
      expect(result.name).toBe(prismaUser.name);
      expect(result.refreshToken).toBe(prismaUser.refreshToken);
    });

    it('should return null when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return User entity when found', async () => {
      const prismaUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.REGULAR,
        refreshToken: 'refresh-token-123',
        emailVerified: false,
        otpCode: null,
        otpExpiresAt: null,
        avatarUrl: null,
        provider: null,
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(prismaUser);

      const result = await usersService.findById('1');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(prismaUser.id);
      expect(result.email).toBe(prismaUser.email);
      expect(result.password).toBe(prismaUser.password);
      expect(result.name).toBe(prismaUser.name);
      expect(result.refreshToken).toBe(prismaUser.refreshToken);
    });

    it('should return null when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await usersService.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user and return User entity', async () => {
      const userEntityUpdate = new User();
      userEntityUpdate.email = 'updated@example.com';
      userEntityUpdate.name = 'Updated Name';
      userEntityUpdate.refreshToken = 'new-refresh-token';

      const updatedPrismaUser = {
        id: '1',
        email: userEntityUpdate.email,
        password: 'hashedpassword',
        name: userEntityUpdate.name,
        role: UserRole.REGULAR,
        refreshToken: userEntityUpdate.refreshToken,
        emailVerified: false,
        otpCode: null,
        otpExpiresAt: null,
        avatarUrl: null,
        provider: null,
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.update.mockResolvedValue(updatedPrismaUser);

      const result = await usersService.update('1', userEntityUpdate);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          email: userEntityUpdate.email,
          password: userEntityUpdate.password,
          name: userEntityUpdate.name,
          refreshToken: userEntityUpdate.refreshToken,
        },
      });
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(updatedPrismaUser.id);
      expect(result.email).toBe(updatedPrismaUser.email);
      expect(result.name).toBe(updatedPrismaUser.name);
      expect(result.refreshToken).toBe(updatedPrismaUser.refreshToken);
    });

    it('should update user with partial data', async () => {
      const partialUpdate = { refreshToken: 'new-token-only' };

      const updatedPrismaUser = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        role: UserRole.REGULAR,
        refreshToken: 'new-token-only',
        emailVerified: false,
        otpCode: null,
        otpExpiresAt: null,
        avatarUrl: null,
        provider: null,
        providerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.update.mockResolvedValue(updatedPrismaUser);

      const result = await usersService.update('1', partialUpdate);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          email: undefined,
          password: undefined,
          name: undefined,
          refreshToken: 'new-token-only',
        },
      });
      expect(result).toBeInstanceOf(User);
      expect(result.refreshToken).toBe('new-token-only');
    });
  });
});
