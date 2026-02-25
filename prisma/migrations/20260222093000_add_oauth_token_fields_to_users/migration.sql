-- Add OAuth token metadata fields for provider API access
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "oauthAccessToken" TEXT,
  ADD COLUMN IF NOT EXISTS "oauthRefreshToken" TEXT,
  ADD COLUMN IF NOT EXISTS "oauthTokenExpiresAt" TIMESTAMP(3);
