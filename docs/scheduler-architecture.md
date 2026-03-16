# Scheduler Architecture

Two interleaved loops: one runs a schedule, the other improves its parameters over time.

---

## Scheduling Pipeline

```
User trigger
    │
    ▼
SchedulerService.scheduleTasksForUser()
    │
    ├─ DB fetch ──────────────────────────────────────────────────────┐
    │    Tasks (TO_DO, not yet event-linked)                          │
    │    Events → BusySlots                                           │
    │    WorkingPreferences  ← contains all learned parameters        │
    │                                                                 ▼
    │                                                   Learned params applied:
    │                                                   • durationMultiplier
    │                                                     → task.durationMinutes × multiplier
    │                                                     → clamped to min 15 min
    │                                                   • FitnessWeights
    │                                                     (deadlinePenalty, energyPenalty,
    │                                                      earlinessBonus, clusterBonus)
    │                                                   • alertnessByHour[0..23]
    │                                                     → energy profile for EA
    ▼
EnhancedScheduler.schedule(ScheduleRequest)
    │
    ▼
evolve(tasks, busySlots, workingHours, energyProfile, {fitnessWeights})
    │
    │  Population: 80 individuals × 300 generations (max 10 s)
    │  Selection:  tournament (k=3)
    │  Crossover:  uniform
    │  Mutation:   ±15–180 min shift on valid slots
    │
    │  calculateFitness() — minimisation:
    │    Hard penalties (fixed):
    │      +10 000 × weightDeadlinePenalty   deadline missed
    │      +7 000                            task overlap
    │      +8 000                            dependency order violated
    │      +5 000                            busy-slot conflict
    │      +5 000                            outside working hours
    │    Soft penalty:
    │      +200  × weightEnergyPenalty       complex task (≥0.7) in low energy (<0.5)
    │    Bonuses:
    │      −150                              complex task in high energy (≥0.8)
    │      −(weightEarlinessBonus × priority × (10000−start) / 100)
    │      −100  × weightClusterBonus × count   per task in location cluster (≥2)
    │
    ▼
filterValidSchedule()
    │  Keep only tasks satisfying all hard constraints
    │  (working hours, busy slots, no overlaps)
    │  Priority-ordered — high priority wins conflicts
    │
    ▼
SchedulingResult { scheduledTaskIds, events [{taskId, start, end}], meta }
```

---

## Learning Loop

Triggered on every task completion — non-blocking (fire-and-forget).

```
tasks.complete({ id, endTime, startTime? })
    │
    ├─ task.update(status: COMPLETED)
    ├─ TaskCompletion.create({ taskId, startTime, endTime })
    │    startTime inferred as endTime − durationMinutes if absent
    │
    └─ LearningService.processCompletion()   ← void, never throws to caller
         │
         ├─ Parallel DB fetch:
         │    Task { durationMinutes, complexity, due }
         │    TaskCompletion { startTime, endTime }     (most recent)
         │    WorkingPreferences                         (current state)
         │
         ├─[Signal 1]  Duration Multiplier
         │    actualMinutes  = endTime − startTime
         │    ratio          = clamp(actual / estimated, 0.25, 4.0)
         │    multiplier     = old × 0.9 + ratio × 0.1          (EMA α=0.1)
         │    durationObservations++
         │
         ├─[Signal 2]  Energy Profile  (gate: complexity ≥ 0.7)
         │    h              = startTime.hour (UTC)
         │    speed          = estimated / actual
         │    inferredEnergy = clamp(speed × 0.5, 0, 1)
         │    alertnessByHour[h] = old[h] × 0.9 + inferredEnergy × 0.1
         │
         ├─[Signal 3]  Deadline Pressure
         │    deadlineTotalCount++
         │    if endTime > task.due: deadlineMissCount++
         │    missRate = misses / total
         │    if total ≥ 5  and missRate > 0.30 → weight × 1.05  (cap  3.0)
         │    if total ≥ 10 and missRate < 0.05 → weight × 0.99  (floor 0.5)
         │
         └─ Single WorkingPreferences.update({ all changed fields })
```

---

## Convergence Properties

| Parameter | Learning rate | Converges in ~N obs | Bounds |
|---|---|---|---|
| `durationMultiplier` | α = 0.1 | ~20 | uncapped |
| `alertnessByHour[h]` | α = 0.1 | ~20 per hour | [0, 1] |
| `weightDeadlinePenalty` | rule-based ×1.05 / ×0.99 | gradual | [0.5, 3.0] |

All learned state lives on `WorkingPreferences` — loaded once per scheduling run, updated once per task completion. No cron job required.
