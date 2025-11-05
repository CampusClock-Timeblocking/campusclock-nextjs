/**
 * ============================================================================
 * ENHANCED SCHEDULER - Main Implementation
 * ============================================================================
 * 
 * This file contains the complete scheduler implementation. It:
 * 1. Validates schedule requests
 * 2. Builds constraint problems for the solver
 * 3. Communicates with the solver service
 * 4. Parses solutions back into scheduled tasks
 * 5. Analyzes soft constraints (energy matching, location clustering, etc.)
 * 
 * The scheduler will automatically extend the time horizon if needed to fit
 * more tasks, up to a configurable maximum number of extensions.
 * 
 * @example
 * ```typescript
 * const scheduler = new EnhancedScheduler({
 *   baseUrl: 'http://localhost:5000',
 *   timeoutMs: 5000,
 *   successThreshold: 0.8,
 *   maxHorizonExtensions: 7,
 * });
 * 
 * const result = await scheduler.schedule({
 *   timeHorizon: 7,
 *   tasks: [{ id: '1', priority: 0.8, durationMinutes: 60 }],
 *   workingHours: [...],  // 7 days
 *   energyProfile: [...], // 24 hours
 * });
 * ```
 */

import { differenceInHours, differenceInMinutes, isValid, parseISO, startOfDay } from "date-fns";
import { z } from "zod";
import { SolverClient, type SolverClientOptions } from "./solver-client";
import type {
  BusySlot,
  ConstraintBuildResult,
  EnergyComplexityAnalysis,
  LocationClusteringAnalysis,
  ScheduleRequest,
  ScheduleResponse,
  ScheduledTask,
  SolverIntervalValue,
  SolverObjectiveTerm,
  SolverRequestPayload,
  SolverResponsePayload,
  TaskConstraintMetadata,
  TaskScoreComponents,
  ValidatedScheduleRequest,
  ValidatedTask,
  WorkloadBalanceAnalysis,
  SoftConstraintAnalysis,
} from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const MIN_DURATION_MINUTES = 15;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const COMPLEXITY_THRESHOLD = 0.5; // Tasks above this are considered "complex"

// ============================================================================
// ENHANCED SCHEDULER CLASS
// ============================================================================

export interface EnhancedSchedulerOptions extends SolverClientOptions {
  /** Minimum success rate (0-1) before stopping horizon extensions */
  successThreshold?: number;
  /** Maximum number of days to extend the horizon when tasks don't fit */
  maxHorizonExtensions?: number;
}

export class EnhancedScheduler {
  private readonly solverClient: SolverClient;
  private readonly successThreshold: number;
  private readonly maxExtensions: number;

  constructor(options: EnhancedSchedulerOptions) {
    this.solverClient = new SolverClient(options);
    this.successThreshold = options.successThreshold ?? 0.8;
    this.maxExtensions = options.maxHorizonExtensions ?? 7;
  }

