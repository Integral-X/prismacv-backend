import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createLogger, format, transports } from 'winston';
import { uuidv7 } from 'uuidv7';

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

  const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL?.trim();
  const masterAdminPassword = process.env.MASTER_ADMIN_PASSWORD;
  const masterAdminName = process.env.MASTER_ADMIN_NAME?.trim();

  if (!masterAdminEmail || !masterAdminPassword) {
    logger.warn(
      'MASTER_ADMIN_EMAIL or MASTER_ADMIN_PASSWORD is not set. Skipping master admin seed.',
    );
    logger.info('Database seeding completed!');
    return;
  }

  // Create master admin user
  const hashedPassword = await bcrypt.hash(masterAdminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: masterAdminEmail },
    update: {
      password: hashedPassword,
      name: masterAdminName || undefined,
      role: 'PLATFORM_ADMIN',
      isMasterAdmin: true,
    },
    create: {
      id: uuidv7(),
      email: masterAdminEmail,
      password: hashedPassword,
      name: masterAdminName || undefined,
      role: 'PLATFORM_ADMIN',
      isMasterAdmin: true,
      provider: null,
    },
  });

  logger.info(`Created/updated master admin user: ${admin.email}`);

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
