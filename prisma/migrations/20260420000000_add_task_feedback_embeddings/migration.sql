-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create task_feedback table
CREATE TABLE task_feedback (
    id TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "taskDescription" TEXT,
    embedding vector(1536) NOT NULL,
    "actualDurationMinutes" INTEGER NOT NULL,
    "userComplexity" INTEGER NOT NULL,
    "feedbackText" TEXT,
    "estimatedDurationMinutes" INTEGER,
    "estimatedPriority" INTEGER,
    "estimatedComplexity" INTEGER,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_feedback_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "task_feedback_userId_idx" ON "task_feedback"("userId");
CREATE UNIQUE INDEX "task_feedback_taskId_key" ON "task_feedback"("taskId");
CREATE INDEX "task_feedback_embedding_idx" ON "task_feedback" USING hnsw (embedding vector_cosine_ops);

-- Foreign keys
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
