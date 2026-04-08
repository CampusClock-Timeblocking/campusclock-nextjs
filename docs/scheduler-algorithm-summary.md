# CampusClock Scheduler — Algorithm Summary

## Overview

CampusClock uses an **Evolutionary Algorithm (EA)** to schedule study tasks into a student's calendar. The scheduler runs entirely in-process (TypeScript, no external solver), and is complemented by a **learning loop** that improves scheduling quality over time based on how the student actually completes tasks.

---

## 1. Problem Statement

Given a set of tasks (each with a duration, priority, optional deadline, complexity, and location) and a set of constraints (working hours, existing calendar events, energy preferences), find a time slot for each task that:

- Respects all **hard constraints** (working hours, busy slots, no overlaps)
- Optimises for **soft constraints** (energy matching, deadline proximity, location clustering, earliness)


---

## 2. Inputs

| Input | Source | Description |
|---|---|---|
| **Tasks** | Database | `id`, `priority` (0–1), `durationMinutes`, optional `deadline`, `complexity` (0–1), `location` |
| **Busy Slots** | Google Calendar + local events | Pre-existing commitments converted to minute-offset intervals |
| **Working Hours** | User preferences | 7-day schedule (Mon–Sun), `HH:MM` start/end per day; `00:00–00:00` = day off |
| **Energy Profile** | User preferences (learned) | 24-element array (one per hour), values 0–1 representing alertness |
| **Fitness Weights** | User preferences (learned) | Tuneable multipliers for deadline, energy, earliness, and clustering terms |
| **Duration Multiplier** | Learned | Scales task durations based on historical actual-vs-estimated ratio |

All times are internally converted to **minute offsets from a base date** to avoid repeated date parsing in the hot loop.

---

## 3. Algorithm: Evolutionary Optimisation

### 3.1 Representation

A **schedule** (individual) is a mapping `taskId → startMinute`, where `startMinute` is the minute offset from the base date. The search space is discretised to a **15-minute grid**.

### 3.2 Initialisation — Greedy Bin-Packing

Each individual in the initial population is built via a greedy heuristic:

1. Tasks are processed in **topological order** (supports dependency chains; currently all independent).
2. For each task, find up to 5 eligible days with enough remaining capacity.
3. Pick one at random (introduces diversity across the population).
4. Assign the task to the next free slot on that day.

This produces structurally valid starting solutions, giving the EA a strong foundation rather than random noise.

### 3.3 Fitness Function (Minimisation)

Each individual is scored by summing penalties and subtracting bonuses:

**Hard constraint penalties (large, fixed):**

| Violation | Penalty |
|---|---|
| Deadline missed | +10,000 × `weightDeadlinePenalty` |
| Dependency order violated | +8,000 |
| Task–task overlap | +7,000 |
| Busy slot conflict | +5,000 |
| Outside working hours | +5,000 |

**Soft constraint penalties/bonuses:**

| Condition | Effect |
|---|---|
| Complex task (≥0.7) in low energy hour (<0.5) | +200 × `weightEnergyPenalty` |
| Complex task in high energy hour (≥0.8) | −150 |
| Task before preferred start time | +400 |
| Earliness (high priority + early slot) | −`weightEarlinessBonus` × priority × (10000 − start) / 100 |
| Location cluster (≥2 tasks, same location, same day) | −100 × `weightClusterBonus` × count |

Overlap detection uses a **sorted-interval sweep** for O(N log N) performance.

### 3.4 Selection, Crossover, Mutation

| Operator | Strategy |
|---|---|
| **Selection** | Tournament (k=3): pick 3 random individuals, the fittest wins |
| **Crossover** | Uniform: for each task, randomly inherit the start time from parent A or parent B |
| **Mutation** | Per-task 20% probability; shift by ±15 to ±180 minutes, snapped to nearest valid slot within dependency bounds |
| **Elitism** | Top 30% of the population survives unchanged to the next generation |

### 3.5 Evolution Parameters

| Parameter | Default |
|---|---|
| Population size | 80 |
| Generations | 300 |
| Wall-clock timeout | 10 seconds |
| PRNG | Mulberry32 (deterministic, seeded) |

The algorithm terminates when either the generation cap or the timeout is reached.

### 3.6 Post-Processing — Priority-Based Filtering

The EA's best individual may still contain minor hard-constraint violations (the EA *penalises* them heavily but doesn't *guarantee* feasibility). A **post-filter** step enforces correctness:

