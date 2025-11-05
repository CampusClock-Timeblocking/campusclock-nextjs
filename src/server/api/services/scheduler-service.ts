/**
 * Scheduler Service
 * Orchestrates the scheduling of tasks using the constraint solver
 */

import type { PrismaClient } from "@prisma/client";
import { EnhancedScheduler } from "@/server/lib/scheduler";
import type { ScheduleRequest, ScheduleResponse } from "@/server/lib/scheduler/types";
import {
  taskToSchedulerTask,
  eventToBusySlot,
  preferencesToWorkingHours,
  preferencesToEnergyProfile,
  type SchedulingContext,
  type SchedulingResult,
} from "@/server/lib/scheduler/prisma-adapters";
import { EventService } from "./event-service";
import { PreferencesService } from "./preferences-service";
import { CalendarService } from "./calendar-service";

export class SchedulerService {
  private scheduler: EnhancedScheduler;
  private eventService: EventService;
  private preferencesService: PreferencesService;
  private calendarService: CalendarService;

  constructor(private db: PrismaClient) {
    // Initialize the scheduler with environment variables
    this.scheduler = new EnhancedScheduler({
      baseUrl: process.env.SOLVER_SERVICE_URL ?? "http://localhost:8000",
      timeoutMs: parseInt(process.env.SOLVER_TIMEOUT_MS ?? "10000", 10),
      successThreshold: 0.8,
      maxHorizonExtensions: 7,
    });
    this.eventService = new EventService(db);
    this.preferencesService = new PreferencesService(db);
    this.calendarService = new CalendarService(db);
  }

  /**
   * Schedule tasks for a user
   * Fetches all necessary data from database, runs scheduler, and returns results
   */
  async scheduleTasksForUser(
    userId: string,
    options?: {
      timeHorizon?: number;
      taskIds?: string[]; // If provided, only schedule these tasks
      baseDate?: Date;
    }
  ): Promise<SchedulingResult> {
    console.log("\n🔵 [Scheduler] Starting scheduling for user:", userId);
    console.log("📋 Options:", {
      timeHorizon: options?.timeHorizon,
      taskIds: options?.taskIds,
      baseDate: options?.baseDate,
    });

    // Use configured horizon or default to 7 days
    const timeHorizon = options?.timeHorizon ?? 7;

    // Fetch scheduling context from database
    const context = await this.getSchedulingContext(
      userId, 
      options?.taskIds, 
      timeHorizon
    );

    if (!context.preferences) {
      throw new Error(
        "User preferences not found. Please complete onboarding first."
      );
    }

    // Use the configured horizon from preferences if available
    const finalTimeHorizon = 
      options?.timeHorizon ??
      context.preferences.schedulingConfig.horizonDays ??
      7;

    console.log("⏰ Time horizon:", finalTimeHorizon, "days");

    // Transform to scheduler input format
    const scheduleRequest = this.buildScheduleRequest(
      context,
      finalTimeHorizon,
      options?.baseDate
    );

    console.log("📤 Sending to solver:", {
      tasks: scheduleRequest.tasks.length,
      busySlots: scheduleRequest.busySlots?.length ?? 0,
      workingHours: scheduleRequest.workingHours,
      baseDate: scheduleRequest.baseDate,
    });

    // Run the scheduler
    const startTime = Date.now();
    const response = await this.scheduler.schedule(scheduleRequest);
    const elapsed = Date.now() - startTime;

    console.log("📥 Solver response:", {
      status: response.status,
      solverStatus: response.solverStatus,
      tasksScheduled: response.tasks.length,
      successRate: response.successRate,
      elapsedMs: elapsed,
    });

    if (response.tasks.length === 0) {
      console.log("⚠️  No tasks were scheduled!");
      console.log("💡 Possible reasons:");
      console.log("  - No available time slots in working hours");
      console.log("  - All time slots blocked by busy events");
      console.log("  - Task durations too long for available slots");
      console.log("  - Deadlines impossible to meet");
    }

    // Transform response to result format
    return this.buildSchedulingResult(response, context);
  }

