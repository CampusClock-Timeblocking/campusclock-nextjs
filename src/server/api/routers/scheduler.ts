/**
 * Scheduler tRPC Router
 * Exposes scheduling functionality via tRPC API
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { SchedulerService } from "../services/scheduler-service";
import {
  SchedulePreviewService,
  type PreviewEventSnapshot,
} from "../services/schedule-preview-service";
import { explainScheduledTasks } from "../services/explain-service";
import { parseScheduleFeedback } from "../services/chat-schedule-service";
import { computeTaskDebugInfo } from "@/server/lib/scheduler/ea-core";
import { getOpenAIClient } from "@/server/lib/openai";
import { EventService } from "../services/event-service";

const previewEventSchema = z.object({
  taskId: z.string().uuid(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  title: z.string(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

const previewEventsSchema = z.array(previewEventSchema);

function parsePreviewEvents(payload: unknown): PreviewEventSnapshot[] {
  return previewEventsSchema.parse(payload);
}

export const schedulerRouter = createTRPCRouter({
  /**
   * Generate a preview schedule and persist a preview session.
   */
  schedulePreview: protectedProcedure
    .input(
      z.object({
        timeHorizon: z.number().int().min(1).max(30).optional(),
        taskIds: z.array(z.string().uuid()).optional(),
        baseDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const schedulerService = new SchedulerService(ctx.db);
      const previewService = new SchedulePreviewService(ctx.db);
      const userId = ctx.session.user.id;
      const timeHorizon = input.timeHorizon ?? 7;
      const baseDate = input.baseDate ?? new Date();

      try {
        const scheduleResult = await schedulerService.scheduleTasksForUser(
          userId,
          {
            timeHorizon,
            taskIds: input.taskIds,
            baseDate,
          },
        );

        const previewSession = await previewService.createPreviewSession({
          userId,
          seed: scheduleResult.meta.seed ?? 1,
          baseDate,
          timeHorizon,
          previewEvents: scheduleResult.events,
        });

        return {
          previewSessionId: previewSession.id,
          scheduleResult,
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Reschedule all tasks (clear existing scheduled events and create new ones)
   */
  rescheduleAll: protectedProcedure
    .input(
      z.object({
        calendarId: z.string().uuid(),
        timeHorizon: z.number().int().min(1).max(30).optional(),
        baseDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const schedulerService = new SchedulerService(ctx.db);

      // Verify the calendar belongs to the user
      const calendar = await ctx.db.calendar.findFirst({
        where: {
          id: input.calendarId,
          userId: ctx.session.user.id,
        },
      });

      if (!calendar) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Calendar not found",
        });
      }

      if (calendar.readOnly) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot schedule to a read-only calendar",
        });
      }

      try {
        const result = await schedulerService.rescheduleAllTasks(
          ctx.session.user.id,
          input.calendarId,
          {
            timeHorizon: input.timeHorizon,
            baseDate: input.baseDate,
          },
        );

        return result;
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message,
          });
        }
        throw error;
      }
    }),

  /**
   * Get scheduling statistics for the current user
   */
  getSchedulingStats: protectedProcedure.query(async ({ ctx }) => {
    const [totalTasks, scheduledTasks, unscheduledTasks] = await Promise.all([
      ctx.db.task.count({
        where: {
          userId: ctx.session.user.id,
          status: "TO_DO",
        },
      }),
      // Tasks that have at least one linked calendar event — the authoritative
      // "is scheduled" signal. Keeps scheduledTasks + unscheduledTasks == totalTasks.
      ctx.db.task.count({
        where: {
          userId: ctx.session.user.id,
          status: "TO_DO",
          Event: { some: {} },
        },
      }),
      // Tasks with no linked event — never uses Task.scheduledTime, which the
      // scheduler does not write to.
      ctx.db.task.count({
        where: {
          userId: ctx.session.user.id,
          status: "TO_DO",
          Event: { none: {} },
        },
      }),
    ]);

    return {
      totalTasks,
      scheduledTasks,
      unscheduledTasks,
    };
  }),

  /**
   * Check if the scheduler is available.
   * The evolutionary algorithm runs in-process — always available.
   */
  checkSolverHealth: protectedProcedure.query(async (): Promise<{ available: boolean; error?: string }> => {
    return { available: true };
  }),

  /**
   * Generate one German explanation per scheduled task (lazy, opt-in).
   * Returns {} if OPENAI_API_KEY is not configured.
   */
  explainSchedule: protectedProcedure
    .input(
      z.object({
        scheduledTasks: z.array(
          z.object({ id: z.string(), start: z.string(), end: z.string() }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      const aiAvailable = !!getOpenAIClient();
      if (!aiAvailable) return { explanations: {} };

      const taskIds = input.scheduledTasks.map((t) => t.id);

      const [dbTasks, dbPreferences] = await Promise.all([
        ctx.db.task.findMany({
          where: { id: { in: taskIds }, userId: ctx.session.user.id },
        }),
        ctx.db.workingPreferences.findUnique({
          where: { userId: ctx.session.user.id },
        }),
      ]);

      const energyLevels =
        Array.isArray(dbPreferences?.alertnessByHour) &&
        dbPreferences.alertnessByHour.length === 24
          ? dbPreferences.alertnessByHour
          : Array.from({ length: 24 }, (_, h) => (h >= 9 && h <= 17 ? 0.75 : 0.55));

      // Build schedule map and deadline map using epoch-minute offsets
      // getEnergyAt uses (startMin % MINUTES_PER_DAY) so epoch offsets work correctly
      const scheduleMap: Record<string, number> = {};
      for (const st of input.scheduledTasks) {
        scheduleMap[st.id] = Math.floor(new Date(st.start).getTime() / 60000);
      }

      const deadlineMap = new Map<string, number>();
      for (const t of dbTasks) {
        if (t.due) deadlineMap.set(t.id, Math.floor(t.due.getTime() / 60000));
      }

      const eaTasks = dbTasks.map((t) => ({
        id: t.id,
        priority: (t.priority ?? 5) / 10,
        durationMinutes: t.durationMinutes ?? 60,
        deadline: t.due?.toISOString() ?? null,
        complexity: (t.complexity ?? 5) / 10,
        location: "Office" as const,
        dependsOn: [] as string[],
        preferredStartAfter: t.preferredStartAfter ?? undefined,
      }));

      const debugInfo = computeTaskDebugInfo(
        scheduleMap,
        eaTasks,
        energyLevels,
        deadlineMap,
      );

      const explanations = await explainScheduledTasks(
        input.scheduledTasks,
        dbTasks.map((t) => ({
          id: t.id,
          title: t.title,
          complexity: t.complexity ? t.complexity / 10 : undefined,
          deadline: t.due?.toISOString() ?? null,
        })),
        debugInfo,
      );

      return { explanations };
    }),

  /**
   * Parse natural language feedback, apply the intent to the DB,
   * re-run the EA (preview), and return the new schedule + AI reply.
   * Does NOT save to calendar — user confirms separately.
   *
   * Input includes the current schedule (with start/end times) so the AI
   * has full context about what is currently planned.
   */
  applyFeedbackAndPreview: protectedProcedure
    .input(
      z.object({
        previewSessionId: z.string().uuid(),
        message: z.string().min(1).max(1000),
        currentSchedule: z
          .array(z.object({ id: z.string(), start: z.string(), end: z.string() }))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const aiAvailable = !!getOpenAIClient();
      const previewService = new SchedulePreviewService(ctx.db);

      if (!aiAvailable) {
        return {
          intent: null,
          aiReply: "KI-Features sind nicht verfügbar. Bitte OPENAI_API_KEY konfigurieren.",
          newSchedule: null,
          clarificationNeeded: false,
        };
      }

      let previewSession;
      try {
        previewSession = await previewService.getActiveSessionOrThrow(
          input.previewSessionId,
          userId,
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        throw error;
      }

      const tasks = await ctx.db.task.findMany({
        where: { userId, status: "TO_DO" },
        select: {
          id: true,
          title: true,
          due: true,
          priority: true,
          durationMinutes: true,
          preferredStartAfter: true,
        },
      });

      const today = new Date().toISOString().split("T")[0]!;
      const scheduledTasks = input.currentSchedule ?? [];

      const intent = await parseScheduleFeedback(
        input.message,
        scheduledTasks,
        tasks,
        today,
      );

      if (!intent) {
        return {
          intent: null,
          aiReply: "Entschuldigung, ich konnte dein Feedback nicht verarbeiten. Bitte versuche es erneut.",
          newSchedule: null,
          clarificationNeeded: false,
        };
      }

      if (!intent.taskId) {
        return {
          intent,
          aiReply: intent.explanation,
          newSchedule: null,
          clarificationNeeded: true,
        };
      }

      const targetTask = await ctx.db.task.findFirst({
        where: { id: intent.taskId, userId },
      });

      if (!targetTask) {
        return {
          intent,
          aiReply: `Aufgabe nicht gefunden. ${intent.explanation}`,
          newSchedule: null,
          clarificationNeeded: false,
        };
      }

      // Map intent → DB update
      const update: Record<string, unknown> = {};

      if (intent.field === "deadline") {
        if (intent.operation === "set" && typeof intent.value === "string") {
          update.due = new Date(intent.value);
        } else if (intent.operation === "shift_earlier" && targetTask.due) {
          update.due = new Date(targetTask.due.getTime() - 2 * 60 * 60 * 1000);
        } else if (intent.operation === "shift_later" && targetTask.due) {
          update.due = new Date(targetTask.due.getTime() + 2 * 60 * 60 * 1000);
        }
      } else if (intent.field === "priority") {
        const cur = (targetTask.priority ?? 5) / 10;
        if (intent.operation === "increase") {
          update.priority = Math.round(Math.min(1.0, cur + 0.25) * 10);
        } else if (intent.operation === "decrease") {
          update.priority = Math.round(Math.max(0.0, cur - 0.25) * 10);
        } else if (intent.operation === "set" && typeof intent.value === "number") {
          update.priority = Math.round(Math.min(1.0, Math.max(0.0, intent.value)) * 10);
        }
      } else if (intent.field === "durationMinutes") {
        const cur = targetTask.durationMinutes ?? 60;
        if (intent.operation === "increase") {
          update.durationMinutes = cur + 30;
        } else if (intent.operation === "decrease") {
          update.durationMinutes = Math.max(15, cur - 15);
        } else if (intent.operation === "set" && typeof intent.value === "number") {
          update.durationMinutes = Math.max(15, intent.value);
        }
      } else if (intent.field === "preferredStartAfter") {
        if (intent.operation === "set" && typeof intent.value === "number") {
          update.preferredStartAfter = intent.value;
        }
      }
      // "location" is not yet a DB column on Task — silently skip

      if (Object.keys(update).length > 0) {
        await previewService.snapshotTaskBeforeMutation({
          sessionId: previewSession.id,
          userId,
          taskId: intent.taskId,
        });

        const updatedTask = await ctx.db.task.update({
          where: { id: intent.taskId },
          data: update,
          select: { updatedAt: true },
        });

        await previewService.markTaskMutation({
          sessionId: previewSession.id,
          userId,
          taskId: intent.taskId,
          taskUpdatedAt: updatedTask.updatedAt,
        });
      }

      // Re-run EA preview
      const schedulerService = new SchedulerService(ctx.db);
      try {
        const newSchedule = await schedulerService.scheduleTasksForUser(userId, {
          timeHorizon: previewSession.timeHorizon,
          baseDate: previewSession.baseDate,
          seed: previewSession.seed,
        });

        await previewService.replacePreviewEvents({
          sessionId: previewSession.id,
          userId,
          previewEvents: newSchedule.events,
        });

        return { intent, aiReply: intent.explanation, newSchedule, clarificationNeeded: false };
      } catch {
        return { intent, aiReply: intent.explanation, newSchedule: null, clarificationNeeded: false };
      }
    }),

  /**
   * Cancel a preview session and roll back feedback-applied task mutations.
   */
  cancelPreview: protectedProcedure
    .input(
      z.object({
        previewSessionId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const previewService = new SchedulePreviewService(ctx.db);
      const rollback = await previewService.cancelSession(
        input.previewSessionId,
        ctx.session.user.id,
      );

      return rollback;
    }),

  /**
   * Commit the feedback-adjusted schedule to the calendar.
   * Saves exactly the previewed events without re-running the EA.
   */
  confirmAndSave: protectedProcedure
    .input(
      z.object({
        previewSessionId: z.string().uuid(),
        calendarId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const previewService = new SchedulePreviewService(ctx.db);
      const userId = ctx.session.user.id;

      const calendar = await ctx.db.calendar.findFirst({
        where: { id: input.calendarId, userId },
      });

      if (!calendar) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Calendar not found" });
      }
      if (calendar.readOnly) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot schedule to a read-only calendar" });
      }

      try {
        const previewSession = await previewService.getActiveSessionOrThrow(
          input.previewSessionId,
          userId,
        );
        const previewEvents = parsePreviewEvents(previewSession.previewEventsJson);

        await ctx.db.$transaction(async (tx) => {
          if (previewEvents.length > 0) {
            await tx.event.createMany({
              data: previewEvents.map((event) => ({
                title: event.title,
                description: event.description ?? null,
                start: new Date(event.start),
                end: new Date(event.end),
                allDay: false,
                color: event.color ?? "#3b82f6",
                location: null,
                calendarId: input.calendarId,
                taskId: event.taskId,
              })),
            });
          }

          await tx.schedulePreviewSession.update({
            where: { id: previewSession.id },
            data: {
              status: "CONFIRMED",
              confirmedAt: new Date(),
            },
          });
        });

        // Invalidate event/calendar caches for all weeks covered by new events
        if (previewEvents.length > 0) {
          const eventService = new EventService(ctx.db);
          const dates = previewEvents.map((e) => new Date(e.start));
          const endDates = previewEvents.map((e) => new Date(e.end));
          const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
          const maxDate = new Date(Math.max(...endDates.map((d) => d.getTime())));
          await eventService.invalidateEventWeeks(userId, minDate, maxDate);
        }

        const scheduledTaskIds = Array.from(
          new Set(previewEvents.map((event) => event.taskId)),
        );

        return {
          scheduledTaskIds,
          unscheduledTaskIds: [] as string[],
          events: previewEvents.map((event) => ({
            taskId: event.taskId,
            start: new Date(event.start),
            end: new Date(event.end),
            title: event.title,
            description: event.description ?? undefined,
            color: event.color ?? "#3b82f6",
          })),
          meta: {
            status: scheduledTaskIds.length > 0 ? "feasible" : "impossible",
            successRate: scheduledTaskIds.length > 0 ? 1 : 0,
            objectiveValue: null,
            wallTimeMs: 0,
          },
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("Preview session")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        }
        if (error instanceof Error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        throw error;
      }
    }),
});
