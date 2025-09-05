import {
  CalendarType,
  type PrismaClient,
  type Event,
  type Calendar,
  type CalendarAccount,
} from "@prisma/client";
import { db as newDbInstance } from "@/server/db";
import { GCalService } from "./g-cal-service";
import { CalDAVService } from "./caldav.service";
import { CacheService } from "./cache-service";
import { decrypt } from "@/server/lib/encryption";

export interface CalendarWithEventsAndAccount extends Calendar {
  events: Omit<Event, "calendar" | "task">[];
  calendarAccount: CalendarAccount;
}

export class CalendarService {
  private readonly db: PrismaClient;
  private readonly gCalService: GCalService;
  private readonly cache: CacheService;

  constructor(db?: PrismaClient) {
    this.db = db ?? newDbInstance;
    this.gCalService = new GCalService(this.db);
    this.cache = new CacheService(120); // 2 minutes TTL
  }

  /**
   * Get the start and end of the week containing the given date
   * Week runs from Monday 00:00:00 to Sunday 23:59:59.999
   */
  private getWeekBounds(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday

    const start = new Date(d);
    start.setDate(d.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Get all weeks that overlap with the given date range
   */
  private getWeeksInRange(start: Date, end: Date): Date[] {
    const weeks: Date[] = [];
    const current = new Date(start);

    while (current <= end) {
      const weekBounds = this.getWeekBounds(current);
      weeks.push(new Date(weekBounds.start));

      // Move to next week
      current.setDate(current.getDate() + 7);
    }

    return weeks;
  }

  /**
   * Generate cache key for a week of calendar data
   */
  private generateWeekKey(userId: string, weekStart: Date): string {
    return `calendars:${userId}:week:${weekStart.toISOString()}`;
  }

  /**
   * Create a new calendar for a campusClock calendar account
   * Only campusClock calendars can be created manually by users
   */
  async createCalendar(
    userId: string,
    calendarAccountId: string,
    name?: string,
    backgroundColor?: string,
    foregroundColor?: string,
  ) {
    // Verify this is a campusClock account
    const calendarAccount = await this.db.calendarAccount.findFirst({
      where: { id: calendarAccountId, userId },
    });

    if (!calendarAccount) {
      throw new Error("Calendar account not found");
    }

    if (calendarAccount.provider !== "campusclock") {
      throw new Error("Can only create calendars for campusClock accounts");
    }

    return await this.db.calendar.create({
      data: {
        userId,
        name: name ?? "Main Calendar",
        backgroundColor: backgroundColor ?? "#9a9cff",
        foregroundColor: foregroundColor ?? "#000000",
        type: CalendarType.LOCAL,
        readOnly: false,
        calendarAccountId,
      },
    });
  }

  async updateCalendar(
    userId: string,
    calendarId: string,
    name?: string,
    backgroundColor?: string,
    foregroundColor?: string,
  ) {
    const calendar = await this.db.calendar.findFirst({
      where: { id: calendarId, userId },
    });

    if (!calendar) {
      throw new Error("Calendar not found");
    }

    if (calendar.readOnly) {
      throw new Error("Cannot update read-only calendars");
    }

    return await this.db.calendar.update({
      where: { id: calendarId },
      data: {
        name: name ?? calendar.name,
        backgroundColor: backgroundColor ?? calendar.backgroundColor,
        foregroundColor: foregroundColor ?? calendar.foregroundColor,
      },
    });
  }

  async deleteCalendar(userId: string, calendarId: string) {
    const calendar = await this.db.calendar.findFirst({
      where: { id: calendarId, userId },
      include: { calendarAccount: true },
    });

    if (!calendar) {
      throw new Error("Calendar not found");
    }

    // Prevent deletion of the last campusClock calendar
    if (calendar.calendarAccount.provider === "campusclock") {
      const allCalendars = await this.db.calendar.findMany({
        where: { userId },
        include: { calendarAccount: true },
      });

      const countOfCampusClockCalendars = allCalendars.filter(
        (cal) => cal.calendarAccount.provider === "campusclock",
      ).length;

      if (countOfCampusClockCalendars === 1) {
        throw new Error("Cannot delete the only campusClock calendar");
      }
    }

    const deletedCalendar = await this.db.calendar.delete({
      where: { id: calendarId, userId },
    });

    // Invalidate all cached weeks for this user
    // (easier than tracking which weeks had events from this calendar)
    await this.cache.deletePattern(`calendars:${userId}:week:*`);

    return deletedCalendar;
  }

  /**
   * Get all calendars with their events for a user within a date range
   * Groups calendars by provider (campusClock, google, etc.) for efficient fetching
   * Uses weekly chunk caching for performance
   */
  async getAllCalendarsWithEvents(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<CalendarWithEventsAndAccount[]> {
    // Fetch calendar accounts with their calendars
    const calendarAccounts = await this.db.calendarAccount.findMany({
      where: { userId },
      include: { calendars: true },
    });

    // Get all weeks in the requested range
    const weeks = this.getWeeksInRange(start, end);

    // Fetch events for each week (cached)
    const allWeekCalendarsData: CalendarWithEventsAndAccount[][] = [];

    for (const weekStart of weeks) {
      const weekBounds = this.getWeekBounds(weekStart);
      const cacheKey = this.generateWeekKey(userId, weekStart);

      // Try to get from cache first
      const cachedData =
        await this.cache.get<CalendarWithEventsAndAccount[]>(cacheKey);

      if (cachedData) {
        allWeekCalendarsData.push(cachedData);
      } else {
        // Cache miss - fetch events for this week
        const eventsMap = new Map<string, Omit<Event, "calendar" | "task">[]>();

        // Process each calendar account based on provider
        for (const account of calendarAccounts) {
          if (account.provider === "campusclock") {
            // Fetch events from database for each calendar
            for (const calendar of account.calendars) {
              const events = await this.db.event.findMany({
                where: {
                  calendarId: calendar.id,
                  start: { lt: weekBounds.end },
                  end: { gt: weekBounds.start },
                },
              });
              eventsMap.set(calendar.id, events);
            }
          } else if (account.provider === "google") {
            // Fetch events from Google Calendar
            try {
              const accountEventsMap =
                await this.gCalService.getAllEventsFromCalendarAccount(
                  account,
                  weekBounds.start,
                  weekBounds.end,
                );
              // Add to events map
              for (const [calendarId, events] of accountEventsMap) {
                eventsMap.set(calendarId, events);
              }
            } catch (error) {
              console.warn(
                `Failed to fetch events from Google calendar account ${account.id}:`,
                error,
              );
              // Continue with empty events for this account
            }
          } else if (account.provider === "iCloud") {
            // Fetch events from iCloud Calendar via CalDAV
            try {
              if (
                account.email &&
                account.encryptedPassword &&
                account.calDavUrl
              ) {
                const decryptedPassword = decrypt(account.encryptedPassword);
                const caldavService = new CalDAVService(
                  account.calDavUrl,
                  account.email,
                  decryptedPassword,
                  this.db,
                );
                const accountEventsMap =
                  await caldavService.getAllEventsFromCalendarAccount(
                    account,
                    weekBounds.start,
                    weekBounds.end,
                  );
                // Add to events map
                for (const [calendarId, events] of accountEventsMap) {
                  eventsMap.set(calendarId, events);
                }
              }
            } catch (error) {
              console.warn(
                `Failed to fetch events from iCloud calendar account ${account.id}:`,
                error,
              );
              // Continue with empty events for this account
            }
          }
          // Future providers (Outlook, etc.) can be added here
        }

        // Flatten to calendar-centric view with events
        const weekCalendarsWithEvents: CalendarWithEventsAndAccount[] = [];
        for (const account of calendarAccounts) {
          for (const calendar of account.calendars) {
            weekCalendarsWithEvents.push({
              ...calendar,
              events: eventsMap.get(calendar.id) ?? [],
              calendarAccount: account,
            });
          }
        }

        // Cache the result for this week
        await this.cache.set(cacheKey, weekCalendarsWithEvents);
        allWeekCalendarsData.push(weekCalendarsWithEvents);
      }
    }

    // Merge all weeks and filter to exact requested date range
    const mergedCalendars = new Map<string, CalendarWithEventsAndAccount>();

    for (const weekData of allWeekCalendarsData) {
      for (const calendarData of weekData) {
        if (!mergedCalendars.has(calendarData.id)) {
          mergedCalendars.set(calendarData.id, {
            ...calendarData,
            events: [],
          });
        }

        const merged = mergedCalendars.get(calendarData.id)!;
        merged.events.push(...calendarData.events);
      }
    }

    // Filter events to exact requested date range and remove duplicates
    const result: CalendarWithEventsAndAccount[] = [];

    for (const calendar of mergedCalendars.values()) {
      // Filter to exact date range
      const filteredEvents = calendar.events.filter(
        (event) => event.start < end && event.end > start,
      );

      // Remove duplicates (events might appear in multiple weeks)
      const uniqueEvents = Array.from(
        new Map(filteredEvents.map((event) => [event.id, event])).values(),
      );

      // Sort by start date
      uniqueEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

      result.push({
        ...calendar,
        events: uniqueEvents,
      });
    }

    return result;
  }

  /**
   * Get all events for a user within a date range from all calendars
   * Returns a flattened array of events
   */
  async getAllEventsForUser(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Omit<Event, "calendar" | "task">[]> {
    const calendarsWithEvents = await this.getAllCalendarsWithEvents(
      userId,
      start,
      end,
    );
    return calendarsWithEvents.flatMap((calendar) => calendar.events);
  }
}
