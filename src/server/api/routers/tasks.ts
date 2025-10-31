import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { parseDuration } from "@/lib/utils";
import { createTaskInputSchema, UpdateTaskInputSchema } from "@/lib/zod";

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTaskInputSchema)
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.db.task.create({
        data: {
          ...input,
          userId: ctx.session.user.id,
        },
      });

      return task;
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
});
