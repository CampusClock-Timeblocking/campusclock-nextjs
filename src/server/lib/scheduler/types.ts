/**
 * ============================================================================
 * SCHEDULER TYPE DEFINITIONS
 * ============================================================================
 * 
 * This file contains all type definitions for the timeblocking scheduler.
 * The scheduler takes tasks, busy slots, and user preferences, then uses
 * a constraint solver to find optimal time slots for each task.
 * 
 * Main Flow:
 * 1. Input: ScheduleRequest (tasks, busy slots, working hours, energy profile)
 * 2. Validation: Convert to ValidatedScheduleRequest
 * 3. Transform: Build constraint problem for solver (SolverRequestPayload)
 * 4. Solve: Send to solver service, get back solution (SolverResponsePayload)
 * 5. Parse: Convert solver solution to scheduled tasks (ScheduleResponse)
 */

// ============================================================================
// SOLVER STATUS & RESPONSE TYPES
// ============================================================================

/** Status returned by the constraint solver */
export type SolverStatus = "OPTIMAL" | "FEASIBLE" | "INFEASIBLE" | "UNKNOWN";

/** User-friendly status for the overall schedule */
export type ScheduleStatus = "optimal" | "feasible" | "impossible" | "error";

// ============================================================================
// INPUT TYPES - What the caller provides
// ============================================================================

/**
 * A task to be scheduled.
 * Represents something the user needs to get done.
 */
export interface TaskInput {
  id: string;
  priority: number;           // 0.0 - 1.0 (higher = more important)
  durationMinutes: number;    // How long the task takes
  deadline?: string | null;   // ISO datetime when task must be completed by
  complexity?: number;        // 0.0 - 1.0 (higher = requires more mental energy)
  location?: string;          // Where the task happens (for clustering)
}

/**
 * A validated task with all optional fields filled in.
 * This is what we actually work with internally.
 */
export interface ValidatedTask extends TaskInput {
  priority: number;
  durationMinutes: number;
  complexity: number;
}

/**
 * A time slot that's already occupied (meetings, calendar events, etc).
 * Tasks cannot be scheduled during busy slots.
 */
export interface BusySlot {
  start: string;              // ISO datetime
  end: string;                // ISO datetime
  source?: string;            // Where this came from (e.g., "google", "calendar")
}

/**
 * Working hours for a single day.
 * Tasks can only be scheduled within these hours.
 */
export interface WorkingHours {
  startTime: string;          // HH:MM format (e.g., "09:00")
  endTime: string;            // HH:MM format (e.g., "17:00")
}

/**
 * Main input to the scheduler.
 * Contains everything needed to create a schedule.
 */
export interface ScheduleRequest {
  timeHorizon: number;        // How many days into the future to schedule
  tasks: TaskInput[];         // Tasks to schedule
  busySlots?: BusySlot[];    // Already occupied time slots
  workingHours: WorkingHours[]; // 7 entries (Monday-Sunday)
  energyProfile: number[];    // 24 entries (hour 0-23), values 0-1
  baseDate?: Date;            // Start date for scheduling (defaults to today)
  currentTime?: Date;         // Current time for urgency calculations
}

/**
 * Validated and normalized schedule request.
 * All optional fields are filled in with defaults.
 */
export interface ValidatedScheduleRequest extends ScheduleRequest {
  tasks: ValidatedTask[];
  busySlots: BusySlot[];
  energyProfile: number[];
  baseDate: Date;
  currentTime: Date;
}

// ============================================================================
// SOLVER COMMUNICATION TYPES
// ============================================================================

/** A continuous variable with min/max bounds */
export interface SolverVariable {
  id: string;
  min: number;
  max: number;
}

/** A boolean variable (true/false) */
export interface SolverBoolVariable {
  id: string;
}

/**
 * An interval with a start time, duration, and optional presence.
 * Represents a task or busy slot in the constraint problem.
 */
export interface SolverInterval {
  id: string;
  start_var: string;          // References a SolverVariable
  duration: number;           // Fixed duration in minutes
  end_var?: string;           // References a SolverVariable
  optional?: boolean;         // If true, interval might not be scheduled
  presence_var?: string;      // Boolean variable indicating if scheduled
}

/** Types of constraints we can express */
export type ConstraintType =
  | "no_overlap"      // Intervals cannot overlap
  | "less_equal"      // var <= value
  | "greater_equal"   // var >= value
  | "equal"           // var == value
  | "sum_equal"       // sum of terms == value
  | "bool_or";        // at least one boolean must be true

/**
 * A constraint that restricts possible solutions.
 * Different constraint types use different fields.
 */
export interface SolverConstraint {
  type: ConstraintType;
  left?: string;                          // Variable name (for comparison constraints)
  right?: number | string;                // Value or variable name
  equals?: number;                        // Target value (for sum_equal)
  intervals?: string[];                   // Interval IDs (for no_overlap)
  terms?: Array<{ var: string; coefficient?: number }>; // Terms (for sum_equal)
  literals?: string[];                    // Boolean literals (for bool_or)
  condition?: string;                     // Conditional constraint (applies only if this bool is true)
}

