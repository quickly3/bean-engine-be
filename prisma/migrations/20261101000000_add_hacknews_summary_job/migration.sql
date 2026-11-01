-- CreateTable
CREATE TABLE "public"."HackNewsSummaryJob" (
    "id" TEXT NOT NULL,
    "hackNewsId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "result" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HackNewsSummaryJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HackNewsSummaryJob_status_createdAt_idx" ON "public"."HackNewsSummaryJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "HackNewsSummaryJob_hackNewsId_idx" ON "public"."HackNewsSummaryJob"("hackNewsId");
