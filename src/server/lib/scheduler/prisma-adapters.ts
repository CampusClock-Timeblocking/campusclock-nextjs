/**
 * ============================================================================
 * PRISMA ADAPTERS - Database Integration for Scheduler
 * ============================================================================
 *
 * This file provides adapter functions to convert between Prisma database
 * entities and scheduler types. Use these to easily schedule tasks from
 * your database.
 *
 * Main conversions:
 * - Task (from DB) -> ValidatedTask (for scheduler)
 * - Event (from DB) -> BusySlot (for scheduler)
 * - WorkingPreferences -> WorkingHours array (7 days)
 * - WorkingPreferences -> Energy profile (24 hours)
 *
 */

import type {
  Task,
  Event,
  WorkingPreferences,
  SchedulingConfig,
  Weekday,
} from "@prisma/client";
import type {
  ValidatedTask,
  BusySlot,
  WorkingHours as SchedulerWorkingHours,
} from "./types";

// ============================================================================
// TYPE ALIASES - Make Prisma types more expressive
// ============================================================================

/**
 * User's scheduling preferences from the database.
 * Combines working preferences and scheduling configuration.
 */
export interface UserSchedulingPreferences {
  workingPreferences: WorkingPreferences;
  schedulingConfig: SchedulingConfig;
}

/**
 * Complete context needed to schedule tasks for a user.
 * Fetch all of this from the database, then pass to scheduler.
 */
export interface SchedulingContext {
  tasks: Task[];
  events: Event[];
  preferences: UserSchedulingPreferences;
  baseDate?: Date;
  currentTime?: Date;
}

/**
 * Result of scheduling that can be saved back to the database.
 * Use this to create new calendar events for scheduled tasks.
 */
export interface SchedulingResult {
  scheduledTaskIds: string[]; // Tasks that got scheduled
  unscheduledTaskIds: string[]; // Tasks that couldn't fit
  events: Array<{
    // New calendar events to create
    taskId: string;
    start: Date;
    end: Date;
    title: string;
    description?: string;
    color: string;
  }>;
  meta: {
    status: "optimal" | "feasible" | "impossible" | "error";
    successRate: number;
    objectiveValue?: number | null;
    wallTimeMs: number;
  };
}

// ============================================================================
// ADAPTER FUNCTIONS - Convert Prisma types to scheduler types
// ============================================================================

/**
 * Convert a Prisma Task to a scheduler ValidatedTask.
 *
 * Handles:
 * - Priority normalization (1-10 in DB -> 0-1 for scheduler)
 * - Complexity normalization (1-10 in DB -> 0-1 for scheduler)
 * - Default duration (60 minutes if not set)
 * - Deadline conversion (due date -> ISO string)
 *
 * @param task - Task from Prisma database
 * @returns Scheduler-ready task
 */
export function taskToSchedulerTask(task: Task): ValidatedTask {
  return {
    id: task.id,
    priority: normalizePriority(task.priority),
    durationMinutes: task.durationMinutes ?? 60, // Default to 1 hour
    deadline: task.due?.toISOString() ?? undefined,
    complexity: normalizeComplexity(task.complexity),
    location: "Office", // TODO: Add location field to Task model if needed
  };
}

/**
 * Convert a Prisma Event to a scheduler BusySlot.
 *
 * Busy slots represent time that's already occupied (meetings, events, etc).
 * Tasks cannot be scheduled during these times.
 *
 * @param event - Event from Prisma database
 * @returns Busy slot for scheduler
 */
export function eventToBusySlot(event: Event): BusySlot {
  return {
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    source: "calendar",
  };
}

