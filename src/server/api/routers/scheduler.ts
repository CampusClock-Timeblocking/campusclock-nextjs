/**
 * Scheduler tRPC Router
 * Exposes scheduling functionality via tRPC API
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { SchedulerService } from "../services/scheduler-service";
import { env } from "@/env";
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
   * Check if the solver service is available
   */
  checkSolverHealth: protectedProcedure.query(async () => {
    const solverUrl = env.SOLVER_SERVICE_URL ?? "http://localhost:8000";
    const healthUrl = `${solverUrl}/health`;

    console.log("🔍 [Health Check] Starting solver health check");
    console.log("🔍 [Health Check] Solver URL:", solverUrl);
    console.log("🔍 [Health Check] Health endpoint:", healthUrl);
    console.log("🔍 [Health Check] Timeout: 10000ms");

    const startTime = Date.now();

    try {
      console.log("🔍 [Health Check] Initiating fetch request...");
      
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000), // Increased to 10 seconds for containerized environments
      });

      const elapsed = Date.now() - startTime;
      console.log(`🔍 [Health Check] Response received in ${elapsed}ms`);
      console.log("🔍 [Health Check] Status:", response.status);
      console.log("🔍 [Health Check] Status text:", response.statusText);

      if (!response.ok) {
        console.error(
          `❌ [Health Check] Solver returned non-OK status: ${response.status}`,
        );
        return {
          available: false,
          error: `Solver returned status ${response.status}`,
        };
      }

      console.log("✅ [Health Check] Solver is healthy");
      return {
        available: true,
        url: solverUrl,
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ [Health Check] Failed after ${elapsed}ms`);
      console.error("❌ [Health Check] Error type:", error?.constructor?.name);
      console.error("❌ [Health Check] Error message:", error instanceof Error ? error.message : "Unknown error");
      
      if (error instanceof Error) {
        console.error("❌ [Health Check] Error stack:", error.stack);
        
        // Additional context for common errors
        if (error.name === "AbortError") {
          console.error("❌ [Health Check] Request was aborted (timeout reached)");
        } else if (error.message.includes("ECONNREFUSED")) {
          console.error("❌ [Health Check] Connection refused - solver service may not be running");
        } else if (error.message.includes("ENOTFOUND")) {
          console.error("❌ [Health Check] DNS lookup failed - check solver service hostname");
        } else if (error.message.includes("ETIMEDOUT")) {
          console.error("❌ [Health Check] Connection timed out at TCP level");
        }
      }

      return {
        available: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }),
});