  /**
   * Schedule tasks and save the results to the database as events
   */
  async scheduleAndSaveEvents(
    userId: string,
    calendarId: string,
    options?: {
      timeHorizon?: number;
      taskIds?: string[];
      baseDate?: Date;
    }
  ): Promise<SchedulingResult> {
    const result = await this.scheduleTasksForUser(userId, options);

    // Only save events if scheduling was successful
    if (result.meta.status === "optimal" || result.meta.status === "feasible") {
      console.log("💾 Saving", result.events.length, "events to calendar:", calendarId);
      
      // Create events for each scheduled task using EventService
      await Promise.all(
        result.events.map((event) =>
          this.eventService.createEvent(userId, {
            title: event.title,
            description: event.description ?? undefined,
            start: event.start,
            end: event.end,
            allDay: false,
            color: event.color,
            calendarId,
            taskId: event.taskId,
          })
        )
      );
      
      console.log("✅ Events saved successfully");
    } else {
      console.log("⚠️  Not saving events - scheduling status:", result.meta.status);
    }

    return result;
  }

  /**
   * Clear all scheduled events for tasks and reschedule
   */
  async rescheduleAllTasks(
    userId: string,
    calendarId: string,
    options?: {
      timeHorizon?: number;
      baseDate?: Date;
    }
  ): Promise<SchedulingResult> {
    // Get all task-linked events for this user
    const taskEvents = await this.db.event.findMany({
      where: {
        calendar: {
          userId,
        },
        taskId: {
          not: null,
        },
      },
      select: { id: true },
    });

    // Delete all existing task-linked events using EventService
    await Promise.all(
      taskEvents.map((event) => this.eventService.deleteEvent(userId, event.id))
    );

    // Schedule and save new events
    return this.scheduleAndSaveEvents(userId, calendarId, options);
  }

  /**
   * Private helper: Fetch all scheduling context from database
   */
  private async getSchedulingContext(
    userId: string,
    taskIds?: string[],
    timeHorizon = 7
  ): Promise<SchedulingContext> {
    console.log("📊 Fetching scheduling context...");
    
    // Calculate date range for fetching events
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + timeHorizon);

    console.log("📅 Date range:", {
      from: now.toISOString(),
      to: endDate.toISOString(),
    });

    // First, fetch ALL events (including Google Calendar) to find tasks that are already scheduled
    const allEvents = await this.calendarService.getAllEventsForUser(
      userId,
      now,
      endDate
    );

    console.log("📆 Found events:", {
      total: allEvents.length,
      withTasks: allEvents.filter((e) => e.taskId !== null).length,
      withoutTasks: allEvents.filter((e) => e.taskId === null).length,
    });

    // Get IDs of tasks that already have scheduled events
    const scheduledTaskIds = new Set(
      allEvents
        .filter((event) => event.taskId !== null)
        .map((event) => event.taskId!)
    );

    console.log("✅ Already scheduled task IDs:", Array.from(scheduledTaskIds));

    // Fetch user preferences and tasks in parallel
    const [preferences, tasks] = await Promise.all([
      this.preferencesService.getUserPreferences(userId),
      // Fetch tasks (either specific ones or all unscheduled TO_DO tasks)
      this.db.task.findMany({
        where: {
          userId,
          ...(taskIds
            ? {
                // If specific task IDs provided, fetch those tasks
                // (even if they already have events - we'll reschedule them)
                id: { in: taskIds },
              }
            : {
                // For new scheduling, only fetch TO_DO tasks that don't have events yet
                status: "TO_DO",
                id: {
                  notIn: Array.from(scheduledTaskIds),
                },
              }),
        },
      }),
    ]);

