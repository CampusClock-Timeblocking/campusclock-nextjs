/**
 * ============================================================================
 * EVOLUTIONARY ALGORITHM CORE — Task Scheduling
 * ============================================================================
 *
 * TypeScript port of ea_core.py.
 * Pure algorithm logic — no database or HTTP dependencies.
 *
 * Performance architecture (mirrors Python original):
 *   evolve() precomputes once per call:
 *     - whParsed:         WorkingHours[] → [start_min, end_min][]
 *     - taskMap:          Map<id, EATask>
 *     - deadlineMinutes:  Map<id, number>  (ISO parse done once)
 *     - reverseDeps:      Map<id, string[]> (for O(degree) mutation)
 *     - baseSlots:        Map<id, number[]> (all valid start minutes)
 *
 *   Fitness function:
 *     - Overlap detection: O(N log N) via sorted sweep
 *     - No string parsing in hot path
 */

import type { WorkingHours } from "./types";

// ============================================================================
// Constants
// ============================================================================

const MINUTES_PER_DAY = 24 * 60; // 1440
const GRANULARITY = 15;
const GREEDY_CANDIDATES = 5;

// ============================================================================
// Public Types
// ============================================================================

/** Internal task representation for the EA (duration in minutes, not durationMinutes) */
export interface EATask {
  id: string;
  priority: number; // 0.0–1.0
  durationMinutes: number; // minutes (Python: task.duration)
  deadline?: string | null; // ISO datetime
  complexity: number; // 0.0–1.0
  location: string;
  dependsOn: string[]; // always [] in current DB schema
}

/** taskId → startMinute offset from baseDate */
export type EASchedule = Record<string, number>;

export interface EvolveResult {
  schedule: EASchedule;
  fitness: number;
  curve: number[];
}

export interface EvolveOptions {
  timeHorizon?: number; // default 7
  populationSize?: number; // default 80
  generations?: number; // default 300
  timeoutSeconds?: number; // default 10.0
}

// ============================================================================
// Binary Search Utilities (port of Python bisect module)
// ============================================================================

/**
 * Return insertion point for val in sorted arr[lo..hi) — left-biased.
 * Equivalent to Python bisect.bisect_left(arr, val, lo, hi).
 */
