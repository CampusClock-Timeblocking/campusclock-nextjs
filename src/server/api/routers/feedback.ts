import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { submitTaskFeedbackSchema } from "@/lib/zod";
import { storeFeedbackWithEmbedding } from "../services/feedback-embedding-service";

export const feedbackRouter = createTRPCRouter({
  submit: protectedProcedure
    .input(submitTaskFeedbackSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: {
          id: input.taskId,
          userId: ctx.session.user.id,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      const existing = await ctx.db.taskFeedback.findUnique({
        where: { taskId: input.taskId },
        select: { id: true },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Feedback already submitted for this task.",
        });
      }

      try {
        const feedbackId = await storeFeedbackWithEmbedding(ctx.db, {
          userId: ctx.session.user.id,
          taskId: input.taskId,
          taskTitle: task.title,
          taskDescription: task.description,
          actualDurationMinutes: input.actualDurationMinutes,
          userComplexity: input.userComplexity,
          feedbackText: input.feedbackText,
          estimatedDurationMinutes: task.durationMinutes,
          estimatedPriority: task.priority,
          estimatedComplexity: task.complexity,
        });

        return { success: true, feedbackId };
      } catch (error) {
        console.error("[feedback-router] Failed to store feedback:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store feedback. Please try again.",
        });
      }
    }),

  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const feedback = await ctx.db.taskFeedback.findUnique({
        where: {
          taskId: input.taskId,
        },
        select: {
          id: true,
          taskTitle: true,
          actualDurationMinutes: true,
          userComplexity: true,
          feedbackText: true,
          estimatedDurationMinutes: true,
          estimatedPriority: true,
          estimatedComplexity: true,
          createdAt: true,
        },
      });
      return feedback;
    }),
});