    console.log("📝 Tasks to schedule:", {
      count: tasks.length,
      ids: tasks.map((t) => t.id),
      details: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        duration: t.durationMinutes,
        priority: t.priority,
        deadline: t.due,
      })),
    });

    // For busy slots, determine which events should block scheduling:
    // - If rescheduling specific tasks (taskIds provided): exclude events for those tasks
    // - If scheduling new tasks: include ALL events (task-linked and non-task-linked)
    const busySlotEvents = taskIds
      ? allEvents.filter((event) => !taskIds.includes(event.taskId ?? ""))
      : allEvents;

    console.log("🚫 Busy slot events:", {
      count: busySlotEvents.length,
      breakdown: busySlotEvents.map((e) => ({
        title: e.title,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
        duration: Math.round((e.end.getTime() - e.start.getTime()) / 60000) + "min",
        isTaskLinked: e.taskId !== null,
      })),
    });

    console.log("⚙️  Working hours:", {
      workingDays: preferences.workingPreferences.workingDays,
      earliest: preferences.workingPreferences.earliestTime,
      latest: preferences.workingPreferences.latestTime,
    });

    return {
      tasks,
      events: busySlotEvents,
      preferences,
    };
  }

  /**
   * Private helper: Build scheduler request from context
   */
  private buildScheduleRequest(
    context: SchedulingContext,
    timeHorizon: number,
    baseDate?: Date
  ): ScheduleRequest {
    const currentTime = context.currentTime ?? new Date();
    const scheduleBaseDate = baseDate ?? context.baseDate ?? new Date();

    const schedulerTasks = context.tasks.map(taskToSchedulerTask);
    const busySlots = context.events.map(eventToBusySlot);
    const workingHours = preferencesToWorkingHours(
      context.preferences.workingPreferences
    );

    console.log("🔄 Transforming to scheduler format:");
    console.log("  Tasks:", schedulerTasks.map(t => ({
      id: t.id,
      priority: t.priority,
      duration: t.durationMinutes + "min",
      deadline: t.deadline,
    })));
    console.log("  Busy slots:", busySlots.length);
    console.log("  Working hours per day:", workingHours.map((wh, idx) => ({
      day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx],
      hours: wh.startTime === "00:00" && wh.endTime === "00:00" ? "OFF" : `${wh.startTime}-${wh.endTime}`,
    })));

    return {
      timeHorizon,
      tasks: schedulerTasks,
      busySlots,
      workingHours,
      energyProfile: preferencesToEnergyProfile(
        context.preferences.workingPreferences
      ),
      baseDate: scheduleBaseDate,
      currentTime,
    };
  }

  /**
   * Private helper: Build result from scheduler response
   */
  private buildSchedulingResult(
    response: ScheduleResponse,
    context: SchedulingContext
  ): SchedulingResult {
    // Map scheduled task IDs
    const scheduledTaskIds = response.tasks.map((t) => t.id);
    const unscheduledTaskIds = context.tasks
      .filter((t) => !scheduledTaskIds.includes(t.id))
      .map((t) => t.id);

    console.log("\n📊 Scheduling Result:");
    console.log("✅ Scheduled:", scheduledTaskIds.length, "tasks");
    console.log("❌ Unscheduled:", unscheduledTaskIds.length, "tasks");
    
    if (unscheduledTaskIds.length > 0) {
      const unscheduledTasks = context.tasks.filter((t) =>
        unscheduledTaskIds.includes(t.id)
      );
      console.log("⚠️  Unscheduled tasks details:");
      unscheduledTasks.forEach((task) => {
        console.log(`  - ${task.title} (${task.durationMinutes}min, priority: ${task.priority})`);
      });
    }

    // Create event data for each scheduled task
    const events = response.tasks.map((scheduledTask) => {
      const originalTask = context.tasks.find((t) => t.id === scheduledTask.id);
      return {
        taskId: scheduledTask.id,
        start: new Date(scheduledTask.start),
        end: new Date(scheduledTask.end),
        title: originalTask?.title ?? "Scheduled Task",
        description: originalTask?.description ?? undefined,
        color: getTaskColor(originalTask),
      };
    });

    if (events.length > 0) {
      console.log("🎯 Scheduled events:");
      events.forEach((event) => {
        console.log(`  - ${event.title}: ${event.start.toLocaleString()} - ${event.end.toLocaleString()}`);
      });
    }

    console.log("🏁 Scheduler complete!\n");

    return {
      scheduledTaskIds,
      unscheduledTaskIds,
      events,
      meta: {
        status: response.status,
        successRate: response.successRate,
        objectiveValue: response.meta?.objectiveValue,
        wallTimeMs: response.meta?.wallTimeMs ?? 0,
      },
    };
  }
}

/**
 * Helper to determine task color based on priority
 */
function getTaskColor(task: { priority: number | null } | undefined): string {
  const priority = task?.priority ?? 5;

  if (priority >= 8) return "#ef4444"; // red-500 (high priority)
  if (priority >= 6) return "#f97316"; // orange-500 (medium-high)
  if (priority >= 4) return "#3b82f6"; // blue-500 (medium)
  return "#6b7280"; // gray-500 (low priority)
}