/**
 * Convert Prisma WorkingPreferences to scheduler WorkingHours array.
 *
 * Returns an array of 7 WorkingHours objects (Monday-Sunday).
 * Working days use the user's earliest/latest times.
 * Non-working days have 00:00-00:00 (no available time).
 *
 * @param preferences - User's working preferences from database
 * @returns Array of 7 WorkingHours (Mon-Sun)
 *
 * @example
 * ```typescript
 * // User works Mon-Fri, 9am-5pm
 * const workingHours = preferencesToWorkingHours(preferences);
 * // Returns:
 * // [
 * //   { startTime: "09:00", endTime: "17:00" }, // Monday
 * //   { startTime: "09:00", endTime: "17:00" }, // Tuesday
 * //   { startTime: "09:00", endTime: "17:00" }, // Wednesday
 * //   { startTime: "09:00", endTime: "17:00" }, // Thursday
 * //   { startTime: "09:00", endTime: "17:00" }, // Friday
 * //   { startTime: "00:00", endTime: "00:00" }, // Saturday (no work)
 * //   { startTime: "00:00", endTime: "00:00" }, // Sunday (no work)
 * // ]
 * ```
 */
export function preferencesToWorkingHours(
  preferences: WorkingPreferences,
): SchedulerWorkingHours[] {
  const workingDays = preferences.workingDays ?? [];

  const earliestTime = dateToTimeString(preferences.earliestTime);
  const latestTime = dateToTimeString(preferences.latestTime);

  // Create 7-day array (Monday to Sunday)
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = indexToWeekday(index);
    const isWorkingDay = workingDays.includes(weekday);

    if (isWorkingDay) {
      return {
        startTime: earliestTime,
        endTime: latestTime,
      };
    } else {
      // Non-working day - no available hours
      return {
        startTime: "00:00",
        endTime: "00:00",
      };
    }
  });
}

/**
 * Extract energy profile from WorkingPreferences.
 *
 * Energy profile represents the user's alertness/energy level for each hour
 * of the day (0-23). Complex tasks should be scheduled during high-energy hours.
 *
 * Returns an array of 24 numbers (0-1) representing energy for each hour.
 *
 * @param preferences - User's working preferences from database
 * @returns Array of 24 energy levels (0-1)
 *
 * @example
 * ```typescript
 * const energyProfile = preferencesToEnergyProfile(preferences);
 * // Returns something like:
 * // [0.3, 0.3, ..., 0.5, 0.7, 0.9, 0.9, 0.8, 0.7, ..., 0.4, 0.3]
 * // Low energy early morning, peak mid-morning, decline in evening
 * ```
 */
export function preferencesToEnergyProfile(
  preferences: WorkingPreferences,
): number[] {
  const profile = preferences.alertnessByHour ?? [];

  // Ensure we have exactly 24 values
  if (profile && Array.isArray(profile) && profile.length === 24) {
    return profile;
  }

  // Default to balanced profile if not set
  // Higher energy during typical working hours (9am-5pm)
  return Array(24)
    .fill(0)
    .map((_, h) => (h >= 9 && h <= 17 ? 0.75 : 0.55));
}

// ============================================================================
// HELPER FUNCTIONS - Internal utilities
// ============================================================================

/**
 * Normalize priority from database scale (1-10 or null) to scheduler scale (0-1).
 */
function normalizePriority(priority: number | null): number {
  if (priority === null) return 0.5;
  // Priority is 1-10 in database, normalize to 0-1
  return Math.max(0, Math.min(1, priority / 10));
}

/**
 * Normalize complexity from database scale (1-10 or null) to scheduler scale (0-1).
 */
function normalizeComplexity(complexity: number | null): number {
  if (complexity === null) return 0.5;
  // Complexity is 1-10 in database, normalize to 0-1
  return Math.max(0, Math.min(1, complexity / 10));
}

/**
 * Convert a Date object to HH:MM time string.
 * Uses UTC time components.
 */
function dateToTimeString(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Convert array index (0-6) to Weekday enum value.
 * Monday = 0, Sunday = 6
 */
function indexToWeekday(index: number): Weekday {
  const weekdays: Weekday[] = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];
  return weekdays[index]!;
}
