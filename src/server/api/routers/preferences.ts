import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { WorkingHoursSchema, PreferencesInput } from "@/lib/zod";
import { energyPresets } from "@/lib/energy-presets";

/** Convert "HH:MM" to a Date(1970-01-01T...) that Prisma stores as `@db.Time()`. */
function toTimeDate(t: string) {
  const [h, m] = t.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0));
}

export const preferencesRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return ctx.db.workingPreferences.findUnique({
      where: { userId },
    });
  }),

  updateWorkingHours: protectedProcedure
    .input(WorkingHoursSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.workingPreferences.upsert({
        where: { userId },
        update: {
          earliestTime: toTimeDate(input.earliestTime),
          latestTime: toTimeDate(input.latestTime),
          workingDays: input.workingDays,
        },
        create: {
          userId,
          earliestTime: toTimeDate(input.earliestTime),
          latestTime: toTimeDate(input.latestTime),
          workingDays: input.workingDays,
          alertnessByHour: new Array(24).fill(0.5) as number[],
        },
      });
    }),

  updateEnergyProfile: protectedProcedure
    .input(PreferencesInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return ctx.db.workingPreferences.upsert({
        where: { userId },
        update: {
          alertnessByHour: energyPresets[input.energyProfile],
        },
        create: {
          userId,
          earliestTime: new Date(Date.UTC(1970, 0, 1, 8, 0, 0)),
          latestTime: new Date(Date.UTC(1970, 0, 1, 17, 0, 0)),
          workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
          alertnessByHour: energyPresets[input.energyProfile],
        },
      });
    }),
});
