import { TRPCError } from "@trpc/server";

import { db } from "@/server/db";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { WorkingHoursSchema } from "@/lib/zod";

export const onboardingRouter = createTRPCRouter({
  saveWorkingHours: protectedProcedure
    .input(WorkingHoursSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const toDate = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0));
      };

      await db.workingPreferences.upsert({
        where: { userId },
        update: {
          earliestTime: toDate(input.earliestTime),
          latestTime: toDate(input.latestTime),
          workingDays: input.workingDays,
        },
        create: {
          userId,
          earliestTime: toDate(input.earliestTime),
          latestTime: toDate(input.latestTime),
          workingDays: input.workingDays,
        },
      });

      return { ok: true };
    }),

  savePreferences: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    await db.schedulingConfig.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
      },
    });

    return { ok: true };
  }),
});
