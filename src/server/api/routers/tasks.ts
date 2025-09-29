import z from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TaskStatus } from "@prisma/client";

export const tasksRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.task.findMany({
      where: {
        userId,
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        status: z.nativeEnum(TaskStatus),
        estimatedDurationMin: z.number().optional(),
        priority: z.number().optional(),
        complexity: z.number().optional(),
        due: z.date().optional(),
        scheduledTime: z.string().optional(),
        projectId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.task.create({
        data: { ...input, userId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
        status: z.nativeEnum(TaskStatus),
        estimatedDurationMin: z.number().optional(),
        priority: z.number().optional(),
        complexity: z.number().optional(),
        due: z.date().optional(),
        scheduledTime: z.string().optional(),
        projectId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.task.update({
        where: { id: input.id, userId },
        data: input,
      });
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.task.delete({
        where: { id: input.id, userId },
      });
    }),
});
