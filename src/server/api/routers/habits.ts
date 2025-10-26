import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CreateHabitSchema, UpdateHabitSchema } from "@/lib/zod";

export const habitRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateHabitSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const habit = await ctx.db.habit.create({
        data: {
          ...input,
          userId,
          active: input.active ?? true,
          interval: input.interval ?? 1,
          timesPerPeriod: input.timesPerPeriod ?? 1,
          byWeekdays: input.byWeekdays ?? [],
        },
      });

      return habit;
    }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const habits = await ctx.db.habit.findMany({
      where: {
        userId,
      },
    });

    return habits;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const habit = await ctx.db.habit.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!habit) {
        throw new Error("Habit not found");
      }

      return habit;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: UpdateHabitSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const habit = await ctx.db.habit.update({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        data: input.data,
      });

      return habit;
    }),

  updateMany: protectedProcedure
    .input(
      z.object({
        id: z.array(z.string()),
        data: UpdateHabitSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const habit = await ctx.db.habit.updateMany({
        where: {
          id: { in: input.id },
          userId: ctx.session.user.id,
        },
        data: input.data,
      });

      return habit;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.habit.delete({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.habit.deleteMany({
        where: {
          id: { in: input.ids },
          userId: ctx.session.user.id,
        },
      });

      return { count: result.count };
    }),
});
