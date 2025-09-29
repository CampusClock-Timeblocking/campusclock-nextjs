import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "../db";
import { env } from "@/env";
import { createAuthMiddleware } from "better-auth/api";
import { CalendarService } from "@/server/api/services/calendar-service";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: false,
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // This makes sure that every user has a default calendar
      if (ctx.path.startsWith("/sign-up")) {
        if (!ctx.context.newSession?.user.id) {
          return;
        }
        const calendarService = new CalendarService();
        await calendarService.createCalendar(ctx.context.newSession.user.id);
      }
    }),
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      accessType: "offline",
      prompt: "select_account consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
        "https://www.googleapis.com/auth/calendar.calendars.readonly",
        "https://www.googleapis.com/auth/calendar.events.readonly",
      ],
    },
  },
});
