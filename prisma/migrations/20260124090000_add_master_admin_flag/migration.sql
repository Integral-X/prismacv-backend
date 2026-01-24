-- Add master admin flag to users table
ALTER TABLE "users" ADD COLUMN "isMasterAdmin" BOOLEAN NOT NULL DEFAULT false;