/** A term in the objective function */
export interface SolverObjectiveTerm {
  var: string;                // Variable name
  coefficient?: number;       // Weight (defaults to 1)
}

/** The objective function to maximize or minimize */
export interface SolverObjective {
  type: "maximize" | "minimize";
  terms: SolverObjectiveTerm[];
}

/**
 * Complete constraint problem sent to the solver.
 * This is the mathematical representation of the scheduling problem.
 */
export interface SolverRequestPayload {
  variables: SolverVariable[];
  bool_variables?: Array<SolverBoolVariable | string>;
  intervals?: SolverInterval[];
  constraints?: SolverConstraint[];
  objective?: SolverObjective;
}

/** A variable's assigned value in the solution */
export interface SolverVariableValue {
  id: string;
  value: number;
}

/** A boolean variable's assigned value in the solution */
export interface SolverBoolValue {
  id: string;
  value: boolean;
}

/** An interval's assigned time in the solution */
export interface SolverIntervalValue {
  id: string;
  start: number;              // Minutes from baseDate
  end: number;                // Minutes from baseDate
  presence: boolean;          // Whether this interval was scheduled
}

/**
 * Solution returned by the solver.
 * Contains the status and all variable assignments.
 */
export interface SolverResponsePayload {
  status: SolverStatus;
  objective_value?: number | null;
  wall_time: number;          // Solve time in seconds
  variables: SolverVariableValue[];
  bool_variables: SolverBoolValue[];
  intervals: SolverIntervalValue[];
}

// ============================================================================
// OUTPUT TYPES - What the scheduler returns
// ============================================================================

/**
 * A task that has been assigned a time slot.
 */
export interface ScheduledTask {
  id: string;
  start: string;              // ISO datetime
  end: string;                // ISO datetime
  metadata?: Record<string, unknown>;
}

/**
 * Analysis of how well complex tasks match user's energy levels.
 * Complex tasks should ideally be scheduled during high-energy hours.
 */
export interface EnergyComplexityAnalysis {
  complexTasks: number;       // Total number of complex tasks
  perfectMatches: number;     // Scheduled during energy >= 0.8
  goodMatches: number;        // Scheduled during energy >= 0.6
  poorMatches: number;        // Scheduled during energy < 0.6
  matchRate: number;          // perfectMatches / complexTasks
}

/**
 * Analysis of location clustering.
 * Tasks at the same location should ideally be grouped together.
 */
export interface LocationClusteringAnalysis {
  clusters: number;           // Number of location clusters
  efficiency: number;         // How well tasks are clustered (higher is better)
  locationDistribution: Record<string, number>; // Task count per location
}

/**
 * Analysis of workload distribution across days.
 * Work should ideally be balanced across days.
 */
export interface WorkloadBalanceAnalysis {
  balanceScore: number;       // Standard deviation of daily workload (lower is better)
  averageDailyWorkload: number; // Average minutes of work per day
  dailyWorkload: Record<string, number>; // Minutes of work per day (YYYY-MM-DD)
}

/**
 * Combined analysis of soft constraints.
 * These are preferences that we try to satisfy but aren't strict requirements.
 */
export interface SoftConstraintAnalysis {
  energy: EnergyComplexityAnalysis;
  location: LocationClusteringAnalysis;
  workload: WorkloadBalanceAnalysis;
  overallScore: number;       // Combined score 0-10 (higher is better)
}

/**
 * Complete scheduling result returned to the caller.
 */
export interface ScheduleResponse {
  status: ScheduleStatus;
  tasks: ScheduledTask[];
  solverStatus: SolverStatus;
  successRate: number;        // Fraction of tasks that were scheduled (0-1)
  softConstraints?: SoftConstraintAnalysis;
  meta?: {
    objectiveValue?: number | null;
    wallTimeMs: number;
    attemptCount?: number;    // How many horizon extensions were tried
  };
}

// ============================================================================
// INTERNAL HELPER TYPES
// ============================================================================

/**
 * Metadata tracking how a task maps to solver variables.
 * Used to extract task schedules from the solver solution.
 */
export interface TaskConstraintMetadata {
  taskId: string;
  startVar: string;           // Solver variable for start time
  endVar: string;             // Solver variable for end time
  intervalId: string;         // Solver interval ID
  presenceVar: string;        // Solver bool variable for whether task is scheduled
}

/**
 * Result of building a constraint problem.
 * Contains both the solver payload and metadata for parsing the response.
 */
export interface ConstraintBuildResult {
  payload: SolverRequestPayload;
  taskMetadata: TaskConstraintMetadata[];
}

/**
 * Components of a task's score used in the objective function.
 * Higher scores mean the task is more important to schedule.
 */
export interface TaskScoreComponents {
  priority: number;           // Base score from user priority
  urgency: number;            // Score from deadline proximity
  complexity: number;         // Small bonus for complex tasks
  total: number;              // Sum of all components
}
