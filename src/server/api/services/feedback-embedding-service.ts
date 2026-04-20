import type { PrismaClient } from "@prisma/client";
import { OpenAIEmbedder } from "@/features/ai/embedding";

export interface SimilarTaskFeedback {
  id: string;
  taskTitle: string;
  taskDescription: string | null;
  actualDurationMinutes: number;
  userComplexity: number;
  feedbackText: string | null;
  estimatedDurationMinutes: number | null;
  estimatedPriority: number | null;
  estimatedComplexity: number | null;
  similarity: number;
}

interface StoreFeedbackParams {
  userId: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string | null | undefined;
  actualDurationMinutes: number;
  userComplexity: number;
  feedbackText?: string;
  estimatedDurationMinutes?: number | null;
  estimatedPriority?: number | null;
  estimatedComplexity?: number | null;
}

interface FindSimilarParams {
  userId: string;
  taskTitle: string;
  taskDescription?: string | null;
  limit?: number;
  threshold?: number;
}

function composeEmbeddingText(
  title: string,
  description?: string | null,
): string {
  let text = `Task: ${title}`;
  if (description) text += `\nDescription: ${description}`;
  return text;
}

const embedder = new OpenAIEmbedder();

export async function storeFeedbackWithEmbedding(
  db: PrismaClient,
  params: StoreFeedbackParams,
): Promise<string> {
  const text = composeEmbeddingText(params.taskTitle, params.taskDescription);
  const embeddingArray = await embedder.embed(text);
  const vectorString = `[${embeddingArray.join(",")}]`;
  const id = crypto.randomUUID();

  await db.$executeRaw`
    INSERT INTO task_feedback (
      id, "taskTitle", "taskDescription", embedding,
      "actualDurationMinutes", "userComplexity", "feedbackText",
      "estimatedDurationMinutes", "estimatedPriority", "estimatedComplexity",
      "userId", "taskId", "createdAt"
    ) VALUES (
      ${id}, ${params.taskTitle}, ${params.taskDescription ?? null}, ${vectorString}::vector,
      ${params.actualDurationMinutes}, ${params.userComplexity}, ${params.feedbackText ?? null},
      ${params.estimatedDurationMinutes ?? null}, ${params.estimatedPriority ?? null}, ${params.estimatedComplexity ?? null},
      ${params.userId}, ${params.taskId}, NOW()
    )
  `;

  return id;
}

export async function findSimilarTaskFeedback(
  db: PrismaClient,
  params: FindSimilarParams,
): Promise<SimilarTaskFeedback[]> {
  const { userId, taskTitle, taskDescription, limit = 5, threshold = 0.3 } = params;

  const text = composeEmbeddingText(taskTitle, taskDescription);

  let embeddingArray: number[];
  try {
    embeddingArray = await embedder.embed(text);
  } catch (error) {
    console.warn("[feedback-embedding] Failed to embed for search:", error);
    return [];
  }

  const vectorString = `[${embeddingArray.join(",")}]`;

  const results = await db.$queryRaw<SimilarTaskFeedback[]>`
    SELECT
      id,
      "taskTitle",
      "taskDescription",
      "actualDurationMinutes",
      "userComplexity",
      "feedbackText",
      "estimatedDurationMinutes",
      "estimatedPriority",
      "estimatedComplexity",
      1 - (embedding <=> ${vectorString}::vector) AS similarity
    FROM task_feedback
    WHERE "userId" = ${userId}
      AND 1 - (embedding <=> ${vectorString}::vector) > ${threshold}
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT ${limit}
  `;

  return results;
}
