"use client";

import { useMemo } from "react";

import { useCalendarContext } from "@/components/event-calendar/calendar-context";

import {
  EventCalendar,
  type CalendarEvent,
} from "@/components/event-calendar/event-calendar";

export default function Component() {
  const { isCalendarVisible, events } = useCalendarContext();

  // Filter events based on visible calendars
  const visibleEvents = useMemo(() => {
    return events?.filter((event) => isCalendarVisible(event.calendarId));
  }, [events, isCalendarVisible]);

  const handleEventAdd = (event: CalendarEvent) => {
    console.log(events);
    //setEvents([...events, event]);
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    // setEvents(
    //  events.map((event) =>
    //    event.id === updatedEvent.id ? updatedEvent : event,
    //),
    //);
  };

  const handleEventDelete = (eventId: string) => {
    //setEvents(events.filter((event) => event.id !== eventId));
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
