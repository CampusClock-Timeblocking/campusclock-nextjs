import { TRPCError } from "@trpc/server";

import { db } from "@/server/db";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { WorkingHoursSchema, PreferencesInput } from "@/lib/zod";
import { energyPresets } from "@/lib/energy-presets";

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
          alertnessByHour: new Array(24).fill(0.5),
        },
        create: {
          userId,
          earliestTime: toDate(input.earliestTime),
          latestTime: toDate(input.latestTime),
          workingDays: input.workingDays,
          alertnessByHour: new Array(24).fill(0.5),
        },
      });

      return { ok: true };
    }),

  savePreferences: protectedProcedure
    .input(PreferencesInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db.workingPreferences.upsert({
        where: { userId },
        update: { alertnessByHour: energyPresets[input.energyProfile] },
        create: {
          userId,
          earliestTime: new Date(Date.UTC(1970, 0, 1, 8, 0, 0)),
          latestTime: new Date(Date.UTC(1970, 0, 1, 17, 0, 0)),
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
          alertnessByHour: energyPresets[input.energyProfile],
        },
      });

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
