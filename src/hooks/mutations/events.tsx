"use client";
import { api } from "@/trpc/react";
import { toast } from "sonner";

interface QueryInput {
  startDate: Date;
  endDate: Date;
}

export function useCreateEventMutation({ startDate, endDate }: QueryInput) {
  const utils = api.useUtils();
  return api.calendar.createEvent.useMutation({
    onMutate: async (newEvent) => {
      const queryInput = { start: startDate, end: endDate };
      await utils.calendar.getAllCalendarsWithUnifiedEvents.cancel();

      const previousData =
        utils.calendar.getAllCalendarsWithUnifiedEvents.getData(queryInput);

      utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
        queryInput,
        (prev) => {
          if (!prev) return prev;
          return prev.map((calendar) => {
            if (calendar.id === newEvent.calendarId) {
              return {
                ...calendar,
                events: [
                  ...calendar.events,
                  {
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

      return { previousData, queryInput };
    },
    onError: (error, _newEvent, context) => {
      if (context?.previousData) {
        utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
          context.queryInput,
          context.previousData,
        );
      }
      toast.error("Failed to create event", {
        description: error.message,
        position: "bottom-right",
      });
    },
    onSettled: () => {
      void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
      void utils.calendar.getAllUnifiedEvents.invalidate();
      void utils.calendar.getAllWithEvents.invalidate();
    },
  });
}

export function useUpdateEventMutation({ startDate, endDate }: QueryInput) {
  const utils = api.useUtils();
  return api.calendar.updateEvent.useMutation({
    onMutate: async (updatedEvent) => {
      const queryInput = { start: startDate, end: endDate };
      await utils.calendar.getAllCalendarsWithUnifiedEvents.cancel();

      const previousData =
        utils.calendar.getAllCalendarsWithUnifiedEvents.getData(queryInput);

      utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
        queryInput,
        (prev) => {
          if (!prev) return prev;
          return prev.map((calendar) => ({
            ...calendar,
            events: calendar.events.map((event) =>
              event.id === updatedEvent.id
                ? {
                    ...event,
                    title: updatedEvent.title ?? event.title,
                    description: updatedEvent.description ?? event.description,
                    start:
                      (updatedEvent.start as Date | undefined) ?? event.start,
                    end: (updatedEvent.end as Date | undefined) ?? event.end,
                    allDay: updatedEvent.allDay ?? event.allDay,
                    color: updatedEvent.color ?? event.color,
                    location: updatedEvent.location ?? event.location,
                    calendarId: updatedEvent.calendarId ?? event.calendarId,
                    taskId: updatedEvent.taskId ?? event.taskId,
                  }
                : event,
            ),
          }));
        },
      );

      return { previousData, queryInput };
    },
    onError: (error, _newEvent, context) => {
      if (context?.previousData) {
        utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
          context.queryInput,
          context.previousData,
        );
      }
      toast.error("Failed to update event", {
        description: error.message,
        position: "bottom-right",
      });
    },
    onSettled: () => {
      void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
      void utils.calendar.getAllUnifiedEvents.invalidate();
      void utils.calendar.getAllWithEvents.invalidate();
    },
  });
}

export function useDeleteEventMutation({ startDate, endDate }: QueryInput) {
  const utils = api.useUtils();
  return api.calendar.deleteEvent.useMutation({
    onMutate: async (deletedEvent) => {
      const queryInput = { start: startDate, end: endDate };
      await utils.calendar.getAllCalendarsWithUnifiedEvents.cancel();

      const previousData =
        utils.calendar.getAllCalendarsWithUnifiedEvents.getData(queryInput);

      utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
        queryInput,
        (prev) => {
          if (!prev) return prev;
          return prev.map((calendar) => ({
            ...calendar,
            events: calendar.events.filter(
              (event) => event.id !== deletedEvent.id,
            ),
          }));
        },
      );

      return { previousData, queryInput };
    },
    onError: (error, _newEvent, context) => {
      if (context?.previousData) {
        utils.calendar.getAllCalendarsWithUnifiedEvents.setData(
          context.queryInput,
          context.previousData,
        );
      }
      toast.error("Failed to update event", {
        description: error.message,
        position: "bottom-right",
      });
    },
    onSettled: () => {
      void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
      void utils.calendar.getAllUnifiedEvents.invalidate();
      void utils.calendar.getAllWithEvents.invalidate();
    },
  });
}
