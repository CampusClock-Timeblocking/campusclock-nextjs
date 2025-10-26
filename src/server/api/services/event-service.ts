import { type PrismaClient, type Event } from "@prisma/client";
import { db as newDbInstance } from "@/server/db";
import {
  type CreateEventInput,
  type UpdateEventInput,
} from "@/lib/zod";
import { CacheService } from "./cache-service";

export class EventService {
  private readonly db: PrismaClient;
  private readonly cache: CacheService;

  constructor(db?: PrismaClient) {
    this.db = db ?? newDbInstance;
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
   * Generate cache key for a week of events
   */
  private generateWeekKey(userId: string, weekStart: Date): string {
    return `events:${userId}:week:${weekStart.toISOString()}`;
  }

  /**
   * Invalidate cache for all weeks that overlap with the given date range
   * Invalidates both event-specific cache and calendar-with-events cache
   */
  private async invalidateEventWeeks(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<void> {
    const weeks = this.getWeeksInRange(start, end);
    await Promise.all(
      weeks.map((weekStart) =>
        this.cache.delete(this.generateWeekKey(userId, weekStart)),
      ),
    );
    
    // Also invalidate calendar service cache (uses different key pattern)
    await Promise.all(
      weeks.map((weekStart) =>
        this.cache.delete(`calendars:${userId}:week:${weekStart.toISOString()}`),
      ),
    );
  }

  /**
   * Create a new event
   */
  async createEvent(
    userId: string,
    input: CreateEventInput,
  ): Promise<Event> {
    // Verify that the calendar belongs to the user
    const calendar = await this.db.calendar.findFirst({
      where: {
        id: input.calendarId,
        userId,
      },
    });

    if (!calendar) {
      throw new Error("Calendar not found or does not belong to user");
    }

    // Check if calendar is read-only
    if (calendar.readOnly) {
      throw new Error("Cannot create events in read-only calendars");
    }

    // Create the event
    const event = await this.db.event.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        start: input.start,
        end: input.end,
        allDay: input.allDay ?? false,
        color: input.color ?? "blue",
        location: input.location ?? null,
        calendarId: input.calendarId,
        taskId: input.taskId ?? null,
      },
    });

    // Invalidate cache for affected weeks
    await this.invalidateEventWeeks(userId, event.start, event.end);

    return event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    userId: string,
    input: UpdateEventInput,
  ): Promise<Event> {
    // Find the event and verify it belongs to user's calendar
    const existingEvent = await this.db.event.findFirst({
      where: {
        id: input.id,
        calendar: {
          userId,
        },
      },
      include: {
        calendar: true,
      },
    });

    if (!existingEvent) {
      throw new Error("Event not found or does not belong to user");
    }

    // Check if calendar is read-only
    if (existingEvent.calendar.readOnly) {
      throw new Error("Cannot update events in read-only calendars");
    }

    // If calendarId is being changed, verify the new calendar
    if (input.calendarId && input.calendarId !== existingEvent.calendarId) {
      const newCalendar = await this.db.calendar.findFirst({
        where: {
          id: input.calendarId,
          userId,
        },
      });

      if (!newCalendar) {
        throw new Error("Target calendar not found or does not belong to user");
      }

      if (newCalendar.readOnly) {
        throw new Error("Cannot move events to read-only calendars");
      }
    }

    // Update the event
    const updatedEvent = await this.db.event.update({
      where: {
        id: input.id,
      },
      data: {
        title: input.title ?? existingEvent.title,
        description: input.description ?? existingEvent.description,
        start: input.start ?? existingEvent.start,
        end: input.end ?? existingEvent.end,
        allDay: input.allDay ?? existingEvent.allDay,
        color: input.color ?? existingEvent.color,
        location: input.location ?? existingEvent.location,
        calendarId: input.calendarId ?? existingEvent.calendarId,
        taskId: input.taskId ?? existingEvent.taskId,
      },
    });

    // Invalidate cache for old event weeks
    await this.invalidateEventWeeks(userId, existingEvent.start, existingEvent.end);

    // If dates changed, also invalidate new event weeks
    if (
      updatedEvent.start.getTime() !== existingEvent.start.getTime() ||
      updatedEvent.end.getTime() !== existingEvent.end.getTime()
    ) {
      await this.invalidateEventWeeks(userId, updatedEvent.start, updatedEvent.end);
    }

    return updatedEvent;
  }

  /**
   * Delete an event
   */
  async deleteEvent(userId: string, eventId: string): Promise<Event> {
    // Find the event and verify it belongs to user's calendar
    const existingEvent = await this.db.event.findFirst({
      where: {
        id: eventId,
        calendar: {
          userId,
        },
      },
      include: {
        calendar: true,
      },
    });

    if (!existingEvent) {
      throw new Error("Event not found or does not belong to user");
    }

    // Check if calendar is read-only
    if (existingEvent.calendar.readOnly) {
      throw new Error("Cannot delete events from read-only calendars");
    }

    // Delete the event
    const deletedEvent = await this.db.event.delete({
      where: {
        id: eventId,
      },
    });

    // Invalidate cache for affected weeks
    await this.invalidateEventWeeks(userId, existingEvent.start, existingEvent.end);

    return deletedEvent;
  }

  /**
   * Get a single event by ID
   */
  async getEvent(userId: string, eventId: string): Promise<Event | null> {
    return await this.db.event.findFirst({
      where: {
        id: eventId,
        calendar: {
          userId,
        },
      },
    });
  }

  /**
   * Get all events for a user within a date range
   */
  async getEventsForUser(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Event[]> {
    return await this.db.event.findMany({
      where: {
        calendar: {
          userId,
        },
        // Include events that overlap with the date range
        // An event overlaps if: start < rangeEnd AND end > rangeStart
        start: { lt: end },
        end: { gt: start },
      },
      orderBy: {
        start: "asc",
      },
    });
  }

  /**
   * Get all events for a user within a date range with caching
   * Uses weekly chunks to optimize cache hits
   */
  async getEventsForUserCached(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<Event[]> {
    const weeks = this.getWeeksInRange(start, end);
    const allEvents: Event[] = [];

    // Fetch each week (from cache or DB)
    for (const weekStart of weeks) {
      const weekBounds = this.getWeekBounds(weekStart);
      const cacheKey = this.generateWeekKey(userId, weekStart);

      // Try to get from cache first
      const cachedEvents = await this.cache.get<Event[]>(cacheKey);

      if (cachedEvents) {
        allEvents.push(...cachedEvents);
      } else {
        // Cache miss - fetch from DB for this week
        const weekEvents = await this.db.event.findMany({
          where: {
            calendar: {
              userId,
            },
            // Get events that overlap with this week
            start: { lt: weekBounds.end },
            end: { gt: weekBounds.start },
          },
          orderBy: {
            start: "asc",
          },
        });

        // Cache the result
        await this.cache.set(cacheKey, weekEvents);
        allEvents.push(...weekEvents);
      }
    }

    // Filter to exact requested date range
    const filteredEvents = allEvents.filter(
      (event) => event.start < end && event.end > start,
    );

    // Remove duplicates (an event might appear in multiple weeks)
    const uniqueEvents = Array.from(
      new Map(filteredEvents.map((event) => [event.id, event])).values(),
    );

    // Sort by start date
    return uniqueEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
}