1. Sort tasks by **priority descending**.
2. Accept each task only if it:
   - Falls within working hours
   - Does not conflict with any busy slot
   - Does not overlap any already-accepted task
3. Lower-priority tasks that conflict are **dropped** (reported as unscheduled).

This guarantees the output is always a valid, conflict-free schedule.

### 3.7 Horizon Extension

If the success rate (scheduled / total tasks) is below 80%, the scheduler **extends the time horizon by one day** and re-runs the EA, up to 7 additional days. This handles cases where too many tasks compete for limited slots.

---

## 4. Learning Loop

Every time a student marks a task as completed, a lightweight **learning service** fires asynchronously and updates three signals:

### 4.1 Duration Multiplier

Tracks how long tasks *actually* take vs. their estimates.

```
ratio = clamp(actualMinutes / estimatedMinutes, 0.25, 4.0)
multiplier = old × 0.9 + ratio × 0.1       (EMA, α = 0.1)
```

Future task durations are scaled by this multiplier, so the scheduler adapts if a student consistently over- or under-estimates.

### 4.2 Energy Profile

For complex tasks (complexity ≥ 0.7), the system infers how alert the student was at the hour they worked:

```
speed = estimatedMinutes / actualMinutes
inferredEnergy = clamp(speed × 0.5, 0, 1)
alertnessByHour[h] = old × 0.9 + inferredEnergy × 0.1
```

Over time, the 24-hour energy profile converges to the student's real productivity curve.

### 4.3 Deadline Pressure Weight

Adjusts how aggressively the scheduler prioritises deadlines:

- If miss rate > 30% (after ≥ 5 observations): weight × 1.05 (cap 3.0)
- If miss rate < 5% (after ≥ 10 observations): weight × 0.99 (floor 0.5)

### Convergence

| Parameter | Learning rate | Converges in ~N observations | Bounds |
|---|---|---|---|
| `durationMultiplier` | α = 0.1 | ~20 | uncapped |
| `alertnessByHour[h]` | α = 0.1 | ~20 per hour | [0, 1] |
| `weightDeadlinePenalty` | rule-based | gradual | [0.5, 3.0] |

All learned state is stored on the `WorkingPreferences` record — loaded once per scheduling run, updated once per task completion. No background jobs required.

---

## 5. End-to-End Pipeline

```
User clicks "Schedule"
         │
         ▼
  SchedulerService.scheduleTasksForUser()
         │
         ├── Fetch from DB: tasks, calendar events, user preferences
         │     └── Apply learned parameters (duration multiplier, fitness weights, energy profile)
         │
         ├── Build ScheduleRequest (convert to minute offsets, rotate working hours)
         │
         ▼
  EnhancedScheduler.schedule()
         │
         ├── evolve()  ←── population of 80 × up to 300 generations (max 10s)
         │     ├── Greedy initialisation
         │     ├── Tournament selection (k=3)
         │     ├── Uniform crossover
         │     ├── Mutation (±15–180 min shifts)
         │     └── Fitness evaluation (penalties + bonuses)
         │
         ├── filterValidSchedule()  ←── priority-ordered hard-constraint enforcement
         │
         ├── If success rate < 80%: extend horizon and retry (up to 7 times)
         │
         ▼
  SchedulingResult
         ├── scheduledTaskIds + calendar events (ISO start/end)
         ├── unscheduledTaskIds (tasks that couldn't fit)
         └── meta: status, successRate, objectiveValue, wallTimeMs, seed
```

---

## 6. Key Design Decisions

| Decision | Rationale |
|---|---|
| **EA over exact solver (CP-SAT)** | Runs in-process with no external dependencies; predictable wall-clock time; good-enough solutions in ≤10s |
| **Greedy initialisation** | Dramatically improves starting fitness vs. random; the EA refines rather than discovers from scratch |
| **Priority-based post-filtering** | Guarantees hard feasibility without re-solving; important tasks are never displaced by less important ones |
| **15-minute granularity** | Reduces search space by ~60× vs. per-minute; matches typical calendar granularity |
| **Deterministic PRNG (Mulberry32)** | Given the same seed, the scheduler produces identical results — essential for preview/confirm workflows and debugging |
| **EMA-based learning (α = 0.1)** | Smooth adaptation; resilient to outliers; converges in ~20 observations |
| **Horizon extension loop** | Gracefully handles overloaded weeks without requiring the user to manually adjust the time window |
