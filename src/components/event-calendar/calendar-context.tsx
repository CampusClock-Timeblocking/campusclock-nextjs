"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { api } from "@/trpc/react";
import { type Calendar, type Event } from "@prisma/client";
import { addDays } from "date-fns";

interface CalendarContextType {
  // Date management
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // Calendar visibility management
  visibleCalendars: string[];
  toggleCalendarVisibility: (calendarId: string) => void;
  isCalendarVisible: (calendarId: string) => boolean;

  // Calendars
  calendars: Calendar[] | undefined;

  events: Omit<Event, "calendar" | "task">[] | undefined;
}

const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined,
);

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error(
      "useCalendarContext must be used within a CalendarProvider",
    );
  }
  return context;
}

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const { data: calendars } = api.calendar.getAllWithEvents.useQuery({
    start: currentDate,
    end: addDays(currentDate, 30),
  });

  const getAllCalendarsWithEvents =
    api.calendar.getAllCalendarsWithUnifiedEvents.useQuery({
      start: currentDate,
      end: addDays(currentDate, 30),
    });

  const events = React.useMemo(
    () => getAllCalendarsWithEvents.data?.flatMap((cal) => cal.events) ?? [],
    [getAllCalendarsWithEvents.data],
  );

  const [visibleCalendars, setVisibleCalendars] = useState<string[]>([]);
  const hasInitializedVisibleCalendars = useRef(false);

  // Initialize visible calendars when calendars data first loads
  useEffect(() => {
    if (calendars && calendars.length > 0 && !hasInitializedVisibleCalendars.current) {
      setVisibleCalendars(calendars.map((calendar) => calendar.id));
      hasInitializedVisibleCalendars.current = true;
    }
  }, [calendars]);

  const toggleCalendarVisibility = (calendarId: string) => {
    setVisibleCalendars((prev) => {
      if (prev.includes(calendarId)) {
        return prev.filter((id) => id !== calendarId);
      } else {
        return [...prev, calendarId];
      }
    });
  };

  const isCalendarVisible = (calendarId: string) => {
    return visibleCalendars.includes(calendarId);
  };

  const value = {
    currentDate,
    setCurrentDate,
    calendars,
    events,
    isCalendarVisible,
    visibleCalendars,
    toggleCalendarVisibility,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