  /**
   * Schedule tasks within the given constraints.
   * 
   * The scheduler will:
   * 1. Validate the request
   * 2. Build a constraint problem
   * 3. Solve it using the constraint solver
   * 4. Try extending the time horizon if needed (up to maxExtensions times)
   * 5. Return the best solution found
   * 
   * @param request - The scheduling request
   * @returns The schedule with metadata about the solution quality
   */
  async schedule(request: ScheduleRequest): Promise<ScheduleResponse> {
    // Handle empty task list
    if (!request.tasks || request.tasks.length === 0) {
      return {
        status: "optimal",
        solverStatus: "OPTIMAL",
        tasks: [],
        successRate: 1,
        meta: {
          objectiveValue: null,
          wallTimeMs: 0,
          attemptCount: 0,
        },
      };
    }

    // Validate and normalize the request
    const validated = validateScheduleRequest(request);

    let bestResponse: ScheduleResponse | null = null;

    // Try solving with progressively longer time horizons if needed
    for (let extension = 0; extension <= this.maxExtensions; extension += 1) {
      const attempt = { ...validated, timeHorizon: validated.timeHorizon + extension };
      
      // Build the constraint problem
      const { payload, taskMetadata } = buildConstraintProblem(attempt);

      // If no tasks can be scheduled (e.g., all deadlines passed), stop
      if (taskMetadata.length === 0) {
        bestResponse = {
          status: "impossible",
          solverStatus: "UNKNOWN",
          tasks: [],
          successRate: 0,
          meta: {
            objectiveValue: null,
            wallTimeMs: 0,
            attemptCount: extension + 1,
          },
        };
        break;
      }

      // Solve the constraint problem
      const solverResponse = await this.solverClient.solve(payload);
      
      // Parse the solution
      const parsed = parseSolverResponse(solverResponse, taskMetadata, attempt.baseDate);
      
      // Add metadata
      const response: ScheduleResponse = {
        ...parsed,
        meta: {
          objectiveValue: parsed.meta?.objectiveValue ?? solverResponse.objective_value ?? null,
          wallTimeMs: parsed.meta?.wallTimeMs ?? solverResponse.wall_time * 1000,
          attemptCount: extension + 1,
        },
      };

      // Analyze soft constraints if we have scheduled tasks
      if (response.tasks.length > 0) {
        const analysis = analyseSoftConstraints(response.tasks, attempt.tasks, attempt.energyProfile);
        response.softConstraints = analysis;
      }

      bestResponse = response;

      // Stop if we found a good enough solution
      if (
        response.solverStatus === "OPTIMAL" ||
        response.successRate >= this.successThreshold ||
        response.solverStatus === "FEASIBLE"
      ) {
        break;
      }
    }

    // Return best solution or error
    return bestResponse ?? {
      status: "error",
      solverStatus: "UNKNOWN",
      tasks: [],
      successRate: 0,
      meta: {
        objectiveValue: null,
        wallTimeMs: 0,
        attemptCount: 0,
      },
    };
  }
}

// ============================================================================
// VALIDATION - Ensure input is valid and normalize it
// ============================================================================

const TaskSchema = z.object({
  id: z.string().min(1),
  priority: z.number().finite(),
  durationMinutes: z.number().finite().positive(),
  deadline: z.string().datetime().optional().nullable(),
  complexity: z.number().finite().optional(),
  location: z.string().optional(),
});

const BusySlotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  source: z.string().optional(),
});

const WorkingHoursSchema = z.object({
  startTime: z.string().regex(TIME_PATTERN, "startTime must be HH:MM"),
  endTime: z.string().regex(TIME_PATTERN, "endTime must be HH:MM"),
});

const ScheduleSchema = z.object({
  timeHorizon: z.number().int().positive(),
  tasks: z.array(TaskSchema).nonempty("At least one task is required"),
  busySlots: z.array(BusySlotSchema).optional(),
  workingHours: z.array(WorkingHoursSchema).length(7, "workingHours must have 7 entries"),
  energyProfile: z.array(z.number().finite()).nonempty("energyProfile cannot be empty"),
  baseDate: z.date().optional(),
  currentTime: z.date().optional(),
});

/**
 * Validate and normalize a schedule request.
 * - Validates types and formats using Zod schemas
 * - Fills in default values for optional fields
 * - Normalizes values to expected ranges
 * - Validates working hours make sense
 */
export function validateScheduleRequest(input: ScheduleRequest): ValidatedScheduleRequest {
  const parsed = ScheduleSchema.parse(input);

  const currentTime = parsed.currentTime ?? new Date();
  const baseDate = parsed.baseDate ? startOfDay(parsed.baseDate) : startOfDay(currentTime);

  // Normalize tasks
  const tasks: ValidatedTask[] = parsed.tasks.map((task) => ({
    id: task.id,
    priority: clamp(task.priority, 0, 1),
    durationMinutes: Math.max(MIN_DURATION_MINUTES, Math.round(task.durationMinutes)),
    deadline: task.deadline ?? undefined,
    complexity: clamp(task.complexity ?? 0.5, 0, 1),
    location: task.location ?? "Office",
  }));

  // Normalize busy slots
  const busySlots: BusySlot[] = (parsed.busySlots ?? []).map((slot) => ({
    start: slot.start,
    end: slot.end,
    source: slot.source ?? "google",
  }));

  // Validate working hours
  parsed.workingHours.forEach((hours, index) => {
    const startMinutes = timeToMinutes(hours.startTime);
    const endMinutes = timeToMinutes(hours.endTime);
    if (startMinutes >= endMinutes) {
      throw new Error(
        `Invalid working hours on day index ${index}: start must be before end: ${hours.startTime} - ${hours.endTime}`
      );
    }
  });

  // Normalize energy profile to 24 hours with values 0-1
  const energyProfile = normalizeEnergyProfile(parsed.energyProfile);

  return {
    ...parsed,
    tasks,
    busySlots,
    energyProfile,
    currentTime,
    baseDate,
  };
}

