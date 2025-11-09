import { env } from "@/env";
import type {
  PrismaClient,
  Event,
  Calendar,
  CalendarAccount,
} from "@prisma/client";
import { google } from "googleapis";
import { TRPCError } from "@trpc/server";
import { CalendarType } from "@prisma/client";
import { CacheService } from "./cache-service";

export class GCalService {
  private readonly db: PrismaClient;
  private readonly cache: CacheService;

  constructor(db: PrismaClient) {
    this.db = db;
    this.cache = new CacheService(120); // 2 minutes TTL
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      env.GOOGLE_CALENDAR_CLIENT_ID,
      env.GOOGLE_CALENDAR_CLIENT_SECRET,
    );
  }

  /**
   * Create an OAuth client with automatic token refresh for a calendar account
   */
  private async getValidOAuthClient(account: CalendarAccount) {
    const oAuthClient = this.createOAuthClient();

    // Validate that we have the necessary tokens
    if (!account.accessToken) {
      throw new TRPCError({
        message: "No access token found for calendar account",
        code: "UNAUTHORIZED",
      });
    }

    if (!account.refreshToken) {
      throw new TRPCError({
        message:
          "No refresh token found for calendar account. Please reconnect your Google Calendar.",
        code: "UNAUTHORIZED",
      });
    }

    oAuthClient.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    // Check if token is expired or expires soon (5 minutes buffer)
    const now = new Date();
    const expiresAt = account.expiresAt;

    if (!expiresAt || expiresAt <= new Date(now.getTime() + 5 * 60 * 1000)) {
      try {
        const { credentials } = await oAuthClient.refreshAccessToken();

        await this.db.calendarAccount.update({
          where: { id: account.id },
          data: {
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token ?? account.refreshToken,
            expiresAt: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : null,
          },
        });

        oAuthClient.setCredentials(credentials);
      } catch (error) {
        throw new TRPCError({
          message: `Failed to refresh access token: ${error instanceof Error ? error.message : "Unknown error"}`,
          code: "UNAUTHORIZED",
          cause: error,
        });
      }
    }

    return oAuthClient;
  }

  async syncGoogleCalendarAccount(userId: string, calendarAccountId: string) {
    const account = await this.getGoogleCalendarAccount(
      userId,
      calendarAccountId,
    );

    const calendars = await this.getAccountCalendars(account);

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
          userId_calendarAccountId_externalId: {
            userId,
            calendarAccountId: account.id,
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
          calendarAccountId: account.id,
          externalId: calendar.id,
          readOnly: true,
        },
      });
    }
    await this.cache.deletePattern(`calendars:${userId}:week:*`);
  }

  async getGoogleCalendarAccount(userId: string, calendarAccountId: string) {
    const account = await this.db.calendarAccount.findUnique({
      where: { id: calendarAccountId, userId },
    });

    if (!account) {
      throw new TRPCError({
        message: "Calendar account not found",
        code: "NOT_FOUND",
      });
    }

    return account;
  }

  async getAccountCalendars(account: CalendarAccount) {
    const oAuthClient = await this.getValidOAuthClient(account);

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
   * Get all events from a Google Calendar Account
   * Returns a map of calendarId -> events for all calendars in the account
   */
  async getAllEventsFromCalendarAccount(
    calendarAccount: CalendarAccount & { calendars: Calendar[] },
    start: Date,
    end: Date,
  ): Promise<Map<string, Omit<Event, "calendar" | "task">[]>> {
    if (calendarAccount.calendars.length === 0) {
      return new Map();
    }

    if (!calendarAccount.accessToken || !calendarAccount.refreshToken) {
      throw new TRPCError({
        message: "No access token found for calendar account",
        code: "NOT_FOUND",
      });
    }

    const oAuthClient = await this.getValidOAuthClient(calendarAccount);

    // Fetch all calendars in parallel
    const results = await Promise.allSettled(
      calendarAccount.calendars.map(async (calendar) => {
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
              ?.filter(
                (event) =>
                  event.id && event.summary && event.start && event.end,
              )
              .map((event) => ({
                id: `gcal-${calendar.externalId}-${event.id}`, // Include calendar ID to avoid conflicts
                title: event.summary!,
                description: event.description ?? null,
                start: new Date(event.start!.dateTime ?? event.start!.date!),
                end: new Date(event.end!.dateTime ?? event.end!.date!),
                allDay:
                  event.start!.dateTime === undefined &&
                  event.end!.dateTime === undefined,
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
