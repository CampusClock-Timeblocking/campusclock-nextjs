import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { PeriodUnit } from "@prisma/client";
import { z } from "zod";

export const habitsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.habit.findMany({
      where: {
        userId,
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        recurrenceRule: z.string(),
        preferredTime: z.string(),
        durationMinutes: z.number(),
        active: z.boolean(),
        recurrenceType: z.enum(PeriodUnit),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.habit.create({
        data: { ...input, userId },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        recurrenceRule: z.string(),
        preferredTime: z.string(),
        durationMinutes: z.number(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.habit.update({
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
      return ctx.db.habit.delete({
        where: { id: input.id, userId },
      });
    }),
});