// ============================================================================
// CONSTRAINT BUILDING - Convert schedule request to solver problem
// ============================================================================

/**
 * Build a constraint satisfaction problem from the schedule request.
 * 
 * This creates:
 * - Variables for task start/end times
 * - Boolean variables for task presence and day assignment
 * - Intervals representing tasks and busy slots
 * - No-overlap constraints
 * - Working hours constraints
 * - Deadline constraints
 * - An objective function to maximize (prioritizes important tasks)
 * 
 * @returns A constraint problem ready to send to the solver
 */
function buildConstraintProblem(request: ValidatedScheduleRequest): ConstraintBuildResult {
  const payload: SolverRequestPayload = {
    variables: [],
    bool_variables: [],
    intervals: [],
    constraints: [],
  };

  const taskMetadata: TaskConstraintMetadata[] = [];
  const objectiveTerms: SolverObjectiveTerm[] = [];
  const taskIntervalIds: string[] = [];
  const busyIntervalIds: string[] = [];

  const horizonMinutes = request.timeHorizon * 24 * 60;

  // Add each task to the problem
  for (const task of request.tasks) {
    const { id: taskId, durationMinutes: duration } = task;
    const startVar = `start_${taskId}`;
    const endVar = `end_${taskId}`;
    const presenceVar = `scheduled_${taskId}`;
    const intervalId = `interval_${taskId}`;

    // Task start time can be anywhere from 0 to (horizon - duration)
    const maxStart = Math.max(0, horizonMinutes - duration);

    payload.variables.push(
      { id: startVar, min: 0, max: maxStart },
      { id: endVar, min: duration, max: horizonMinutes }
    );
    payload.bool_variables!.push({ id: presenceVar });
    payload.intervals!.push({
      id: intervalId,
      start_var: startVar,
      duration,
      end_var: endVar,
      optional: true, // Task might not be scheduled
      presence_var: presenceVar,
    });

    taskMetadata.push({
      taskId,
      startVar,
      endVar,
      intervalId,
      presenceVar,
    });
    taskIntervalIds.push(intervalId);

    // Add working hours constraints
    addWorkingHoursConstraints(
      payload,
      taskId,
      startVar,
      endVar,
      presenceVar,
      request,
      horizonMinutes
    );

    // Add deadline constraint if task has one
    if (task.deadline) {
      const deadlineMinutes = datetimeToMinutes(task.deadline, request.baseDate);
      if (deadlineMinutes > 0 && deadlineMinutes <= horizonMinutes) {
        payload.constraints!.push({
          type: "less_equal",
          left: endVar,
          right: deadlineMinutes,
        });
      }
    }

    // Add to objective function (maximize scheduling important tasks)
    const score = calculateTaskScore(task, request.currentTime);
    objectiveTerms.push({
      var: presenceVar,
      coefficient: Math.round(score.total),
    });
  }

  // Add busy slots (times that are already occupied)
  for (let index = 0; index < request.busySlots.length; index++) {
    const slot = request.busySlots[index]!;
    const start = datetimeToMinutes(slot.start, request.baseDate);
    const end = datetimeToMinutes(slot.end, request.baseDate);
    const clampedStart = clamp(start, 0, horizonMinutes);
    const clampedEnd = clamp(end, 0, horizonMinutes);
    const duration = clampedEnd - clampedStart;

    if (duration <= 0) {
      continue;
    }

    const startVar = `busy_${index}_start`;
    const endVar = `busy_${index}_end`;
    const intervalId = `busy_interval_${index}`;

    // Busy slots have fixed times
    payload.variables.push(
      { id: startVar, min: clampedStart, max: clampedStart },
      { id: endVar, min: clampedEnd, max: clampedEnd }
    );

    payload.intervals!.push({
      id: intervalId,
      start_var: startVar,
      duration,
      end_var: endVar,
      optional: false, // Busy slots are mandatory
    });

    busyIntervalIds.push(intervalId);
  }

  // Add no-overlap constraint (tasks and busy slots cannot overlap)
  if (taskIntervalIds.length > 0) {
    payload.constraints!.push({
      type: "no_overlap",
      intervals: [...taskIntervalIds, ...busyIntervalIds],
    });
  }

  // Set objective function (maximize total score of scheduled tasks)
  if (objectiveTerms.length > 0) {
    payload.objective = {
      type: "maximize",
      terms: objectiveTerms,
    };
  }

  return {
    payload,
    taskMetadata,
  };
}

