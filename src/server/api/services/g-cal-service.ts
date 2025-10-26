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
      console.log(calendar);
      await this.db.calendar.upsert({
        where: {
          userId_provider_externalId: {
            userId,
            provider: CalendarProvider.GOOGLE,
            externalId: calendar.id ?? "",
          },
        },
        update: {
          name: calendar.name ?? "",
          backgroundColor: calendar.backgroundColor ?? "#000000",
          foregroundColor: calendar.foregroundColor ?? "#000000",
          type: CalendarType.EXTERNAL,
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
   * Get events from a single Google Calendar
   * @deprecated Use getEventsFromCalendars for better performance with multiple calendars
   */
  async getEventsFromCalendar(
    userId: string,
    externalCalendarId: string,
    calendar: Calendar,
    start: Date,
    end: Date,
  ): Promise<Omit<Event, "calendar" | "task">[]> {
    const result = await this.getEventsFromCalendars(userId, [calendar], start, end);
    return result.get(calendar.id) ?? [];
  }

  /**
   * Get events from multiple Google Calendars in parallel (optimized)
   * Returns a map of calendarId -> events
   */
  async getEventsFromCalendars(
    userId: string,
    calendars: Calendar[],
    start: Date,
    end: Date,
  ): Promise<Map<string, Omit<Event, "calendar" | "task">[]>> {
    if (calendars.length === 0) {
      return new Map();
    }

    // Get Google account credentials once
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

    // Fetch all calendars in parallel
    const results = await Promise.allSettled(
      calendars.map(async (calendar) => {
        if (!calendar.externalId) {
          return { calendarId: calendar.id, events: [] };
        }

        try {
          const events = await google.calendar("v3").events.list({
            calendarId: calendar.externalId,
            singleEvents: true,
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            maxResults: 2500,
            auth: oAuthClient,
          });

          // Transform Google Calendar events to Prisma Event format
          const transformedEvents =
            events.data.items
              ?.filter((event) => event.id && event.summary && event.start && event.end)
              .map((event) => ({
                id: `gcal-${calendar.externalId}-${event.id}`, // Include calendar ID to avoid conflicts
                title: event.summary!,
                description: event.description ?? null,
                start: new Date(event.start!.dateTime ?? event.start!.date!),
                end: new Date(event.end!.dateTime ?? event.end!.date!),
                allDay: event.start!.dateTime === undefined && event.end!.dateTime === undefined,
                color: calendar.backgroundColor,
                location: event.location ?? null,
                calendarId: calendar.id,
                taskId: null,
              })) ?? [];

          return { calendarId: calendar.id, events: transformedEvents };
        } catch (error) {
          // If calendar is not found (deleted/unshared), remove it from database
          if (
            typeof error === "object" &&
            error !== null &&
            ("code" in error || "status" in error) &&
            ((error as { code?: number }).code === 404 ||
              (error as { status?: number }).status === 404)
          ) {
            await this.db.calendar.delete({
              where: { id: calendar.id },
            });
          } else {
            console.warn(
              `Failed to fetch events from calendar ${calendar.id}:`,
              error,
            );
          }
          return { calendarId: calendar.id, events: [] };
        }
      }),
    );

    // Build result map
    const resultMap = new Map<string, Omit<Event, "calendar" | "task">[]>();
    
    for (const result of results) {
      if (result.status === "fulfilled") {
        resultMap.set(result.value.calendarId, result.value.events);
      }
    }

    return resultMap;
  }
}
