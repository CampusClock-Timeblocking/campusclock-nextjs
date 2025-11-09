import { DAVClient, type DAVCalendar, type DAVCalendarObject } from "tsdav";
import ICAL from "ical.js";
import { TRPCError } from "@trpc/server";
import type {
  PrismaClient,
  Event,
  Calendar,
  CalendarAccount,
} from "@prisma/client";
import { CalendarType } from "@prisma/client";
import { CacheService } from "./cache-service";

export interface CalendarEventData {
  externalId: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string | null;
}

export interface CalDAVCalendarData {
  externalId: string;
  name: string;
  url: string;
  displayName?: string;
  color?: string;
}

export class CalDAVService {
  private client: DAVClient;
  private readonly db: PrismaClient;
  private readonly cache: CacheService;

  constructor(
    serverUrl: string,
    username: string,
    password: string,
    db: PrismaClient,
  ) {
    this.client = new DAVClient({
      serverUrl: serverUrl,
      credentials: {
        username: username,
        password: password,
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
    this.db = db;
    this.cache = new CacheService(120); // 2 minutes TTL
  }

  async connect(): Promise<void> {
    try {
      await this.client.login();
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "CalDAV authentication failed. Please check your credentials.",
      });
    }
  }

  async fetchCalendars(): Promise<DAVCalendar[]> {
    try {
      return await this.client.fetchCalendars();
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error fetching calendars.",
      });
    }
  }

  /**
   * Transform DAVCalendar objects to a simplified format
   */
  async getAccountCalendars(): Promise<CalDAVCalendarData[]> {
    const calendars = await this.fetchCalendars();

    return calendars.map((calendar) => {
      const displayName = calendar.displayName;
      const calendarName =
        typeof displayName === "string" ? displayName : "Untitled Calendar";

      return {
        externalId: calendar.url,
        name: calendarName,
        url: calendar.url,
        displayName: typeof displayName === "string" ? displayName : undefined,
        color: this.extractCalendarColor(calendarName),
      };
    });
  }

  /**
   * Extract color from calendar properties
   * Returns a hex color or a default color if none is found
   */
  private extractCalendarColor(calendarName: string): string {
    const colors = [
      "#3B82F6", // blue
      "#10B981", // green
      "#F59E0B", // amber
      "#EF4444", // red
      "#8B5CF6", // violet
      "#EC4899", // pink
      "#06B6D4", // cyan
    ];

    // Return a consistent color based on calendar name hash
    const hash = calendarName.split("").reduce((acc: number, char: string) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length]!;
  }

  /**
   * Sync CalDAV calendars with the database
   */
  async syncCalDAVCalendarAccount(
    userId: string,
    calendarAccountId: string,
  ): Promise<void> {
    const account = await this.getCalDAVCalendarAccount(
      userId,
      calendarAccountId,
    );

    await this.connect();

    const calendars = await this.getAccountCalendars();

    if (!calendars || calendars.length === 0) {
      throw new TRPCError({
        message: "No calendars found",
        code: "NOT_FOUND",
      });
    }

    for (const calendar of calendars) {
      await this.db.calendar.upsert({
        where: {
          userId_calendarAccountId_externalId: {
            userId,
            calendarAccountId: account.id,
            externalId: calendar.externalId,
          },
        },
        update: {
          name: calendar.name,
          backgroundColor: calendar.color ?? "#3B82F6",
          foregroundColor: "#FFFFFF",
          type: CalendarType.EXTERNAL,
          readOnly: true,
        },
        create: {
          userId,
          name: calendar.name,
          backgroundColor: calendar.color ?? "#3B82F6",
          foregroundColor: "#FFFFFF",
          type: CalendarType.EXTERNAL,
          calendarAccountId: account.id,
          externalId: calendar.externalId,
          readOnly: true,
        },
      });
    }

    await this.cache.deletePattern(`calendars:${userId}:week:*`);
  }

  async getCalDAVCalendarAccount(
    userId: string,
    calendarAccountId: string,
  ): Promise<CalendarAccount> {
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

  async fetchEvents(
    calendar: DAVCalendar,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventData[]> {
    try {
      const objects = await this.client.fetchCalendarObjects({
        calendar: calendar,
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });

      return this.parseCalendarObjects(objects);
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error fetching events.",
      });
    }
  }

  /**
   * Get all events from a CalDAV Calendar Account
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

    if (!calendarAccount.encryptedPassword || !calendarAccount.calDavUrl) {
      throw new TRPCError({
        message: "No CalDAV credentials found for calendar account",
        code: "NOT_FOUND",
      });
    }

    try {
      await this.connect();
      const davCalendars = await this.fetchCalendars();

      const davCalendarMap = new Map<string, DAVCalendar>();
      davCalendars.forEach((cal) => {
        davCalendarMap.set(cal.url, cal);
      });

      const results = await Promise.allSettled(
        calendarAccount.calendars.map(async (calendar) => {
          if (!calendar.externalId) {
            return { calendarId: calendar.id, events: [] };
          }

          const davCalendar = davCalendarMap.get(calendar.externalId);
          if (!davCalendar) {
            console.warn(
              `CalDAV calendar not found for externalId: ${calendar.externalId}`,
            );
            return { calendarId: calendar.id, events: [] };
          }

          try {
            const eventData = await this.fetchEvents(davCalendar, start, end);

            const transformedEvents = eventData.map((event) => ({
              id: `caldav-${calendar.externalId}-${event.externalId}`,
              title: event.title,
              description: event.description ?? null,
              start: event.startTime,
              end: event.endTime,
              allDay: event.isAllDay,
              color: calendar.backgroundColor,
              location: event.location ?? null,
              calendarId: calendar.id,
              taskId: null,
            }));

            return { calendarId: calendar.id, events: transformedEvents };
          } catch (error) {
            console.warn(
              `Failed to fetch events from calendar ${calendar.id}:`,
              error,
            );
            return { calendarId: calendar.id, events: [] };
          }
        }),
      );

      const resultMap = new Map<string, Omit<Event, "calendar" | "task">[]>();

      for (const result of results) {
        if (result.status === "fulfilled") {
          resultMap.set(result.value.calendarId, result.value.events);
        }
      }

      return resultMap;
    } catch (error) {
      console.error("Error fetching CalDAV events:", error);
      throw error;
    }
  }

  private parseCalendarObjects(
    objects: DAVCalendarObject[],
  ): CalendarEventData[] {
    const events: CalendarEventData[] = [];

    for (const obj of objects) {
      if (!obj.data) continue;

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
        const jcalData = ICAL.parse(obj.data);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents("vevent");

        for (const vevent of vevents) {
          const event = new ICAL.Event(vevent);

          events.push({
            externalId: event.uid,
            title: event.summary ?? "No Title",
            description: event.description ?? null,
            startTime: event.startDate.toJSDate(),
            endTime: event.endDate.toJSDate(),
            isAllDay: event.startDate.isDate,
            location: event.location ?? null,
          });
        }
      } catch (parseError) {
        console.error("Error parsing calendar object:", parseError);
      }
    }

    return events;
  }
}
