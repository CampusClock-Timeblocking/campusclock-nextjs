export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  location: string | null;
  calendarId: string;
  taskId: string | null;
}

export type EventColor = "blue" | "orange" | "violet" | "rose" | "emerald";
