import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { createTaskInputSchema, UpdateTaskInputSchema } from "@/lib/zod";
import { inferMissingTaskFields } from "../services/ai-infer-service";
import { LearningService } from "../services/learning-service";

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      let projectContext:
        | {
            title: string;
            deadline: Date | null;
            status: string;
          }
        | undefined;

      if (input.projectId) {
        const project = await ctx.db.project.findFirst({
          where: {
            id: input.projectId,
            userId: ctx.session.user.id,
          },
          select: {
            title: true,
            deadline: true,
            status: true,
          },
        });

        if (!project) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid projectId. Project not found for this user.",
          });
        }

        projectContext = {
          title: project.title,
          deadline: project.deadline,
          status: project.status,
        };
      }

      const data = await inferMissingTaskFields(input, projectContext);
      const task = await ctx.db.task.create({
        data: {
          ...data.data,
          userId: ctx.session.user.id,
        },
      });

      return {
        inferStatus: data.status,
        task,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.db.task.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!task) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      return task;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: UpdateTaskInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: input.data,
      });

      return task;
    }),

  updateMany: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        data: UpdateTaskInputSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.task.updateMany({
        where: {
          id: { in: input.ids },
          userId: ctx.session.user.id,
        },
        data: input.data,
      });

      return { count: result.count };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.task.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const tasks = await ctx.db.task.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      include: {
        project: {
          select: {
            title: true,
          },
        },
      },
    });
    return tasks;
  }),

  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.task.deleteMany({
        where: {
          id: { in: input.ids },
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  complete: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startTime: z.date().optional(),
        endTime: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingTask = await ctx.db.task.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        select: {
          id: true,
          durationMinutes: true,
        },
      });

      if (!existingTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      if (input.startTime && input.startTime >= input.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "startTime must be before endTime",
        });
      }

      const task = await ctx.db.task.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: {
          status: "COMPLETED",
        },
      });

      const inferredStartTime = new Date(
        input.endTime.getTime() - (task.durationMinutes ?? 60) * 60_000,
      );
      const startTime = input.startTime ?? inferredStartTime;

      if (startTime >= input.endTime) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Computed startTime must be before endTime",
        });
      }

      await ctx.db.taskCompletion.create({
        data: {
          taskId: input.id,
          startTime,
          endTime: input.endTime,
        },
      });

      void LearningService.processCompletion(
        ctx.db,
        input.id,
        ctx.session.user.id,
      );

      return task;
    }),
});
