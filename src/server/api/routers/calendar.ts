import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { GCalService } from "@/server/api/services/g-cal-service";

export const calendarRouter = createTRPCRouter({
  getEvents: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const gCalService = new GCalService(ctx.db);
      return await gCalService.getEvents(
        ctx.session.user.id,
        input.start,
        input.end,
      );
    }),
});
