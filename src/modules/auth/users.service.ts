import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/config/prisma.service';
import { User as PrismaUser } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converts Prisma User to User entity
   */
  private prismaUserToEntity(prismaUser: PrismaUser): User {
    const user = new User();
    user.id = prismaUser.id;
    user.email = prismaUser.email;
    user.password = prismaUser.password;
    user.name = prismaUser.name;
    user.role = prismaUser.role as any; // Map Prisma UserRole to entity UserRole
    user.refreshToken = prismaUser.refreshToken;
    user.createdAt = prismaUser.createdAt;
    user.updatedAt = prismaUser.updatedAt;
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({ where: { email } });
    return prismaUser ? this.prismaUserToEntity(prismaUser) : null;
  }

  async findById(id: string): Promise<User | null> {
    const prismaUser = await this.prisma.user.findUnique({ where: { id } });
    return prismaUser ? this.prismaUserToEntity(prismaUser) : null;
  }

  async update(id: string, userEntity: Partial<User>): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        email: userEntity.email,
        password: userEntity.password,
        name: userEntity.name,
        role: userEntity.role as any,
        refreshToken: userEntity.refreshToken,
      },
    });
    return this.prismaUserToEntity(updatedUser);
  }

  async create(userEntity: User): Promise<User> {
    try {
      // Check if user with email already exists
      const existingUser = await this.findByEmail(userEntity.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create new user using entity properties
      const createdUser = await this.prisma.user.create({
        data: {
          email: userEntity.email,
          password: userEntity.password,
          name: userEntity.name,
          role: userEntity.role as any, // Persist role to database
        },
      });

      // Convert Prisma user to User entity
      return this.prismaUserToEntity(createdUser);
    } catch (error) {
      // Handle Prisma unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('User with this email already exists');
        }
      }
      // Re-throw other errors
      throw error;
    }
  }
}
