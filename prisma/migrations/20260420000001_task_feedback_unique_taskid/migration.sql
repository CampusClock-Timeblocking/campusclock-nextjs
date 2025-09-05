-- Drop the old non-unique index
DROP INDEX IF EXISTS "task_feedback_taskId_idx";

-- Add unique constraint
CREATE UNIQUE INDEX "task_feedback_taskId_key" ON "task_feedback"("taskId");
