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
import {
  addWeeks,
  endOfMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
} from "date-fns";
import type { CalendarView } from "@/components/event-calendar/types";

interface CalendarContextType {
  // Date management
  currentDate: Date;
  setCurrentDate: (date: Date) => void;

  // View management
  view: CalendarView;
  setView: (view: CalendarView) => void;

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
  const [currentDate, setCurrentDate] = useState<Date>(
    startOfWeek(startOfDay(new Date()), { weekStartsOn: 1 }),
  );
  const [view, setView] = useState<CalendarView>("week");

  // Calculate date range based on view for efficient caching
  // With weekly chunk caching, we can be more precise and let cache handle the rest
  const dateRange = React.useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

    switch (view) {
      case "day":
        // Current week + 1 week buffer on each side for smooth navigation
        return {
          startDate: addWeeks(weekStart, -1),
          endDate: addWeeks(weekEnd, 1),
        };

      case "week":
        // Current week + 1 week buffer on each side
        return {
          startDate: addWeeks(weekStart, -1),
          endDate: addWeeks(weekEnd, 1),
        };

      case "month":
        // Current month + 1 month buffer on each side
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          startDate: addMonths(monthStart, -1),
          endDate: addMonths(monthEnd, 1),
        };

      case "agenda":
        // Next 4 weeks from current date
        return {
          startDate: weekStart,
          endDate: addWeeks(weekStart, 4),
        };

      default:
        // Fallback to week view range
        return {
          startDate: addWeeks(weekStart, -1),
          endDate: addWeeks(weekEnd, 1),
        };
    }
  }, [currentDate, view]);

  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  const { data: calendars } = api.calendar.getAllWithEvents.useQuery(
    {
      start: startDate,
      end: endDate,
    },
    {
      // Keep showing previous data while fetching new data
      placeholderData: (previousData) => previousData,
      // Consider data fresh for 2 minutes (matches Redis cache TTL)
      staleTime: 2 * 60 * 1000, // 2 minutes
      // Keep inactive data in cache for 5 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
  );

  const getAllCalendarsWithEvents =
    api.calendar.getAllCalendarsWithUnifiedEvents.useQuery(
      {
        start: startDate,
        end: endDate,
      },
      {
        // Keep showing previous data while fetching new data
        placeholderData: (previousData) => previousData,
        // Consider data fresh for 2 minutes (matches Redis cache TTL)
        staleTime: 2 * 60 * 1000, // 2 minutes
        // Keep inactive data in cache for 5 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
      },
    );

  const events = React.useMemo(
    () => getAllCalendarsWithEvents.data?.flatMap((cal) => cal.events) ?? [],
    [getAllCalendarsWithEvents.data],
  );

  const [visibleCalendars, setVisibleCalendars] = useState<string[]>([]);
  const hasInitializedVisibleCalendars = useRef(false);

  // Initialize visible calendars when calendars data first loads
  useEffect(() => {
    if (
      calendars &&
      calendars.length > 0 &&
      !hasInitializedVisibleCalendars.current
    ) {
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
    view,
    setView,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}
