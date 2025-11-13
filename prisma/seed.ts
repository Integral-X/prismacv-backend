import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }),
  ),
  transports: [new transports.Console()],
});

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'PLATFORM_ADMIN',
      provider: null,
    },
  });

  logger.info('Created admin user:', admin.email);

  logger.info('Database seeding completed!');
}

main()
  .catch(e => {
    logger.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
