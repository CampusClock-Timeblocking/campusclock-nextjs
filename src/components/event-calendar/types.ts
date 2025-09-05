import type { Event } from "@prisma/client";
export type CalendarView = "month" | "week" | "day" | "agenda";
export type CalendarEvent = Event;

export type EventColor = "blue" | "orange" | "violet" | "rose" | "emerald";
