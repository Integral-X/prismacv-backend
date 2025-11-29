/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `users` table from CUID (String) to UUID.
  - This migration will assign new UUIDs to existing records, losing the original CUID values.

  Note: In production, you may want to create a mapping table to preserve old CUIDs for reference.
*/

-- Step 1: Add a temporary column for the new UUID
ALTER TABLE "users" ADD COLUMN "new_id" UUID;

-- Step 2: Generate new UUIDs for existing records (using gen_random_uuid as a fallback)
UPDATE "users" SET "new_id" = gen_random_uuid();

-- Step 3: Make the new column NOT NULL
ALTER TABLE "users" ALTER COLUMN "new_id" SET NOT NULL;

-- Step 4: Drop the old primary key constraint
ALTER TABLE "users" DROP CONSTRAINT "users_pkey";

-- Step 5: Drop the old id column
ALTER TABLE "users" DROP COLUMN "id";

-- Step 6: Rename new_id to id
ALTER TABLE "users" RENAME COLUMN "new_id" TO "id";

-- Step 7: Add the primary key constraint back
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