/**
 * Add constraints to ensure a task only runs during working hours.
 * 
 * For each day in the horizon:
 * - Create a boolean variable indicating the task is scheduled on that day
 * - Constrain task start >= working hours start (if task is on that day)
 * - Constrain task end <= working hours end (if task is on that day)
 * - Ensure exactly one day is selected if task is scheduled
 */
function addWorkingHoursConstraints(
  payload: SolverRequestPayload,
  taskId: string,
  startVar: string,
  endVar: string,
  presenceVar: string,
  request: ValidatedScheduleRequest,
  horizonMinutes: number
): void {
  const dayBoolIds: string[] = [];
  const minutesPerDay = 24 * 60;

  for (let day = 0; day < request.timeHorizon; day += 1) {
    // Get working hours for this day (cycles through the 7-day week)
    const working = request.workingHours[day % request.workingHours.length];
    if (!working) {
      continue;
    }

    const windowStart = day * minutesPerDay + timeToMinutes(working.startTime);
    const windowEnd = day * minutesPerDay + timeToMinutes(working.endTime);
    
    // Skip if window is invalid or outside horizon
    if (windowStart >= windowEnd || windowStart >= horizonMinutes) {
      continue;
    }

    // Create a boolean for "task is scheduled on this day"
    const dayBool = `task_${taskId}_day_${day}`;
    dayBoolIds.push(dayBool);
    payload.bool_variables!.push({ id: dayBool });

    // If task is on this day, it must fit within working hours
    payload.constraints!.push(
      {
        type: "greater_equal",
        left: startVar,
        right: windowStart,
        condition: dayBool, // Only applies if dayBool is true
      },
      {
        type: "less_equal",
        left: endVar,
        right: windowEnd,
        condition: dayBool,
      },
      {
        // If this day is NOT selected, task must still be scheduled somewhere
        type: "bool_or",
        literals: [`!${dayBool}`, presenceVar],
      }
    );
  }

  // If no valid working windows exist, task cannot be scheduled
  if (dayBoolIds.length === 0) {
    payload.constraints!.push({
      type: "bool_or",
      literals: [`!${presenceVar}`], // Force presence to false
    });
    return;
  }

  // Exactly one day must be selected if task is scheduled
  // This ensures: sum(day_bools) == presence_var
  const sumTerms = dayBoolIds.map((id) => ({ var: id, coefficient: 1 }));
  sumTerms.push({ var: presenceVar, coefficient: -1 });
  payload.constraints!.push({
    type: "sum_equal",
    terms: sumTerms,
    equals: 0,
  });
}

// ============================================================================
// RESULT PARSING - Convert solver solution back to scheduled tasks
// ============================================================================

/**
 * Parse the solver's response into a user-friendly schedule.
 * 
 * Extracts:
 * - Which tasks were scheduled and when
 * - Success rate (fraction of tasks scheduled)
 * - Overall status (optimal, feasible, impossible, error)
 */
