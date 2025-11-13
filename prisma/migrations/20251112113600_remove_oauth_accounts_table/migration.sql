-- DropForeignKey
ALTER TABLE "oauth_accounts" DROP CONSTRAINT IF EXISTS "oauth_accounts_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "oauth_accounts_userId_idx";

-- DropIndex
DROP INDEX IF EXISTS "oauth_accounts_provider_providerId_key";

-- DropTable
DROP TABLE IF EXISTS "oauth_accounts";
