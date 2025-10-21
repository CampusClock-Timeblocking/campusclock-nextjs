import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const preferencesRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.userPreferences.findUnique({
      where: { userId },
    });
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        earliestTime: z.string(),
        latestTime: z.string(),
        dailyMaxMin: z.number(),
        dailyOptimalMin: z.number(),
        aggressiveness: z.number(),
        allowCalendarWrites: z.boolean(),
        timezone: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.userPreferences.upsert({
        where: { userId },
        update: input,
        create: { ...input, userId },
      });
    }),
});
