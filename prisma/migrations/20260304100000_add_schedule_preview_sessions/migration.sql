-- CreateEnum
CREATE TYPE "SchedulePreviewStatus" AS ENUM ('ACTIVE', 'CONFIRMED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "schedule_preview_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SchedulePreviewStatus" NOT NULL DEFAULT 'ACTIVE',
    "seed" INTEGER NOT NULL,
    "baseDate" TIMESTAMP(3) NOT NULL,
    "timeHorizon" INTEGER NOT NULL,
    "previewEventsJson" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_preview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_preview_task_changes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "oldDue" TIMESTAMP(3),
    "oldPriority" INTEGER,
    "oldDurationMinutes" INTEGER,
    "oldPreferredStartAfter" INTEGER,
    "lastSessionUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_preview_task_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_preview_sessions_userId_status_idx" ON "schedule_preview_sessions"("userId", "status");

-- CreateIndex
CREATE INDEX "schedule_preview_sessions_status_expiresAt_idx" ON "schedule_preview_sessions"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_preview_task_changes_sessionId_taskId_key" ON "schedule_preview_task_changes"("sessionId", "taskId");

-- CreateIndex
CREATE INDEX "schedule_preview_task_changes_taskId_idx" ON "schedule_preview_task_changes"("taskId");

-- AddForeignKey
ALTER TABLE "schedule_preview_sessions" ADD CONSTRAINT "schedule_preview_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_preview_task_changes" ADD CONSTRAINT "schedule_preview_task_changes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "schedule_preview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_preview_task_changes" ADD CONSTRAINT "schedule_preview_task_changes_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
