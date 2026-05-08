-- CreateTable
CREATE TABLE IF NOT EXISTS "cv_shares" (
    "id" UUID NOT NULL,
    "cvId" UUID NOT NULL,
    "shareSlug" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cv_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cv_shares_cvId_key" ON "cv_shares"("cvId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "cv_shares_shareSlug_key" ON "cv_shares"("shareSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cv_shares_shareSlug_idx" ON "cv_shares"("shareSlug");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'cv_shares_cvId_fkey'
    ) THEN
        ALTER TABLE "cv_shares"
            ADD CONSTRAINT "cv_shares_cvId_fkey"
            FOREIGN KEY ("cvId")
            REFERENCES "cvs"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END $$;
