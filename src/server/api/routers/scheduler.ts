/**
 * Scheduler tRPC Router
 * Exposes scheduling functionality via tRPC API
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { SchedulerService } from "../services/scheduler-service";
import { explainScheduledTasks } from "../services/explain-service";
import { parseScheduleFeedback } from "../services/chat-schedule-service";
import { computeTaskDebugInfo } from "@/server/lib/scheduler/ea-core";
import { getOpenAIClient } from "@/server/lib/openai";
export const schedulerRouter = createTRPCRouter({
  /**
   * Schedule tasks for the current user
   * Returns the scheduling result without saving to database
   */
  scheduleTasks: protectedProcedure
    .input(
      z.object({
        timeHorizon: z.number().int().min(1).max(30).optional(),
        taskIds: z.array(z.string().uuid()).optional(),
        baseDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const schedulerService = new SchedulerService(ctx.db);

      try {
        const result = await schedulerService.scheduleTasksForUser(
          ctx.session.user.id,
          {
            timeHorizon: input.timeHorizon,
            taskIds: input.taskIds,
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
   * Schedule tasks and save them as events in the user's calendar
   */
  scheduleAndSave: protectedProcedure
    .input(
      z.object({
        calendarId: z.string().uuid(),
        timeHorizon: z.number().int().min(1).max(30).optional(),
        taskIds: z.array(z.string().uuid()).optional(),
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
        const result = await schedulerService.scheduleAndSaveEvents(
          ctx.session.user.id,
          input.calendarId,
          {
            timeHorizon: input.timeHorizon,
            taskIds: input.taskIds,
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
      ctx.db.event.count({
        where: {
          calendar: {
            userId: ctx.session.user.id,
          },
          taskId: {
            not: null,
          },
        },
      }),
      ctx.db.task.count({
        where: {
          userId: ctx.session.user.id,
          status: "TO_DO",
          scheduledTime: null,
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
        message: z.string().min(1).max(1000),
        currentSchedule: z
          .array(z.object({ id: z.string(), start: z.string(), end: z.string() }))
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const aiAvailable = !!getOpenAIClient();

      if (!aiAvailable) {
        return {
          intent: null,
          aiReply: "KI-Features sind nicht verfügbar. Bitte OPENAI_API_KEY konfigurieren.",
          newSchedule: null,
          clarificationNeeded: false,
        };
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
        await ctx.db.task.update({ where: { id: intent.taskId }, data: update });
      }

      // Re-run EA preview
      const schedulerService = new SchedulerService(ctx.db);
      try {
        const newSchedule = await schedulerService.scheduleTasksForUser(userId, {
          timeHorizon: 7,
        });
        return { intent, aiReply: intent.explanation, newSchedule, clarificationNeeded: false };
      } catch {
        return { intent, aiReply: intent.explanation, newSchedule: null, clarificationNeeded: false };
      }
    }),

  /**
   * Commit the feedback-adjusted schedule to the calendar.
   * Re-runs the EA with updated task properties and saves events.
   */
  confirmAndSave: protectedProcedure
    .input(
      z.object({
        calendarId: z.string().uuid(),
        timeHorizon: z.number().int().min(1).max(30).optional(),
        taskIds: z.array(z.string().uuid()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const schedulerService = new SchedulerService(ctx.db);

      const calendar = await ctx.db.calendar.findFirst({
        where: { id: input.calendarId, userId: ctx.session.user.id },
      });

      if (!calendar) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Calendar not found" });
      }
      if (calendar.readOnly) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot schedule to a read-only calendar" });
      }

      try {
        return await schedulerService.scheduleAndSaveEvents(
          ctx.session.user.id,
          input.calendarId,
          { timeHorizon: input.timeHorizon, taskIds: input.taskIds },
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        throw error;
      }
    }),
});

