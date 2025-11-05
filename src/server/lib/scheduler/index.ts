/**
 * ============================================================================
 * SCHEDULER LIBRARY - Main Entry Point
 * ============================================================================
 * 
 * A timeblocking scheduler that uses constraint programming to optimally
 * schedule tasks based on:
 * - User priorities and deadlines
 * - Available working hours
 * - Existing calendar commitments (busy slots)
 * - Energy levels throughout the day
 * - Task complexity and location
 * 
 * ## Quick Start
 * 
 * ```typescript
 * import { EnhancedScheduler } from '@/server/lib/scheduler';
 * 
 * const scheduler = new EnhancedScheduler({
 *   baseUrl: process.env.SOLVER_SERVICE_URL!,
 *   timeoutMs: 5000,
 * });
 * 
 * const result = await scheduler.schedule({
 *   timeHorizon: 7, // Schedule for 7 days
 *   tasks: [
 *     { id: '1', priority: 0.9, durationMinutes: 120, complexity: 0.8 },
 *     { id: '2', priority: 0.5, durationMinutes: 60, deadline: '2024-12-01T17:00:00Z' },
 *   ],
 *   busySlots: [
 *     { start: '2024-11-06T14:00:00Z', end: '2024-11-06T15:00:00Z' },
 *   ],
 *   workingHours: [ // Monday through Sunday
 *     { startTime: '09:00', endTime: '17:00' },
 *     { startTime: '09:00', endTime: '17:00' },
 *     { startTime: '09:00', endTime: '17:00' },
 *     { startTime: '09:00', endTime: '17:00' },
 *     { startTime: '09:00', endTime: '17:00' },
 *     { startTime: '00:00', endTime: '00:00' }, // Weekend - no work
 *     { startTime: '00:00', endTime: '00:00' },
 *   ],
 *   energyProfile: [
 *     0.3, 0.3, 0.3, 0.3, 0.4, 0.5, 0.6, 0.7, // 00:00 - 07:00
 *     0.8, 0.9, 0.9, 0.9, 0.8, 0.7, 0.7, 0.8, // 08:00 - 15:00
 *     0.8, 0.7, 0.6, 0.5, 0.4, 0.4, 0.3, 0.3, // 16:00 - 23:00
 *   ],
 * });
 * 
 * console.log(result.status); // 'optimal', 'feasible', 'impossible', or 'error'
 * console.log(result.tasks);  // Scheduled tasks with start/end times
 * console.log(result.successRate); // Fraction of tasks scheduled (0-1)
 * ```
 * 
 * ## Using with Prisma Database
 * 
 * ```typescript
 * import {
 *   EnhancedScheduler,
 *   taskToSchedulerTask,
 *   eventToBusySlot,
 *   preferencesToWorkingHours,
 *   preferencesToEnergyProfile,
 * } from '@/server/lib/scheduler';
 * 
 * // Fetch from database
 * const tasks = await db.task.findMany({ where: { userId, status: 'TODO' } });
 * const events = await db.event.findMany({ where: { userId } });
 * const preferences = await db.workingPreferences.findUnique({ where: { userId } });
 * 
 * // Convert to scheduler format
 * const scheduler = new EnhancedScheduler({ baseUrl: process.env.SOLVER_SERVICE_URL! });
 * const result = await scheduler.schedule({
 *   timeHorizon: 7,
 *   tasks: tasks.map(taskToSchedulerTask),
 *   busySlots: events.map(eventToBusySlot),
 *   workingHours: preferencesToWorkingHours(preferences),
 *   energyProfile: preferencesToEnergyProfile(preferences),
 * });
 * ```
 */

// ============================================================================
// MAIN SCHEDULER
// ============================================================================

export { EnhancedScheduler, validateScheduleRequest } from "./scheduler";
export type { EnhancedSchedulerOptions } from "./scheduler";

// ============================================================================
// TYPES
// ============================================================================

// Input types
export type {
  ScheduleRequest,
  TaskInput,
  BusySlot,
  WorkingHours,
} from "./types";

// Output types
export type {
  ScheduleResponse,
  ScheduledTask,
  ScheduleStatus,
  SolverStatus,
  SoftConstraintAnalysis,
  EnergyComplexityAnalysis,
  LocationClusteringAnalysis,
  WorkloadBalanceAnalysis,
} from "./types";

// All other types (for advanced usage)
export type {
  ValidatedTask,
  ValidatedScheduleRequest,
  TaskScoreComponents,
  SolverRequestPayload,
  SolverResponsePayload,
  SolverVariable,
  SolverBoolVariable,
  SolverInterval,
  SolverConstraint,
  SolverObjective,
  SolverObjectiveTerm,
  ConstraintBuildResult,
  TaskConstraintMetadata,
} from "./types";

// ============================================================================
// PRISMA ADAPTERS
// ============================================================================

export type {
  SchedulableTask,
  SchedulableEvent,
  UserSchedulingPreferences,
  SchedulingContext,
  SchedulingResult,
} from "./prisma-adapters";

export {
  taskToSchedulerTask,
  eventToBusySlot,
  preferencesToWorkingHours,
  preferencesToEnergyProfile,
} from "./prisma-adapters";

// ============================================================================
// LOW-LEVEL ACCESS (Advanced)
// ============================================================================

// For direct solver access without EnhancedScheduler wrapper
export { SolverClient } from "./solver-client";
export type { SolverClientOptions } from "./solver-client";