function bisectLeft(
  arr: number[],
  val: number,
  lo = 0,
  hi = arr.length,
): number {
  let low = lo;
  let high = hi;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if ((arr[mid] ?? 0) < val) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/**
 * Return insertion point for val in sorted arr[lo..hi) — right-biased.
 * Equivalent to Python bisect.bisect_right(arr, val, lo, hi).
 */
function bisectRight(
  arr: number[],
  val: number,
  lo = 0,
  hi = arr.length,
): number {
  let low = lo;
  let high = hi;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if ((arr[mid] ?? 0) <= val) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

/** Pick a uniformly random element from arr. */
function randomChoice<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("randomChoice: empty array");
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/**
 * Return k unique random indices in [0, n).
 * Partial Fisher-Yates equivalent to Python random.sample(range(n), k).
 */
function randomSample(n: number, k: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  const actual = Math.min(k, n);
  for (let i = 0; i < actual; i++) {
    const j = i + Math.floor(Math.random() * (n - i));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, actual);
}

// ============================================================================
// Working Hours Parsing
// ============================================================================

/**
 * Convert WorkingHours[] to [dayStart_min, dayEnd_min][] (minutes since midnight).
 * Reads camelCase TypeScript fields (startTime/endTime).
 * Equivalent to Python _parse_working_hours().
 */
export function parseWorkingHours(
  workingHours: WorkingHours[],
): Array<[number, number]> {
  return workingHours.map((wh) => {
    const [sh = 0, sm = 0] = wh.startTime.split(":").map(Number);
    const [eh = 0, em = 0] = wh.endTime.split(":").map(Number);
    return [sh * 60 + sm, eh * 60 + em] as [number, number];
  });
}

/**
 * Return [globalStart, globalEnd] for the given day index.
 * Returns [0, 0] for closed days (start == end) or missing entries.
 * Cycles weekly (day % len(whParsed)).
 */
function getDayWorkingRange(
  day: number,
  whParsed: Array<[number, number]>,
): [number, number] {
  if (whParsed.length === 0) return [0, 0];
  const [ds, de] = whParsed[day % whParsed.length] ?? [0, 0];
  if (ds === de) return [0, 0];
  return [day * MINUTES_PER_DAY + ds, day * MINUTES_PER_DAY + de];
}

// ============================================================================
// Precomputation Helpers
// ============================================================================

/**
 * Build reverse dependency map: id → [ids of tasks that depend on id].
 * Enables O(degree) constraint checking in mutate().
 */
export function buildReverseDeps(tasks: EATask[]): Map<string, string[]> {
  const taskIds = new Set(tasks.map((t) => t.id));
  const rev = new Map<string, string[]>();
  for (const t of tasks) {
    for (const dep of t.dependsOn) {
      if (taskIds.has(dep)) {
        const list = rev.get(dep) ?? [];
        list.push(t.id);
        rev.set(dep, list);
      }
    }
  }
  return rev;
}

/**
 * Convert task deadlines from ISO strings to minute offsets from baseDate.
 * Computed once per evolve() call to avoid repeated date parsing.
 */
export function buildDeadlineMinutes(
  tasks: EATask[],
  baseDate: Date,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const t of tasks) {
    if (!t.deadline) continue;
    try {
      const ms = new Date(t.deadline).getTime() - baseDate.getTime();
      result.set(t.id, Math.floor(ms / 60000));
    } catch {
      // ignore invalid deadline
    }
  }
  return result;
}

// ============================================================================
// Constraint Checks
// ============================================================================

/**
 * Check if [startMin, endMin) lies fully within the working hours of its day.
 * O(1) — day derived directly from startMin.
 */
export function isWithinWorkingHours(
  startMin: number,
  endMin: number,
  whParsed: Array<[number, number]>,
): boolean {
  const day = Math.floor(startMin / MINUTES_PER_DAY);
  const [gs, ge] = getDayWorkingRange(day, whParsed);
  if (gs === ge) return false;
  return startMin >= gs && endMin <= ge;
}

/**
 * Check if [startMin, endMin) overlaps any busy slot.
 * O(B) where B = number of busy slots.
 */
export function hasBusyConflict(
  startMin: number,
  endMin: number,
  busySlots: Array<[number, number]>,
): boolean {
  for (const [bs, be] of busySlots) {
    if (startMin < be && endMin > bs) return true;
  }
  return false;
}

/**
 * Return all valid start minutes for a task of given duration.
 * A slot is valid if the task fits within one day's working hours.
 * Granularity: 15 minutes.
 */
export function getValidStartSlots(
  earliestStart: number,
  duration: number,
  whParsed: Array<[number, number]>,
  horizonMinutes: number,
  granularity = GRANULARITY,
): number[] {
  const valid: number[] = [];
  for (
    let day = 0;
    day < Math.floor(horizonMinutes / MINUTES_PER_DAY);
    day++
  ) {
    const [gs, ge] = getDayWorkingRange(day, whParsed);
    if (gs === ge) continue;
    let slot = Math.max(gs, earliestStart);
    if (slot % granularity !== 0) {
      slot = (Math.floor(slot / granularity) + 1) * granularity;
    }
    while (slot + duration <= ge && slot < horizonMinutes) {
      if (slot >= earliestStart) valid.push(slot);
      slot += granularity;
    }
  }
  return valid;
}

/**
 * Return the energy level for a given global start minute.
 * Indexes into the 24-element hourly energy profile.
 */
export function getEnergyAt(
  startMin: number,
  energyLevels: number[],
): number {
  const hour = Math.floor((startMin % MINUTES_PER_DAY) / 60);
  return energyLevels[Math.min(hour, energyLevels.length - 1)] ?? 0.5;
}

// ============================================================================
// Topological Sort (Kahn's Algorithm)
// ============================================================================

/**
 * Return task IDs in valid dependency order.
 * Since all dependsOn are [] in the current schema, this returns ids in
 * original order. Throws if a cycle is detected.
 */
export function topologicalSort(tasks: EATask[]): string[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  const inDegree = new Map<string, number>(tasks.map((t) => [t.id, 0]));
  const graph = new Map<string, string[]>();

  for (const t of tasks) {
    for (const dep of t.dependsOn) {
      if (taskIds.has(dep)) {
        const list = graph.get(dep) ?? [];
        list.push(t.id);
        graph.set(dep, list);
        inDegree.set(t.id, (inDegree.get(t.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const tid = queue.shift()!;
    sorted.push(tid);
    for (const successor of graph.get(tid) ?? []) {
      const newDeg = (inDegree.get(successor) ?? 1) - 1;
      inDegree.set(successor, newDeg);
      if (newDeg === 0) queue.push(successor);
    }
  }

  if (sorted.length !== tasks.length) {
    throw new Error("Cyclic dependency detected in tasks");
  }
  return sorted;
}

// ============================================================================
// Fitness Function
// ============================================================================

/**
 * Calculate fitness score for a schedule (minimisation problem).
 *
 * Hard penalties:
 *   deadline  +10000   task ends after deadline
 *   dep_*     +8000    dependency order violated
 *   busy      +5000    busy slot conflict
 *   hours     +5000    outside working hours
 *   overlap   +7000    overlap with another task (O(N log N) sweep)
 *
 * Soft penalty:
 *   low_energy +200    complex task (≥0.7) during low energy (<0.5)
 *
 * Bonuses (subtracted):
 *   high_energy -150   complex task during high energy (≥0.8)
 *   early       -x     priority × (10000 − start) / 100
 *   cluster     -100   per task in location cluster (≥2 same location+day)
 */
export function calculateFitness(
  schedule: EASchedule,
  tasks: EATask[],
  busySlots: Array<[number, number]>,
  energyLevels: number[],
  horizonMinutes: number,
  whParsed: Array<[number, number]>,
  taskMap: Map<string, EATask>,
  deadlineMinutes: Map<string, number>,
): number {
  // O(N log N) overlap detection via sorted sweep
  const intervals: Array<[number, number, string]> = tasks
    .filter((t) => t.id in schedule)
    .map((t) => [schedule[t.id]!, schedule[t.id]! + t.durationMinutes, t.id]);
  intervals.sort((a, b) => a[0] - b[0]);

  const tasksWithOverlap = new Set<string>();
  for (let i = 0; i < intervals.length; i++) {
    const [, ei, ti] = intervals[i]!;
    for (let j = i + 1; j < intervals.length; j++) {
      const [sj, , tj] = intervals[j]!;
      if (sj >= ei) break; // all later tasks start after this one ends
      tasksWithOverlap.add(ti);
      tasksWithOverlap.add(tj);
    }
  }

  let total = 0;

  for (const task of tasks) {
    if (!(task.id in schedule)) continue;
    const start = schedule[task.id]!;
    const end = start + task.durationMinutes;
    let p = 0;
    let b = 0;

    // Deadline penalty
    const dl = deadlineMinutes.get(task.id);
    if (dl !== undefined && end > dl) p += 10000;

    // Dependency order penalty
    for (const dep of task.dependsOn) {
      const depTask = taskMap.get(dep);
      if (depTask !== undefined && dep in schedule) {
        if (start < (schedule[dep] ?? 0) + depTask.durationMinutes) {
          p += 8000;
        }
      }
    }

    // Busy slot conflict
    if (hasBusyConflict(start, end, busySlots)) p += 5000;

    // Outside working hours
    if (!isWithinWorkingHours(start, end, whParsed)) p += 5000;

    // Overlap with another task
    if (tasksWithOverlap.has(task.id)) p += 7000;

    // Energy matching
    const energy = getEnergyAt(start, energyLevels);
    if (task.complexity >= 0.7 && energy < 0.5) p += 200;
    if (task.complexity >= 0.7 && energy >= 0.8) b += 150;

    // Earliness bonus
    b += task.priority * (10000 - start) / 100;

    total += p - b;
  }

  // Location cluster bonus (-100 per task in a cluster of ≥2)
  const locDay = new Map<string, number>();
  for (const task of tasks) {
    if (!(task.id in schedule)) continue;
    const day = Math.floor((schedule[task.id] ?? 0) / MINUTES_PER_DAY);
    const key = `${task.location}::${day}`;
    locDay.set(key, (locDay.get(key) ?? 0) + 1);
  }
  let clusterBonus = 0;
  for (const count of locDay.values()) {
    if (count >= 2) clusterBonus += 100 * count;
  }
  total -= clusterBonus;

  return total;
}

// ============================================================================
// EA Operators
// ============================================================================

/**
 * Create an overlap-free individual via greedy day bin-packing.
 *
 * Algorithm O(N × D):
 *  1. Per day, track next available start minute (day_next_start)
 *  2. For each task (topological order): find eligible days with enough capacity
 *  3. Pick randomly from first GREEDY_CANDIDATES eligible days → diversity
 *  4. Assign sequentially within chosen day → structural overlap-freedom
 */
function createIndividual(
  tasks: EATask[],
  sortedIds: string[],
  timeHorizon: number,
  taskMap: Map<string, EATask>,
  baseSlots: Map<string, number[]>,
  whParsed: Array<[number, number]>,
): EASchedule {
  const schedule: EASchedule = {};

  // Next free start minute per day (initialised to day's working start)
  const dayNextStart: number[] = Array.from({ length: timeHorizon }, (_, d) => {
    const [gs] = getDayWorkingRange(d, whParsed);
    return gs;
  });

  for (const tid of sortedIds) {
    const task = taskMap.get(tid);
    if (!task) continue;

    // Earliest start respecting dependencies
    let earliest = 0;
    for (const dep of task.dependsOn) {
      const depTask = taskMap.get(dep);
      if (depTask && dep in schedule) {
        earliest = Math.max(
          earliest,
          (schedule[dep] ?? 0) + depTask.durationMinutes,
        );
      }
    }

    // Find eligible days with enough remaining capacity
    const eligible: Array<[number, number]> = []; // [day, chosenStart]
    for (let day = 0; day < timeHorizon; day++) {
      const [gs, ge] = getDayWorkingRange(day, whParsed);
      if (gs === ge) continue; // closed day
      let start = Math.max(dayNextStart[day] ?? gs, earliest);
      if (start % GRANULARITY !== 0) {
        start = (Math.floor(start / GRANULARITY) + 1) * GRANULARITY;
      }
      if (start + task.durationMinutes <= ge) {
        eligible.push([day, start]);
      }
    }

    let chosen: number;
    if (eligible.length > 0) {
      const top = eligible.slice(0, GREEDY_CANDIDATES);
      const [day, chosenStart] = randomChoice(top);
      dayNextStart[day] = chosenStart + task.durationMinutes;
      chosen = chosenStart;
    } else {
      // Fallback: first valid slot from base_slots (may overlap)
      const base = baseSlots.get(tid) ?? [];
      const idx = bisectLeft(base, earliest);
      chosen =
        idx < base.length
          ? (base[idx] ?? Math.ceil(earliest / GRANULARITY) * GRANULARITY)
          : Math.ceil(earliest / GRANULARITY) * GRANULARITY;
    }

    schedule[tid] = chosen;
  }

  return schedule;
}

/**
 * Shift random tasks by ±15–180 minutes, respecting topological order.
 * mutation_rate: probability of mutating each task.
 */
function mutate(
  individual: EASchedule,
  tasks: EATask[],
  timeHorizon: number,
  mutationRate: number,
  taskMap: Map<string, EATask>,
  reverseDeps: Map<string, string[]>,
  baseSlots: Map<string, number[]>,
): EASchedule {
  const ind = { ...individual };
  const horizon = timeHorizon * MINUTES_PER_DAY;

  for (const task of tasks) {
    if (Math.random() > mutationRate) continue;

    // Earliest start (dependencies push forward)
    let earliest = 0;
    for (const dep of task.dependsOn) {
      const depTask = taskMap.get(dep);
      if (depTask && dep in ind) {
        earliest = Math.max(earliest, (ind[dep] ?? 0) + depTask.durationMinutes);
      }
    }

    // Latest start (dependents push backward)
    let latest = horizon - task.durationMinutes;
    for (const dependentId of reverseDeps.get(task.id) ?? []) {
      if (dependentId in ind) {
        latest = Math.min(latest, (ind[dependentId] ?? latest) - task.durationMinutes);
      }
    }

    if (earliest >= latest) continue;

    // Random delta: ±{15,30,...,180} minutes
    const deltas: number[] = [];
    for (let d = -180; d <= 180; d += GRANULARITY) deltas.push(d);
    const delta = randomChoice(deltas);
    let candidate = Math.max(
      earliest,
      Math.min(latest, (ind[task.id] ?? earliest) + delta),
    );
    candidate = Math.floor(candidate / GRANULARITY) * GRANULARITY;

    const base = baseSlots.get(task.id) ?? [];
    if (base.length > 0) {
      const lo = bisectLeft(base, earliest);
      const hi = bisectRight(base, latest);
      if (lo >= hi) continue;
      // Find nearest base slot to candidate
      const pos = bisectLeft(base, candidate, lo, hi);
      let best: number | undefined;
      if (pos < hi) best = base[pos];
      if (
        pos > lo &&
        (best === undefined ||
          Math.abs((base[pos - 1] ?? 0) - candidate) < Math.abs(best - candidate))
      ) {
        best = base[pos - 1];
      }
      if (best !== undefined) ind[task.id] = best;
    } else {
      ind[task.id] = candidate;
    }
  }

  return ind;
}

/**
 * Uniform crossover: each task randomly taken from parent1 or parent2.
 */
function crossover(p1: EASchedule, p2: EASchedule): EASchedule {
  const result: EASchedule = {};
  const keys = new Set([...Object.keys(p1), ...Object.keys(p2)]);
  for (const k of keys) {
    result[k] =
      Math.random() < 0.5 ? (p1[k] ?? p2[k] ?? 0) : (p2[k] ?? p1[k] ?? 0);
  }
  return result;
}

/**
 * Tournament selection (k=3 by default).
 * Returns the individual with the lowest fitness among k random competitors.
 */
function tournament(
  population: EASchedule[],
  fitnesses: number[],
  k = 3,
): EASchedule {
  const indices = randomSample(population.length, Math.min(k, population.length));
  let bestIdx = indices[0]!;
  for (const idx of indices) {
    if ((fitnesses[idx] ?? Infinity) < (fitnesses[bestIdx] ?? Infinity)) {
      bestIdx = idx;
    }
  }
  return { ...population[bestIdx]! };
}

// ============================================================================
// Main EA Entry Point
// ============================================================================

/**
 * Run the evolutionary algorithm to produce an optimised task schedule.
 *
 * @param tasks          Tasks to schedule (with durationMinutes, not duration)
 * @param busySlots      Pre-converted minute-offset pairs [startMin, endMin]
 * @param workingHours   7-day working hours (Mon-Sun), HH:MM format
 * @param energyLevels   24-element hourly energy profile (0-1)
 * @param baseDate       Start of scheduling horizon (time 00:00:00)
 * @param options        EA tuning parameters
 * @returns              Best schedule found, its fitness, and fitness curve
 */
export function evolve(
  tasks: EATask[],
  busySlots: Array<[number, number]>,
  workingHours: WorkingHours[],
  energyLevels: number[],
  baseDate: Date,
  options?: EvolveOptions,
): EvolveResult {
  const timeHorizon = options?.timeHorizon ?? 7;
  const populationSize = options?.populationSize ?? 80;
  const generations = options?.generations ?? 300;
  const timeoutSeconds = options?.timeoutSeconds ?? 10.0;

  const t0 = Date.now();
  const horizon = timeHorizon * MINUTES_PER_DAY;

  // ── Precompute (once per request) ─────────────────────────────────────────
  const taskMap = new Map<string, EATask>(tasks.map((t) => [t.id, t]));
  const whParsed = parseWorkingHours(workingHours);
  const deadlineMinutes = buildDeadlineMinutes(tasks, baseDate);
  const reverseDeps = buildReverseDeps(tasks);

  // All valid slots per task (earliest=0 → full list; filtered during create/mutate)
  const baseSlots = new Map<string, number[]>(
    tasks.map((t) => [
      t.id,
      getValidStartSlots(0, t.durationMinutes, whParsed, horizon),
    ]),
  );

  let sortedIds: string[];
  try {
    sortedIds = topologicalSort(tasks);
  } catch {
    sortedIds = tasks.map((t) => t.id);
  }

  // ── Score closure ──────────────────────────────────────────────────────────
  const score = (ind: EASchedule): number =>
    calculateFitness(
      ind,
      tasks,
      busySlots,
      energyLevels,
      horizon,
      whParsed,
      taskMap,
      deadlineMinutes,
    );

  // ── Initial population ─────────────────────────────────────────────────────
  let pop: EASchedule[] = Array.from({ length: populationSize }, () =>
    createIndividual(tasks, sortedIds, timeHorizon, taskMap, baseSlots, whParsed),
  );
  let fits = pop.map(score);

  let bestIdx = fits.reduce((bi, f, i) => (f < (fits[bi] ?? Infinity) ? i : bi), 0);
  let bestInd = { ...pop[bestIdx]! };
  let bestFit = fits[bestIdx] ?? 0;
  const curve: number[] = [bestFit];
  const eliteN = Math.max(1, Math.floor(populationSize * 0.3));

  // ── Evolution loop ─────────────────────────────────────────────────────────
  for (let gen = 0; gen < generations; gen++) {
    if ((Date.now() - t0) / 1000 > timeoutSeconds) break;

    // Sort indices by fitness (ascending = lower is better)
    const ranked = Array.from({ length: pop.length }, (_, i) => i).sort(
      (a, b) => (fits[a] ?? 0) - (fits[b] ?? 0),
    );

    const newPop: EASchedule[] = ranked
      .slice(0, eliteN)
      .map((i) => ({ ...pop[i]! }));

    while (newPop.length < populationSize) {
      let child = crossover(tournament(pop, fits), tournament(pop, fits));
      child = mutate(child, tasks, timeHorizon, 0.2, taskMap, reverseDeps, baseSlots);
      newPop.push(child);
    }

    pop = newPop;
    fits = pop.map(score);

    const gBest = fits.reduce(
      (bi, f, i) => (f < (fits[bi] ?? Infinity) ? i : bi),
      0,
    );
    if ((fits[gBest] ?? 0) < bestFit) {
      bestFit = fits[gBest] ?? 0;
      bestInd = { ...pop[gBest]! };
    }
    curve.push(bestFit);
  }

  return { schedule: bestInd, fitness: bestFit, curve };
}

// ============================================================================
// Post-Processing: Filter to Valid-Only Tasks
// ============================================================================

/**
 * From the raw EA schedule (all tasks assigned), keep only tasks that:
 *  1. Fall within working hours
 *  2. Do not conflict with busy slots
 *  3. Do not overlap any higher-priority already-accepted task
 *
 * Tasks are processed in descending priority order so high-priority tasks
 * take precedence when there is an overlap conflict.
 *
 * This replaces the CP-SAT solver's "optional interval" / presence variable.
 */
export function filterValidSchedule(
  schedule: EASchedule,
  tasks: EATask[],
  busySlots: Array<[number, number]>,
  whParsed: Array<[number, number]>,
): EASchedule {
  // Sort by priority descending (high priority gets first pick)
  const sorted = [...tasks].sort((a, b) => b.priority - a.priority);
  const accepted: EASchedule = {};
  // Track accepted intervals for overlap check
  const acceptedIntervals: Array<[number, number]> = [];

  for (const task of sorted) {
    if (!(task.id in schedule)) continue;
    const startMin = schedule[task.id]!;
    const endMin = startMin + task.durationMinutes;

    if (!isWithinWorkingHours(startMin, endMin, whParsed)) continue;
    if (hasBusyConflict(startMin, endMin, busySlots)) continue;
    if (hasBusyConflict(startMin, endMin, acceptedIntervals)) continue;

    accepted[task.id] = startMin;
    acceptedIntervals.push([startMin, endMin]);
  }

  return accepted;
}
