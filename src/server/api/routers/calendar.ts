import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { GCalService } from "@/server/api/services/g-cal-service";
import { CalendarType } from "@prisma/client";
import { CalendarService } from "@/server/api/services/calendar-service";
import { EventService } from "@/server/api/services/event-service";
import {
  CreateEventSchema,
  UpdateEventSchema,
} from "@/lib/zod";

export const calendarRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const calendars = await ctx.db.calendar.findMany({
      where: { userId: ctx.session.user.id },
    });
    const hasLocalCalendar = calendars.some(
      (calendar) => calendar.type === CalendarType.LOCAL,
    );
    if (!hasLocalCalendar) {
      const calendarService = new CalendarService(ctx.db);
      await calendarService.createCalendar(ctx.session.user.id);
    }
    return calendars;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        backgroundColor: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
        foregroundColor: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const calendarService = new CalendarService(ctx.db);
      return await calendarService.createCalendar(
        ctx.session.user.id,
        input.name,
        input.backgroundColor,
        input.foregroundColor,
      );
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50),
        backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i),
        foregroundColor: z.string().regex(/^#[0-9A-F]{6}$/i),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const calendarService = new CalendarService(ctx.db);
      return await calendarService.updateCalendar(
        ctx.session.user.id,
        input.id,
        input.name,
        input.backgroundColor,
        input.foregroundColor,
      );
    }),

  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const calendarService = new CalendarService(ctx.db);
      return await calendarService.deleteCalendar(
        ctx.session.user.id,
        input.id,
      );
    }),

  getAllWithEvents: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      }),
    )
    .query(async ({ ctx }) => {
      return await ctx.db.calendar.findMany({
        where: { userId: ctx.session.user.id },
        include: {
          Event: true,
        },
      });
    }),

  importGoogleCalendars: protectedProcedure.mutation(async ({ ctx }) => {
    const gCalService = new GCalService(ctx.db);
    return await gCalService.syncGoogleCalendars(ctx.session.user.id);
  }),

  // New unified endpoints
  getAllCalendarsWithUnifiedEvents: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const calendarService = new CalendarService(ctx.db);
      return await calendarService.getAllCalendarsWithEvents(
        ctx.session.user.id,
        input.start,
        input.end,
      );
    }),

  getAllUnifiedEvents: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const calendarService = new CalendarService(ctx.db);
      return await calendarService.getAllEventsForUser(
        ctx.session.user.id,
        input.start,
        input.end,
      );
    }),

  // Event management endpoints
  createEvent: protectedProcedure
    .input(CreateEventSchema)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.db);
      return await eventService.createEvent(ctx.session.user.id, input);
    }),

  updateEvent: protectedProcedure
    .input(UpdateEventSchema)
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.db);
      return await eventService.updateEvent(ctx.session.user.id, input);
    }),

  deleteEvent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.db);
      return await eventService.deleteEvent(ctx.session.user.id, input.id);
    }),

  getEvent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const eventService = new EventService(ctx.db);
      return await eventService.getEvent(ctx.session.user.id, input.id);
    }),
});
