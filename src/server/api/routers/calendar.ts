import { z } from "zod";
import { google } from "googleapis";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const calendarRouter = createTRPCRouter({
  getEvents: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const googleAccount = await ctx.db.account.findFirst({
        where: { userId: ctx.session.user.id, providerId: "google" },
      });
      if (!googleAccount?.accessToken)
        throw new TRPCError({
          message: "No access token found",
          code: "NOT_FOUND",
        });

      const oAuthClient = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      );
      oAuthClient.setCredentials({ access_token: googleAccount.accessToken });

      const events = await google.calendar("v3").events.list({
        calendarId: "primary",
        eventTypes: ["default"],
        singleEvents: true,
        timeMin: input.start.toISOString(),
        timeMax: input.end.toISOString(),
        maxResults: 2500,
        auth: oAuthClient,
      });

      return events.data.items?.map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start?.dateTime,
        end: event.end?.dateTime,
      }));
    }),
});
