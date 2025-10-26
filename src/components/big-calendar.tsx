"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { useMemo } from "react";
import { addMonths, subMonths } from "date-fns";

import { useCalendarContext } from "@/components/event-calendar/calendar-context";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { CalendarWithEvents } from "@/server/api/services/calendar-service";

import {
  EventCalendar,
  type CalendarEvent,
} from "@/components/event-calendar/event-calendar";

export default function Component() {
  const { isCalendarVisible, events, currentDate, calendars } = useCalendarContext();
  const utils = api.useUtils();

  // Calculate query parameters for optimistic updates (same as calendar context)
  const startDate = subMonths(currentDate, 1);
  const endDate = addMonths(currentDate, 2);
  const queryInput = { start: startDate, end: endDate };

  // tRPC mutations with optimistic updates
  const createEventMutation = api.calendar.createEvent.useMutation({
    onMutate: async (newEvent) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await utils.calendar.getAllCalendarsWithUnifiedEvents.cancel();

      // Snapshot the previous value
      const previousData = utils.calendar.getAllCalendarsWithUnifiedEvents.getData(queryInput);

      // Optimistically update the cache
      utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
        queryInput,
        (old: CalendarWithEvents[] | undefined): CalendarWithEvents[] | undefined => {
          if (!old) return old;
          
          // Find the calendar this event belongs to and add the event
          return old.map((calendar): CalendarWithEvents => {
            if (calendar.id === newEvent.calendarId) {
              return {
                ...calendar,
                events: [
                  ...calendar.events,
                  {
                    // Temporary ID for optimistic update
                    id: `temp-${Date.now()}`,
                    title: newEvent.title,
                    description: newEvent.description ?? null,
                    start: newEvent.start as Date,
                    end: newEvent.end as Date,
                    allDay: newEvent.allDay ?? false,
                    color: newEvent.color ?? "blue",
                    location: newEvent.location ?? null,
                    calendarId: newEvent.calendarId,
                    taskId: newEvent.taskId ?? null,
                  },
                ],
              };
            }
            return calendar;
          });
        },
      );

      // Return context object with the snapshot
      return { previousData };
    },
    onError: (error: { message: string }, _newEvent, context) => {
      // If the mutation fails, roll back to the previous value
      if (context?.previousData) {
        utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
          queryInput,
          context.previousData as CalendarWithEvents[] | undefined
        );
      }
      toast.error("Failed to create event", {
        description: error.message,
        position: "bottom-left",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to sync with server
      void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
      void utils.calendar.getAllUnifiedEvents.invalidate();
      void utils.calendar.getAllWithEvents.invalidate();
    },
  });

  const updateEventMutation = api.calendar.updateEvent.useMutation({
    onMutate: async (updatedEvent) => {
      // Cancel any outgoing refetches
      await utils.calendar.getAllCalendarsWithUnifiedEvents.cancel();

      // Snapshot the previous value
      const previousData = utils.calendar.getAllCalendarsWithUnifiedEvents.getData(queryInput);

      // Optimistically update the cache
      utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
        queryInput,
        (old: CalendarWithEvents[] | undefined): CalendarWithEvents[] | undefined => {
          if (!old) return old;
          
          return old.map((calendar): CalendarWithEvents => ({
            ...calendar,
            events: calendar.events.map((event) =>
              event.id === updatedEvent.id
                ? {
                    ...event,
                    title: updatedEvent.title ?? event.title,
                    description: updatedEvent.description !== undefined ? updatedEvent.description : event.description,
                    start: (updatedEvent.start as Date | undefined) ?? event.start,
                    end: (updatedEvent.end as Date | undefined) ?? event.end,
                    allDay: updatedEvent.allDay ?? event.allDay,
                    color: updatedEvent.color ?? event.color,
                    location: updatedEvent.location !== undefined ? updatedEvent.location : event.location,
                    calendarId: updatedEvent.calendarId ?? event.calendarId,
                    taskId: updatedEvent.taskId !== undefined ? updatedEvent.taskId : event.taskId,
                  }
                : event
            ),
          }));
        },
      );

      return { previousData };
    },
    onError: (error: { message: string }, _updatedEvent, context) => {
      // Roll back to previous value on error
      if (context?.previousData) {
        utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
          queryInput,
          context.previousData as CalendarWithEvents[] | undefined
        );
      }
      toast.error("Failed to update event", {
        description: error.message,
        position: "bottom-left",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
      void utils.calendar.getAllUnifiedEvents.invalidate();
      void utils.calendar.getAllWithEvents.invalidate();
    },
  });

  const deleteEventMutation = api.calendar.deleteEvent.useMutation({
    onMutate: async (deletedEvent) => {
      // Cancel any outgoing refetches
      await utils.calendar.getAllCalendarsWithUnifiedEvents.cancel();

      // Snapshot the previous value
      const previousData = utils.calendar.getAllCalendarsWithUnifiedEvents.getData(queryInput);

      // Optimistically remove the event from the cache
      utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
        queryInput,
        (old: CalendarWithEvents[] | undefined): CalendarWithEvents[] | undefined => {
          if (!old) return old;
          
          return old.map((calendar): CalendarWithEvents => ({
            ...calendar,
            events: calendar.events.filter((event) => event.id !== deletedEvent.id),
          }));
        },
      );

      return { previousData };
    },
    onError: (error: { message: string }, _deletedEvent, context) => {
      // Roll back to previous value on error
      if (context?.previousData) {
        utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
          queryInput,
          context.previousData as CalendarWithEvents[] | undefined
        );
      }
      toast.error("Failed to delete event", {
        description: error.message,
        position: "bottom-left",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
      void utils.calendar.getAllUnifiedEvents.invalidate();
      void utils.calendar.getAllWithEvents.invalidate();
    },
  });

  // Filter events based on visible calendars and apply calendar colors
  const visibleEvents = useMemo(() => {
    const calendarColorMap = new Map(
      calendars?.map((cal) => [cal.id, cal.backgroundColor])
    );
    
    return events
      ?.filter((event) => isCalendarVisible(event.calendarId))
      .map((event) => ({
        ...event,
        color: calendarColorMap.get(event.calendarId) ?? event.color,
      }));
  }, [events, isCalendarVisible, calendars]);

  const handleEventAdd = (event: CalendarEvent) => {
    createEventMutation.mutate({
      title: event.title,
      description: event.description ?? undefined,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      color: event.color,
      location: event.location ?? undefined,
      calendarId: event.calendarId,
      taskId: event.taskId ?? undefined,
    });
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    updateEventMutation.mutate({
      id: updatedEvent.id,
      title: updatedEvent.title,
      description: updatedEvent.description ?? undefined,
      start: updatedEvent.start,
      end: updatedEvent.end,
      allDay: updatedEvent.allDay,
      color: updatedEvent.color,
      location: updatedEvent.location ?? undefined,
      calendarId: updatedEvent.calendarId,
      taskId: updatedEvent.taskId ?? undefined,
    });
  };

  const handleEventDelete = (eventId: string) => {
    deleteEventMutation.mutate({ id: eventId });
  };

  return (
    <EventCalendar
      events={visibleEvents}
      onEventAdd={handleEventAdd}
      onEventUpdate={handleEventUpdate}
      onEventDelete={handleEventDelete}
      initialView="week"
    />
  );
}