function parseSolverResponse(
  response: SolverResponsePayload,
  metadata: TaskConstraintMetadata[],
  baseDate: Date
): ScheduleResponse {
  // Build a lookup map for intervals
  const intervalById = new Map<string, SolverIntervalValue>();
  response.intervals.forEach((interval) => {
    intervalById.set(interval.id, interval);
  });

  // Extract scheduled tasks
  const scheduledTasks: ScheduledTask[] = metadata
    .filter((meta) => {
      const interval = intervalById.get(meta.intervalId);
      return interval?.presence ?? false;
    })
    .map((meta) => {
      const interval = intervalById.get(meta.intervalId)!;
      return {
        id: meta.taskId,
        start: minutesToDateTime(interval.start, baseDate),
        end: minutesToDateTime(interval.end, baseDate),
        metadata: {
          presenceVar: meta.presenceVar,
        },
      };
    });

  // Calculate success rate
  const successRate = metadata.length > 0 ? scheduledTasks.length / metadata.length : 1;

  // Map solver status to user-friendly status
  let status: ScheduleResponse["status"];
  if (response.status === "INFEASIBLE" || response.status === "UNKNOWN") {
    status = "impossible";
  } else if (successRate >= 0.9) {
    status = "optimal";
  } else if (successRate >= 0.8) {
    status = "feasible";
  } else {
    status = "impossible";
  }

  return {
    status,
    solverStatus: response.status,
    tasks: scheduledTasks,
    successRate,
    meta: {
      objectiveValue: response.objective_value ?? null,
      wallTimeMs: response.wall_time * 1000,
    },
  };
}

// ============================================================================
// SOFT CONSTRAINT ANALYSIS - Analyze solution quality
// ============================================================================

/**
 * Analyze how well the schedule satisfies soft constraints.
 * These are preferences (not hard requirements) like:
 * - Scheduling complex tasks during high-energy times
 * - Clustering tasks by location
 * - Balancing workload across days
 */
function analyseSoftConstraints(
  scheduled: ScheduledTask[],
  tasks: ValidatedTask[],
  energyProfile: number[]
): SoftConstraintAnalysis {
  const energy = analyzeEnergyComplexity(scheduled, tasks, energyProfile);
  const location = analyzeLocationClustering(scheduled, tasks);
  const workload = analyzeWorkloadBalance(scheduled);

  // Calculate overall score (0-10)
  const energyScore = energy.matchRate * 4; // max 4 points
  const locationScore = Math.min(location.efficiency * 3, 3); // max 3 points
  const balanceScore = Math.max(0, 3 - workload.balanceScore / 100); // max 3 points
  const overallScore = Math.min(energyScore + locationScore + balanceScore, 10);

  return {
    energy,
    location,
    workload,
    overallScore,
  };
}

/**
 * Analyze how well complex tasks match user's energy profile.
 * Complex tasks should ideally be scheduled during high-energy hours.
 */
function analyzeEnergyComplexity(
  scheduled: ScheduledTask[],
  tasks: ValidatedTask[],
  energyProfile: number[]
): EnergyComplexityAnalysis {
  let complexTasks = 0;
  let perfectMatches = 0; // Energy >= 0.8
  let goodMatches = 0; // Energy >= 0.6
  let poorMatches = 0; // Energy < 0.6

  const taskById = new Map(tasks.map((task) => [task.id, task]));

  for (const scheduledTask of scheduled) {
    const task = taskById.get(scheduledTask.id);
    
    // Only analyze complex tasks
    if (!task || task.complexity < COMPLEXITY_THRESHOLD) {
      continue;
    }

    complexTasks += 1;

    const start = scheduledTask.start ? safeParseISO(scheduledTask.start) : null;
    if (!start) {
      continue;
    }

    const hour = start.getUTCHours();
    const energy = energyProfile[hour] ?? 0.5;

    if (energy >= 0.8) {
      perfectMatches += 1;
    } else if (energy >= 0.6) {
      goodMatches += 1;
    } else {
      poorMatches += 1;
    }
  }

  const matchRate = complexTasks > 0 ? perfectMatches / complexTasks : 0;

  return {
    complexTasks,
    perfectMatches,
    goodMatches,
    poorMatches,
    matchRate,
  };
}

