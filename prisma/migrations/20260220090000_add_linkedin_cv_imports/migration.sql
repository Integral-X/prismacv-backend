-- CreateTable
CREATE TABLE IF NOT EXISTS "linkedin_cv_imports" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'LINKEDIN',
    "linkedinHandle" TEXT,
    "linkedinUrl" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataScope" JSONB NOT NULL,
    "warnings" JSONB,
    "profile" JSONB NOT NULL,
    "experience" JSONB NOT NULL,
    "education" JSONB NOT NULL,
    "skills" JSONB NOT NULL,
    "certifications" JSONB NOT NULL,
    "projects" JSONB NOT NULL,
    "publications" JSONB NOT NULL,
    "volunteer" JSONB NOT NULL,
    "honors" JSONB NOT NULL,
    "languages" JSONB NOT NULL,
    "courses" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linkedin_cv_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "linkedin_cv_imports_userId_linkedinUrl_key"
ON "linkedin_cv_imports"("userId", "linkedinUrl");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "linkedin_cv_imports_userId_fetchedAt_idx"
ON "linkedin_cv_imports"("userId", "fetchedAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'linkedin_cv_imports_userId_fkey'
    ) THEN
        ALTER TABLE "linkedin_cv_imports"
        ADD CONSTRAINT "linkedin_cv_imports_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
