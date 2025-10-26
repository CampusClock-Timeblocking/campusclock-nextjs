import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { parseDuration } from "@/lib/utils";
import { CreateTaskSchema, UpdateTaskSchema } from "@/lib/zod";

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { durationMinutes, ...rest } = input;

      const parsedDuration = parseDuration(durationMinutes);
      if (parsedDuration === null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid duration format",
        });
      }

      const task = await ctx.db.task.create({
        data: {
          ...rest,
          durationMinutes: parsedDuration,
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
        data: UpdateTaskSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingTask = await ctx.db.task.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!existingTask) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Task not found",
        });
      }

      const { durationMinutes, ...rest } = input.data;

      let parsedDuration: number | undefined;
      if (durationMinutes !== undefined) {
        const result = parseDuration(durationMinutes);
        if (result === null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid duration format",
          });
        }
        parsedDuration = result;
      }

      const task = await ctx.db.task.update({
        where: {
          id: input.id,
        },
        data: {
          ...rest,
          ...(parsedDuration !== undefined && {
            durationMinutes: parsedDuration,
          }),
        },
      });

      return task;
    }),

  updateMany: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        data: UpdateTaskSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { durationMinutes, ...rest } = input.data;
      let parsedDuration: number | undefined;

      if (durationMinutes !== undefined) {
        const result = parseDuration(durationMinutes);
        if (result === null) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid duration format",
          });
        }
        parsedDuration = result;
      }

      const result = await ctx.db.task.updateMany({
        where: {
          id: { in: input.ids },
          userId: ctx.session.user.id,
        },
        data: {
          ...rest,
          ...(parsedDuration !== undefined && {
            durationMinutes: parsedDuration,
          }),
        },
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
