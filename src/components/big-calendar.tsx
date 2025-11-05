"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { useMemo } from "react";

import { useCalendarContext } from "@/components/event-calendar/calendar-context";

import {
  EventCalendar,
  type CalendarEvent,
} from "@/components/event-calendar/event-calendar";
import {
  useCreateEventMutation,
  useDeleteEventMutation,
  useUpdateEventMutation,
} from "@/hooks/mutations/events";

export default function Component() {
  const { isCalendarVisible, events, calendars, startDate, endDate } =
    useCalendarContext();

  const queryInput = { startDate, endDate };

  const createEventMutation = useCreateEventMutation(queryInput);
  const updateEventMutation = useUpdateEventMutation(queryInput);
  const deleteEventMutation = useDeleteEventMutation(queryInput);

  // Filter events based on visible calendars and apply calendar colors
  const visibleEvents = useMemo(() => {
    const calendarColorMap = new Map(
      calendars?.map((cal) => [cal.id, cal.backgroundColor]),
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
