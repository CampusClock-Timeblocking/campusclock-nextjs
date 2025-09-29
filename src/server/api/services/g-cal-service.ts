import { env } from "@/env";
import type { PrismaClient, Event, Calendar } from "@prisma/client";
import { google } from "googleapis";
import { TRPCError } from "@trpc/server";
import { CalendarType, CalendarProvider } from "@prisma/client";

export class GCalService {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient) {
    this.db = db;
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
    );
  }

  async syncGoogleCalendars(userId: string) {
    const calendars = await this.getUserCalendars(userId);

    if (!calendars) {
      throw new TRPCError({
        message: "No calendars found",
        code: "NOT_FOUND",
      });
    }

    for (const calendar of calendars) {
      await this.db.calendar.upsert({
        where: { userId, externalId: calendar.id ?? "" },
        update: {
          name: calendar.name ?? "",
          backgroundColor: calendar.backgroundColor ?? "#000000",
          foregroundColor: calendar.foregroundColor ?? "#000000",
          type: CalendarType.EXTERNAL,
          provider: CalendarProvider.GOOGLE,
          externalId: calendar.id,
          readOnly: true,
        },
        create: {
          userId,
          name: calendar.name ?? "",
          backgroundColor: calendar.backgroundColor ?? "#000000",
          foregroundColor: calendar.foregroundColor ?? "#000000",
          type: CalendarType.EXTERNAL,
          provider: CalendarProvider.GOOGLE,
          externalId: calendar.id,
          readOnly: true,
        },
      });
    }
  }

  async getUserCalendars(userId: string) {
    const googleAccount = await this.db.account.findFirst({
      where: { userId, providerId: "google" },
    });

    if (!googleAccount?.accessToken || !googleAccount.refreshToken) {
      throw new TRPCError({
        message: "No access token found",
        code: "NOT_FOUND",
      });
    }

    const oAuthClient = this.createOAuthClient();
    oAuthClient.setCredentials({
      access_token: googleAccount.accessToken,
      refresh_token: googleAccount.refreshToken,
    });

    const calendars = await google.calendar("v3").calendarList.list({
      auth: oAuthClient,
    });

    return calendars.data.items?.map((calendar) => ({
      id: calendar.id,
      name: calendar.summary,
      backgroundColor: calendar.backgroundColor ?? "#000000",
      foregroundColor: calendar.foregroundColor ?? "#000000",
    }));
  }

  /**
   * Get events from a Google Calendar and transform them to match Prisma Event structure
   */
  async getEventsFromCalendar(
    userId: string,
    externalCalendarId: string,
    calendar: Calendar,
    start: Date,
    end: Date,
  ): Promise<Omit<Event, "calendar" | "task">[]> {
    const googleAccount = await this.db.account.findFirst({
      where: { userId, providerId: "google" },
    });

    if (!googleAccount?.accessToken || !googleAccount.refreshToken) {
      throw new TRPCError({
        message: "No access token found",
        code: "NOT_FOUND",
      });
    }

    const oAuthClient = this.createOAuthClient();
    oAuthClient.setCredentials({
      access_token: googleAccount.accessToken,
      refresh_token: googleAccount.refreshToken,
    });

    const events = await google.calendar("v3").events.list({
      calendarId: externalCalendarId,
      singleEvents: true,
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 2500,
      auth: oAuthClient,
    });

    // Transform Google Calendar events to Prisma Event format
    return (
      events.data.items
        ?.filter((event) => event.id && event.summary && event.start && event.end)
        .map((event) => ({
          id: `gcal-${event.id}`, // Prefix to avoid conflicts with local events
          title: event.summary!,
          description: event.description ?? null,
          start: new Date(event.start!.dateTime ?? event.start!.date!),
          end: new Date(event.end!.dateTime ?? event.end!.date!),
          allDay: event.start!.dateTime === undefined && event.end!.dateTime === undefined,
          color: calendar.backgroundColor,
          location: event.location ?? null,
          calendarId: calendar.id,
          taskId: null,
        })) ?? []
    );
  }
}
