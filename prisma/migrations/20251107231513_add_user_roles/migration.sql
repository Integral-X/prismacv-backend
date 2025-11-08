-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REGULAR', 'PLATFORM_ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'REGULAR';