/**
 * Analyze how well tasks are clustered by location.
 * Tasks at the same location should ideally be grouped on the same day.
 */
function analyzeLocationClustering(
  scheduled: ScheduledTask[],
  tasks: ValidatedTask[]
): LocationClusteringAnalysis {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const locationDays = new Map<string, Set<string>>(); // location -> set of days
  const locationCounts = new Map<string, number>(); // location -> task count

  for (const scheduledTask of scheduled) {
    const task = taskById.get(scheduledTask.id);
    if (!task) {
      continue;
    }

    const start = scheduledTask.start ? safeParseISO(scheduledTask.start) : null;
    if (!start) {
      continue;
    }

    const dayKey = start.toISOString().slice(0, 10); // YYYY-MM-DD
    const location = task.location ?? "Unknown";

    locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1);
    if (!locationDays.has(location)) {
      locationDays.set(location, new Set());
    }
    locationDays.get(location)?.add(dayKey);
  }

  let clusters = 0;
  let totalEfficiency = 0;

  for (const [location, count] of locationCounts.entries()) {
    const days = locationDays.get(location)?.size ?? 0;
    // Efficiency: 1/days (fewer days = better clustering)
    const efficiency = days > 0 ? 1 / days : 0;
    totalEfficiency += efficiency;
    
    // Count as a cluster if multiple tasks at same location are well-grouped
    if (count > 1 && days <= Math.floor(count / 2)) {
      clusters += 1;
    }
  }

  const locationDistribution = Object.fromEntries(locationCounts.entries());
  const efficiency = locationCounts.size > 0 ? totalEfficiency / locationCounts.size : 0;

  return {
    clusters,
    efficiency,
    locationDistribution,
  };
}

/**
 * Analyze workload distribution across days.
 * Ideally, work should be balanced (similar amount each day).
 */
function analyzeWorkloadBalance(scheduled: ScheduledTask[]): WorkloadBalanceAnalysis {
  const dailyWorkload = new Map<string, number>(); // day -> minutes

  for (const scheduledTask of scheduled) {
    const start = scheduledTask.start ? safeParseISO(scheduledTask.start) : null;
    const end = scheduledTask.end ? safeParseISO(scheduledTask.end) : null;
    if (!start || !end) {
      continue;
    }

    const duration = Math.max(0, differenceInMinutes(end, start));
    const dayKey = start.toISOString().slice(0, 10);
    dailyWorkload.set(dayKey, (dailyWorkload.get(dayKey) ?? 0) + duration);
  }

  if (dailyWorkload.size === 0) {
    return {
      balanceScore: 0,
      averageDailyWorkload: 0,
      dailyWorkload: {},
    };
  }

  const workloads = [...dailyWorkload.values()];
  const avg = workloads.reduce((acc, value) => acc + value, 0) / workloads.length;
  
  // Calculate standard deviation (lower = more balanced)
  const variance =
    workloads.reduce((acc, value) => acc + (value - avg) ** 2, 0) / workloads.length;
  const balanceScore = Math.sqrt(variance);

  return {
    balanceScore,
    averageDailyWorkload: avg,
    dailyWorkload: Object.fromEntries(dailyWorkload.entries()),
  };
}

// ============================================================================
// SCORING - Calculate task importance for objective function
// ============================================================================

/**
 * Calculate a comprehensive score for a task.
 * Used in the objective function to prioritize which tasks to schedule.
 * 
 * Components:
 * - Priority: Base importance set by user (0-100 points)
 * - Urgency: How close to deadline (0-50 points)
 * - Complexity: Small bonus for complex tasks (0-5 points)
 */
function calculateTaskScore(task: ValidatedTask, currentTime: Date): TaskScoreComponents {
  const baseScore = task.priority * 100;
  const urgency = calculateUrgency(task.deadline, currentTime);
  const urgencyScore = urgency * 50;
  const complexityScore = task.complexity * 5;
  const total = baseScore + urgencyScore + complexityScore;

  return {
    priority: baseScore,
    urgency: urgencyScore,
    complexity: complexityScore,
    total,
  };
}

