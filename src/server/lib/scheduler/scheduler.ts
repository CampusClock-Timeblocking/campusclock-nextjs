/**
 * ============================================================================
 * ENHANCED SCHEDULER - Evolutionary Algorithm Implementation
 * ============================================================================
 *
 * This file contains the scheduler implementation. It:
 * 1. Validates schedule requests
 * 2. Converts input to the EA format
 * 3. Runs the evolutionary algorithm (ea-core.ts) — no external HTTP service
 * 4. Filters the raw EA result to keep only valid (non-conflicting) tasks
 * 5. Analyzes soft constraints (energy matching, location clustering, etc.)
 *
 */

import {
  differenceInHours,
  differenceInMinutes,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { z } from "zod";
import {
  DEFAULT_FITNESS_WEIGHTS,
  evolve,
  filterValidSchedule,
  parseWorkingHours,
  type EATask,
  type FitnessWeights,
} from "./ea-core";
import type {
  BusySlot,
  EnergyComplexityAnalysis,
  LocationClusteringAnalysis,
  ScheduleRequest,
  ScheduleResponse,
  ScheduledTask,
  SoftConstraintAnalysis,
  ValidatedScheduleRequest,
  ValidatedTask,
  WorkloadBalanceAnalysis,
} from "./types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const MIN_DURATION_MINUTES = 15;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const COMPLEXITY_THRESHOLD = 0.5;

// ============================================================================
// ENHANCED SCHEDULER CLASS
// ============================================================================

export interface EnhancedSchedulerOptions {
  /** EA population size (default 80) */
  populationSize?: number;
  /** Number of EA generations (default 300) */
  generations?: number;
  /** EA timeout in seconds (default 10.0) */
  timeoutSeconds?: number;
  /** Minimum success rate (0-1) before stopping horizon extensions */
  successThreshold?: number;
  /** Maximum number of days to extend the horizon when tasks don't fit */
  maxHorizonExtensions?: number;
}

export class EnhancedScheduler {
  private readonly populationSize: number;
  private readonly generations: number;
  private readonly timeoutSeconds: number;
  private readonly successThreshold: number;
  private readonly maxExtensions: number;

  constructor(options: EnhancedSchedulerOptions) {
    this.populationSize = options.populationSize ?? 80;
    this.generations = options.generations ?? 300;
    this.timeoutSeconds = options.timeoutSeconds ?? 10.0;
    this.successThreshold = options.successThreshold ?? 0.8;
    this.maxExtensions = options.maxHorizonExtensions ?? 7;
  }

  /**
   * Schedule tasks within the given constraints using the Evolutionary Algorithm.
   *
   * The scheduler will:
   * 1. Validate the request
   * 2. Convert to EA format and run evolve()
   * 3. Filter raw EA result to valid (non-conflicting) tasks only
   * 4. Try extending the time horizon if needed (up to maxExtensions times)
   * 5. Return the best solution found
   */
  async schedule(request: ScheduleRequest): Promise<ScheduleResponse> {
    // Handle empty task list
    if (!request.tasks || request.tasks.length === 0) {
      const effectiveSeed =
        request.seed !== undefined ? normalizeSeed(request.seed) : undefined;
      return {
        status: "optimal",
        solverStatus: "OPTIMAL",
        tasks: [],
        successRate: 1,
        meta: {
          objectiveValue: null,
          wallTimeMs: 0,
          attemptCount: 0,
          seed: effectiveSeed,
        },
      };
    }

    const validated = validateScheduleRequest(request);
    let bestResponse: ScheduleResponse | null = null;

    // Pre-convert busy slots to minute offsets (done once, reused per extension)
    const busySlotsMinutes = convertBusySlotsToMinutes(
      validated.busySlots,
      validated.baseDate,
    );

    // Convert tasks to EA format (done once)
    const eaTasks = validated.tasks.map(toEATask);
    const eaTaskMap = new Map(eaTasks.map((t) => [t.id, t]));

    for (let extension = 0; extension <= this.maxExtensions; extension++) {
      const timeHorizon = validated.timeHorizon + extension;
      const wallStart = Date.now();

      // Run the evolutionary algorithm
      const {
        schedule: rawSchedule,
        fitness,
        seed,
      } = evolve(
        eaTasks,
        busySlotsMinutes,
        validated.workingHours,
        validated.energyProfile,
        validated.baseDate,
        {
          timeHorizon,
          populationSize: this.populationSize,
          generations: this.generations,
          timeoutSeconds: this.timeoutSeconds,
          seed: validated.seed,
          fitnessWeights: validated.fitnessWeights,
        },
      );

      // Keep only tasks that satisfy all hard constraints
      const whParsed = parseWorkingHours(validated.workingHours);
      const validSchedule = filterValidSchedule(
        rawSchedule,
        eaTasks,
        busySlotsMinutes,
        whParsed,
      );

      const wallTimeMs = Date.now() - wallStart;

      // Convert minute offsets back to ISO datetime strings
      const scheduledTasks: ScheduledTask[] = Object.entries(validSchedule).map(
        ([taskId, startMin]) => {
          const task = eaTaskMap.get(taskId);
          return {
            id: taskId,
            start: minutesToDateTime(startMin, validated.baseDate),
            end: minutesToDateTime(
              startMin + (task?.durationMinutes ?? 0),
              validated.baseDate,
            ),
            metadata: {},
          };
        },
      );

      const successRate =
        validated.tasks.length > 0
          ? scheduledTasks.length / validated.tasks.length
          : 1;

      // Map success rate to status
      let status: ScheduleResponse["status"];
      let solverStatus: ScheduleResponse["solverStatus"];
      if (scheduledTasks.length === 0 && validated.tasks.length > 0) {
        status = "impossible";
        solverStatus = "INFEASIBLE";
      } else if (successRate >= 0.9) {
        status = "optimal";
        solverStatus = "OPTIMAL";
      } else if (successRate >= 0.5) {
        status = "feasible";
        solverStatus = "FEASIBLE";
      } else {
        status = "impossible";
        solverStatus = "INFEASIBLE";
      }

      const response: ScheduleResponse = {
        status,
        solverStatus,
        tasks: scheduledTasks,
        successRate,
        meta: {
          objectiveValue: Math.round(fitness),
          wallTimeMs,
          attemptCount: extension + 1,
          seed,
        },
      };

      if (response.tasks.length > 0) {
        response.softConstraints = analyseSoftConstraints(
          response.tasks,
          validated.tasks,
          validated.energyProfile,
        );
      }

      bestResponse = response;

      if (successRate >= this.successThreshold || solverStatus === "OPTIMAL") {
        break;
      }
    }

    return (
      bestResponse ?? {
        status: "error",
        solverStatus: "UNKNOWN",
        tasks: [],
        successRate: 0,
        meta: {
          objectiveValue: null,
          wallTimeMs: 0,
          attemptCount: 0,
        },
      }
    );
  }
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert a ValidatedTask (scheduler format) to an EATask (EA format).
 * durationMinutes is preserved as-is; location defaults to "Home" if unset
 * (validateScheduleRequest already defaults to "Office", so this is belt+suspenders).
 */
function toEATask(task: ValidatedTask): EATask {
  return {
    id: task.id,
    priority: task.priority,
    durationMinutes: task.durationMinutes,
    deadline: task.deadline,
    complexity: task.complexity,
    location: task.location ?? "Home",
    dependsOn: [], // no dependency field in DB schema
    preferredStartAfter: task.preferredStartAfter,
  };
}

/**
 * Convert BusySlot[] (ISO datetime strings) to minute-offset pairs.
 * Only slots with positive duration within the horizon are kept.
 */
function convertBusySlotsToMinutes(
  busySlots: BusySlot[],
  baseDate: Date,
): Array<[number, number]> {
  return busySlots
    .map((slot) => {
      const start = datetimeToMinutes(slot.start, baseDate);
      const end = datetimeToMinutes(slot.end, baseDate);
      return [start, end] as [number, number];
    })
    .filter(([s, e]) => e > s);
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
  preferredStartAfter: z.number().int().min(0).max(1439).optional(),
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

const FitnessWeightsSchema = z.object({
  deadlinePenalty: z.number().finite().positive(),
  energyPenalty: z.number().finite().positive(),
  earlinessBonus: z.number().finite().positive(),
  clusterBonus: z.number().finite().positive(),
});

const ScheduleSchema = z.object({
  timeHorizon: z.number().int().positive(),
  tasks: z.array(TaskSchema).nonempty("At least one task is required"),
  busySlots: z.array(BusySlotSchema).optional(),
  workingHours: z
    .array(WorkingHoursSchema)
    .length(7, "workingHours must have 7 entries"),
  energyProfile: z
    .array(z.number().finite())
    .nonempty("energyProfile cannot be empty"),
  fitnessWeights: FitnessWeightsSchema.optional(),
  baseDate: z.date().optional(),
  currentTime: z.date().optional(),
  seed: z.number().int().nonnegative().optional(),
});

/**
 * Validate and normalize a schedule request.
 * - Validates types and formats using Zod schemas
 * - Fills in default values for optional fields
 * - Normalizes values to expected ranges
 * - Validates working hours make sense
 */
export function validateScheduleRequest(
  input: ScheduleRequest,
): ValidatedScheduleRequest {
  const parsed = ScheduleSchema.parse(input);

  const currentTime = parsed.currentTime ?? new Date();
  const baseDate = parsed.baseDate
    ? startOfDay(parsed.baseDate)
    : startOfDay(currentTime);
  const seed = normalizeSeed(
    parsed.seed ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0,
  );

  // Normalize tasks
  const tasks: ValidatedTask[] = parsed.tasks.map((task) => ({
    id: task.id,
    priority: clamp(task.priority, 0, 1),
    durationMinutes: Math.max(
      MIN_DURATION_MINUTES,
      Math.round(task.durationMinutes),
    ),
    deadline: task.deadline ?? undefined,
    complexity: clamp(task.complexity ?? 0.5, 0, 1),
    location: task.location ?? "Office",
    preferredStartAfter: task.preferredStartAfter,
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
    // Allow 00:00-00:00 (closed day) — only raise for genuinely inverted ranges
    if (startMinutes > 0 && startMinutes >= endMinutes) {
      throw new Error(
        `Invalid working hours on day index ${index}: start must be before end: ${hours.startTime} - ${hours.endTime}`,
      );
    }
  });

  // Normalize energy profile to 24 hours with values 0-1
  const energyProfile = normalizeEnergyProfile(parsed.energyProfile);
  const fitnessWeights = normalizeFitnessWeights(parsed.fitnessWeights);

  return {
    ...parsed,
    tasks,
    busySlots,
    energyProfile,
    fitnessWeights,
    currentTime,
    baseDate,
    seed,
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
  energyProfile: number[],
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
  energyProfile: number[],
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

    const start = scheduledTask.start
      ? safeParseISO(scheduledTask.start)
      : null;
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
  tasks: ValidatedTask[],
): LocationClusteringAnalysis {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const locationDays = new Map<string, Set<string>>(); // location -> set of days
  const locationCounts = new Map<string, number>(); // location -> task count

  for (const scheduledTask of scheduled) {
    const task = taskById.get(scheduledTask.id);
    if (!task) {
      continue;
    }

    const start = scheduledTask.start
      ? safeParseISO(scheduledTask.start)
      : null;
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
  const efficiency =
    locationCounts.size > 0 ? totalEfficiency / locationCounts.size : 0;

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
function analyzeWorkloadBalance(
  scheduled: ScheduledTask[],
): WorkloadBalanceAnalysis {
  const dailyWorkload = new Map<string, number>(); // day -> minutes

  for (const scheduledTask of scheduled) {
    const start = scheduledTask.start
      ? safeParseISO(scheduledTask.start)
      : null;
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
  const avg =
    workloads.reduce((acc, value) => acc + value, 0) / workloads.length;

  // Calculate standard deviation (lower = more balanced)
  const variance =
    workloads.reduce((acc, value) => acc + (value - avg) ** 2, 0) /
    workloads.length;
  const balanceScore = Math.sqrt(variance);

  return {
    balanceScore,
    averageDailyWorkload: avg,
    dailyWorkload: Object.fromEntries(dailyWorkload.entries()),
  };
}

// ============================================================================
// SCORING - Calculate task importance (kept for potential future use)
// ============================================================================

/**
 * Calculate urgency based on deadline proximity (0-1).
 */
function calculateUrgency(
  deadline: string | null | undefined,
  currentTime: Date,
): number {
  if (!deadline) return 0;

  let deadlineDate: Date;
  try {
    deadlineDate = parseISO(deadline);
    if (Number.isNaN(deadlineDate.getTime())) return 0;
  } catch {
    return 0;
  }

  const hours = differenceInHours(deadlineDate, currentTime, {
    roundingMethod: "round",
  });

  if (hours <= 0) return 1;

  const decayConstant = 24;
  const floor = 0.1;
  const maxAdditional = 0.9;
  const urgency = floor + maxAdditional * Math.exp(-hours / decayConstant);
  return Math.max(0, Math.min(1, urgency));
}

// Suppress unused-variable warning — kept for potential future use
void calculateUrgency;

// ============================================================================
// TIME UTILITIES
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
 */
function datetimeToMinutes(dateTime: string, baseDate: Date): number {
  if (!dateTime) return 0;

  try {
    const parsed = parseISO(dateTime);
    if (!isValid(parsed)) return 0;
    const diff = parsed.getTime() - baseDate.getTime();
    return Math.max(0, Math.floor(diff / (60 * 1000)));
  } catch {
    return 0;
  }
}

/**
 * Convert minutes from baseDate to ISO datetime string.
 */
function minutesToDateTime(minutes: number, baseDate: Date): string {
  if (!Number.isFinite(minutes)) return baseDate.toISOString();

  const result = new Date(baseDate.getTime() + minutes * 60 * 1000);
  if (!isValid(result)) return baseDate.toISOString();

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

  const result = energy.slice(0, length).map((v) => clamp(v, 0, 1));
  if (result.length < length) {
    const average =
      result.length > 0
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
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ============================================================================
// MATH UTILITIES
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeSeed(seed: number): number {
  const normalized = Math.floor(seed) >>> 0;
  return normalized === 0 ? 1 : normalized;
}

function normalizeFitnessWeights(
  weights: ScheduleRequest["fitnessWeights"] | undefined,
): FitnessWeights {
  return {
    deadlinePenalty:
      weights?.deadlinePenalty ?? DEFAULT_FITNESS_WEIGHTS.deadlinePenalty,
    energyPenalty:
      weights?.energyPenalty ?? DEFAULT_FITNESS_WEIGHTS.energyPenalty,
    earlinessBonus:
      weights?.earlinessBonus ?? DEFAULT_FITNESS_WEIGHTS.earlinessBonus,
    clusterBonus: weights?.clusterBonus ?? DEFAULT_FITNESS_WEIGHTS.clusterBonus,
  };
}
