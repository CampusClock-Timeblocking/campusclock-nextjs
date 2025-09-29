import {
  CalendarType,
  CalendarProvider,
  type PrismaClient,
  type Event,
  type Calendar,
} from "@prisma/client";
import { db as newDbInstance } from "@/server/db";
import { GCalService } from "./g-cal-service";

export interface CalendarWithEvents extends Calendar {
  events: Omit<Event, "calendar" | "task">[];
}

export class CalendarService {
  private readonly db: PrismaClient;
  private readonly gCalService: GCalService;

  constructor(db?: PrismaClient) {
    this.db = db ?? newDbInstance;
    this.gCalService = new GCalService(this.db);
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

    return await this.db.calendar.delete({
      where: { id: calendarId, userId },
    });
  }

  /**
   * Get all calendars with their events for a user within a date range
   * Handles both local and external calendars
   */
  async getAllCalendarsWithEvents(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<CalendarWithEvents[]> {
    // Get all user calendars
    const calendars = await this.db.calendar.findMany({
      where: { userId },
      include: {
        Event: {
          where: {
            start: { gte: start },
            end: { lte: end },
          },
        },
      },
    });

    const calendarsWithEvents: CalendarWithEvents[] = [];

    for (const calendar of calendars) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { Event: _, ...calendarWithoutRelations } = calendar;

      if (calendar.type === CalendarType.LOCAL) {
        // Handle local calendars - events are already in correct format
        calendarsWithEvents.push({
          ...calendarWithoutRelations,
          events: calendar.Event,
        });
      } else if (calendar.type === CalendarType.EXTERNAL) {
        // Handle external calendars
        let externalEvents: Omit<Event, "calendar" | "task">[] = [];

        try {
          if (
            calendar.provider === CalendarProvider.GOOGLE &&
            calendar.externalId
          ) {
            externalEvents = await this.gCalService.getEventsFromCalendar(
              userId,
              calendar.externalId,
              calendar,
              start,
              end,
            );
          }
          // Add more providers here as needed (e.g., Outlook, Apple Calendar)
        } catch (error) {
          console.warn(
            `Failed to fetch events from external calendar ${calendar.id}:`,
            error,
          );
          // Continue with empty events array
        }

        calendarsWithEvents.push({
          ...calendarWithoutRelations,
          events: externalEvents,
        });
      }
    }

    return calendarsWithEvents;
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
