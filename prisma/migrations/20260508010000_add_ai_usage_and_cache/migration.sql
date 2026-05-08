-- CreateEnum
CREATE TYPE "AiUsageFeature" AS ENUM (
    'CV_ANALYZE',
    'CV_OPTIMIZE',
    'GRAMMAR_CHECK',
    'ATS_SCORE',
    'COVER_LETTER_GENERATE'
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "feature" "AiUsageFeature" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "callsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis_cache" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cvId" UUID NOT NULL,
    "contentHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "analysis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_userId_feature_periodStart_periodEnd_key" ON "ai_usage"("userId", "feature", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ai_usage_userId_feature_periodEnd_idx" ON "ai_usage"("userId", "feature", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_cache_cvId_contentHash_provider_key" ON "ai_analysis_cache"("cvId", "contentHash", "provider");

-- CreateIndex
CREATE INDEX "ai_analysis_cache_userId_expiresAt_idx" ON "ai_analysis_cache"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_cache" ADD CONSTRAINT "ai_analysis_cache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_cache" ADD CONSTRAINT "ai_analysis_cache_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