/**
 * Calculate urgency based on deadline proximity.
 * Returns 0-1 where 1 = overdue/very soon, 0 = no deadline/far away.
 * 
 * Uses exponential decay: urgency decreases as time to deadline increases.
 */
function calculateUrgency(deadline: string | null | undefined, currentTime: Date): number {
  if (!deadline) {
    return 0;
  }

  let deadlineDate: Date;
  try {
    deadlineDate = parseISO(deadline);
    if (Number.isNaN(deadlineDate.getTime())) {
      return 0;
    }
  } catch {
    return 0;
  }

  const hours = differenceInHours(deadlineDate, currentTime, {
    roundingMethod: "round",
  });

  // Already overdue
  if (hours <= 0) {
    return 1;
  }

  // Exponential decay with floor
  const decayConstant = 24; // Half-urgency after ~24 hours
  const floor = 0.1; // Minimum urgency
  const maxAdditional = 0.9; // Maximum additional urgency

  const urgency = floor + maxAdditional * Math.exp(-hours / decayConstant);
  return Math.max(0, Math.min(1, urgency));
}

// ============================================================================
// TIME UTILITIES - Convert between different time representations
// ============================================================================

/**
 * Convert HH:MM time string to minutes since midnight.
 * e.g., "09:30" -> 570
 */
function timeToMinutes(time: string): number {
  const DEFAULT_START_OF_DAY = 8 * 60; // 08:00 fallback

  if (!time) {
    return DEFAULT_START_OF_DAY;
  }

  try {
    // Handle ISO datetime or HH:MM format
    if (time.includes("T")) {
      const parsed = parseISO(time);
      if (isValid(parsed)) {
        return parsed.getHours() * 60 + parsed.getMinutes();
      }
    } else {
      const [hours, minutes] = time.split(":");
      const h = Number.parseInt(hours ?? "", 10);
      const m = Number.parseInt(minutes ?? "", 10);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        return h * 60 + m;
      }
    }
  } catch {
    // fall through
  }

  return DEFAULT_START_OF_DAY;
}

/**
 * Convert ISO datetime to minutes from baseDate.
 * e.g., if baseDate is 2024-01-01 00:00 and datetime is 2024-01-02 10:30,
 * returns 1530 (1 day + 10.5 hours = 1530 minutes)
 */
function datetimeToMinutes(dateTime: string, baseDate: Date): number {
  if (!dateTime) {
    return 0;
  }

  try {
    const parsed = parseISO(dateTime);
    if (!isValid(parsed)) {
      return 0;
    }
    const diff = parsed.getTime() - baseDate.getTime();
    return Math.max(0, Math.floor(diff / (60 * 1000)));
  } catch {
    return 0;
  }
}

/**
 * Convert minutes from baseDate to ISO datetime string.
 * Inverse of datetimeToMinutes.
 */
function minutesToDateTime(minutes: number, baseDate: Date): string {
  if (!Number.isFinite(minutes)) {
    return baseDate.toISOString();
  }

  const result = new Date(baseDate.getTime() + minutes * 60 * 1000);
  if (!isValid(result)) {
    return baseDate.toISOString();
  }

  return result.toISOString();
}

/**
 * Normalize energy profile to exactly 24 values between 0 and 1.
 */
function normalizeEnergyProfile(energy: number[]): number[] {
  const length = 24;
  
  if (!energy || energy.length === 0) {
    return Array.from({ length }, () => 0.5);
  }

  if (energy.length === length) {
    return energy.map((v) => clamp(v, 0, 1));
  }

  // Truncate or pad to 24 values
  const result = energy.slice(0, length).map((v) => clamp(v, 0, 1));
  if (result.length < length) {
    const average = result.length > 0 
      ? result.reduce((acc, value) => acc + value, 0) / result.length 
      : 0.5;
    while (result.length < length) {
      result.push(average);
    }
  }
  return result;
}

/**
 * Safely parse ISO datetime string, returning null on error.
 */
function safeParseISO(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

/**
 * Clamp a number between min and max (inclusive).
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
