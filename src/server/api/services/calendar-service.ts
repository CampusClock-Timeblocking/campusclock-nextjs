import {
  CalendarType,
  CalendarProvider,
  type PrismaClient,
  type Event,
  type Calendar,
} from "@prisma/client";
import { db as newDbInstance } from "@/server/db";
import { GCalService } from "./g-cal-service";
import { CacheService } from "./cache-service";

export interface CalendarWithEvents extends Calendar {
  events: Omit<Event, "calendar" | "task">[];
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

  async createCalendar(
    userId: string,
    name?: string,
    backgroundColor?: string,
    foregroundColor?: string,
  ) {
    return await this.db.calendar.create({
      data: {
        userId,
        name: name ?? "Main Calendar",
        backgroundColor: backgroundColor ?? "#9a9cff",
        foregroundColor: foregroundColor ?? "#000000",
        type: CalendarType.LOCAL,
        readOnly: false,
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

  async deleteCalendar(
    userId: string,
    calendarId: string,
  ) {
    const calendar = await this.db.calendar.findFirst({
      where: { id: calendarId, userId },
    });

    if (!calendar) {
      throw new Error("Calendar not found");
    }

    if (calendar.type === CalendarType.LOCAL) {
      const allCalendars = await this.db.calendar.findMany({
        where: { userId },
      });

      const countOfLocalCalendars = allCalendars.filter(
        (cal) => cal.type === CalendarType.LOCAL,
      ).length;

      if (countOfLocalCalendars === 1) {
        throw new Error("Cannot delete the only local calendar");
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
   * Handles both local and external calendars with weekly chunk caching
   */
  async getAllCalendarsWithEvents(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<CalendarWithEvents[]> {
    // Always fetch calendar metadata fresh from DB (no caching)
    const calendars = await this.db.calendar.findMany({
      where: { userId },
    });

    // Get all weeks in the requested range
    const weeks = this.getWeeksInRange(start, end);
    
    // Fetch events for each week (cached)
    const allWeekCalendarsData: CalendarWithEvents[][] = [];

    for (const weekStart of weeks) {
      const weekBounds = this.getWeekBounds(weekStart);
      const cacheKey = this.generateWeekKey(userId, weekStart);

      // Try to get from cache first
      const cachedData = await this.cache.get<CalendarWithEvents[]>(cacheKey);

      if (cachedData) {
        allWeekCalendarsData.push(cachedData);
      } else {
        // Cache miss - fetch events for this week
        const weekCalendarsWithEvents: CalendarWithEvents[] = [];

        // Separate local and external calendars
        const localCalendars = calendars.filter(
          (cal) => cal.type === CalendarType.LOCAL,
        );
        const externalCalendars = calendars.filter(
          (cal) => cal.type === CalendarType.EXTERNAL && cal.provider === CalendarProvider.GOOGLE,
        );

        // Fetch local events from DB
        const localEventsPromises = localCalendars.map(async (calendar) => {
          const localEvents = await this.db.event.findMany({
            where: {
              calendarId: calendar.id,
              // Events that overlap with this week
              start: { lt: weekBounds.end },
              end: { gt: weekBounds.start },
            },
          });
          return { calendar, events: localEvents };
        });

        // Fetch external events in parallel
        let externalEventsMap = new Map<string, Omit<Event, "calendar" | "task">[]>();
        if (externalCalendars.length > 0) {
          try {
            externalEventsMap = await this.gCalService.getEventsFromCalendars(
              userId,
              externalCalendars,
              weekBounds.start,
              weekBounds.end,
            );
          } catch (error) {
            console.warn(
              `Failed to fetch events from external calendars:`,
              error,
            );
            // Continue with empty events
          }
        }

        // Wait for all local events to be fetched
        const localResults = await Promise.all(localEventsPromises);

        // Combine local results
        for (const { calendar, events } of localResults) {
          weekCalendarsWithEvents.push({
            ...calendar,
            events,
          });
        }

        // Combine external results
        for (const calendar of externalCalendars) {
          weekCalendarsWithEvents.push({
            ...calendar,
            events: externalEventsMap.get(calendar.id) ?? [],
          });
        }

        // Cache the result for this week
        await this.cache.set(cacheKey, weekCalendarsWithEvents);
        allWeekCalendarsData.push(weekCalendarsWithEvents);
      }
    }

    // Merge all weeks and filter to exact requested date range
    const mergedCalendars = new Map<string, CalendarWithEvents>();

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
    const result: CalendarWithEvents[] = [];
    
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
