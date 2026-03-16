# Scheduler Hardening Plan (Single-Path Cutover)

## Summary
Implement a direct overwrite of the current scheduler flow (no feature flags, no dual version).
Goal: make preview/feedback/confirm behavior correct, deterministic, atomic, timezone-consistent, and safe for future learning.

## Current Status (2026-03-04)
### Completed slices
1. Seeded EA determinism (`seed` plumbing in scheduler types/core/service metadata).
2. Preview session persistence layer (`SchedulePreviewSession`, `SchedulePreviewTaskChange`, service methods).
3. Session-based preview flow wiring (`schedulePreview`, `applyFeedbackAndPreview` with session, `cancelPreview`, `confirmAndSave` using stored preview events).
4. **Rollback conflict guard** (issue #1): `Task.updatedAt` added via `@updatedAt`; rollback uses atomic compare-and-swap (`updateMany` with `where: { updatedAt }`) — no read-then-write race. Tests in `schedule-preview-service.test.ts`.
5. **Hard cutover** (issue #2): `scheduleAndSave` route removed from router; "Jetzt einplanen" button removed from UI. Single entry point is now `schedulePreview` → preview dialog → `confirmAndSave`.
6. **Close-confirm race guard** (issue #4): `DialogContent` blocks `onInteractOutside` and `onEscapeKeyDown` while `confirmMutation.isPending` to prevent accidental cancel mid-save.
7. **Busy-slot/baseDate alignment** (issue #5): `getSchedulingContext` now takes `baseDate` and uses it as the event-fetch window start; call site passes `options?.baseDate`.
8. **Stats event-linked truth** (issue #6): `getSchedulingStats` uses `Event: { some/none: {} }` relation filters — `scheduledTasks + unscheduledTasks == totalTasks` and `Task.scheduledTime` is no longer read.

### Remaining issues
1. ~~Rollback conflict guard~~ — **Done.**
2. ~~Single-path cutover~~ — **Done.**
3. ~~Confirm save path skips cache invalidation~~ — **Done.** `confirmAndSave` now calls `EventService.invalidateEventWeeks` after the transaction.
4. ~~Close-confirm race is still possible from dialog controls~~ — **Done.** `DialogContent` now intercepts `onInteractOutside` and `onEscapeKeyDown` and calls `e.preventDefault()` when `confirmMutation.isPending`, preventing accidental cancel during an in-flight save.
5. ~~Busy-slot window is still anchored to `now` instead of scheduling `baseDate`~~ — **Done.** `getSchedulingContext` now accepts `baseDate` and uses it as the event-fetch window start; call site in `scheduleTasksForUser` passes `options?.baseDate`.
6. ~~Scheduling stats still rely on `Task.scheduledTime`~~ — **Done.** `getSchedulingStats` now counts `scheduledTasks` as `TO_DO` tasks with `Event: { some: {} }` and `unscheduledTasks` as `TO_DO` tasks with `Event: { none: {} }`, so the three counts are always consistent and never touch `Task.scheduledTime`.
7. **Timezone consistency work is not implemented** (canonical `SchedulingConfig.timezone` not enforced end-to-end).
8. **`rescheduleAll` still over-deletes** (deletes all task-linked events, not horizon-scoped).
9. **Legacy save path (`scheduleAndSaveEvents`) is still non-atomic** (`Promise.all(createEvent)` partial-write risk).
10. **Session-expiry rollback has no automatic cleanup trigger** for abandoned sessions (no cron/background/job hook in use).

## Scope and Success Criteria
1. Confirm saves exactly the previewed schedule.
2. Feedback uses write+rollback lifecycle (no permanent unintended task edits).
3. Saving events is atomic (all-or-nothing).
4. Busy-slot fetch window matches the same `baseDate` as solver.
5. Stats use real scheduling truth (task-linked events), not `scheduledTime`.
6. Time handling is consistent via `SchedulingConfig.timezone`.
7. `rescheduleAll` only replaces events inside horizon window.
8. EA is seedable and reproducible for preview/confirm/tests.

## Public API / Interface Changes
1. Add Prisma enum `SchedulePreviewStatus`: `ACTIVE | CONFIRMED | CANCELED | EXPIRED`.
2. Add Prisma model `SchedulePreviewSession`:
   `id, userId, status, seed, baseDate, timeHorizon, previewEventsJson, expiresAt, confirmedAt, canceledAt, createdAt, updatedAt`.
3. Add Prisma model `SchedulePreviewTaskChange`:
   `id, sessionId, taskId, oldDue, oldPriority, oldDurationMinutes, oldPreferredStartAfter, lastSessionUpdatedAt, createdAt`, unique `(sessionId, taskId)`.
4. Replace `scheduleTasks` usage in UI with `schedulePreview` returning `{ previewSessionId, scheduleResult }`.
5. Change `applyFeedbackAndPreview` input to require `previewSessionId`.
6. Add `cancelPreview(previewSessionId)` mutation.
7. Change `confirmAndSave` to require `previewSessionId` and remove solver rerun from confirm.
8. Add `seed` to EA options/metadata.

## Issue-by-Issue Resolution
1. **Preview/save divergence**
   `confirmAndSave` persists `previewEventsJson` from active session only; no recomputation.

2. **Preview feedback mutates DB unexpectedly**
   Keep write-through during preview, but snapshot originals per session/task and rollback on cancel/expiry.
   Conflict guard: rollback only if `Task.updatedAt` still equals last preview write timestamp.

3. **Non-atomic save**
   Save all preview events in one `db.$transaction`; fail whole operation if any insert fails.

4. **Busy-slot/baseDate mismatch**
   Build busy-slot range from solver base date + horizon, not `now`.

5. **Stats mismatch (`scheduledTime`)**
   Stop using `Task.scheduledTime` in scheduler stats; compute using task-linked events (`Event.taskId`, overlap with planning window / future).

6. **Timezone inconsistency**
   Canonical timezone: `SchedulingConfig.timezone` (fallback `UTC`).
   Use timezone-aware helpers for hour extraction, day-key grouping, and display formatting.

7. **`rescheduleAll` over-deletes**
   Delete only task-linked events within `[baseDate, baseDate + horizon]`, then recreate only that window.

8. **EA nondeterminism**
   Replace direct `Math.random()` calls with seeded PRNG; store seed in preview session and reuse for feedback reruns.

## Implementation Sequence
1. Prisma migration: preview session tables + enum.
2. Add preview session service (create, load, append/replace preview, rollback, confirm, expire).
3. Seeded RNG refactor in `ea-core`.
4. Scheduler service refactor:
   preview generation, confirm-from-session save, horizon-window delete for rescheduleAll.
5. Router refactor:
   `schedulePreview`, updated `applyFeedbackAndPreview`, `cancelPreview`, updated `confirmAndSave`.
6. UI refactor (`ScheduleButton`):
   hold `previewSessionId`, cancel on dialog close, confirm via session ID.
7. Stats + context range fixes.
8. Timezone helper integration in scheduler analysis/explain paths.
9. Remove old path directly (single overwrite).

## Remaining Execution Order (from current state)
1. ~~Add task-level conflict guard~~ — **Done.**
2. ~~Finish hard cutover~~ — **Done.**
3. ~~Add cache invalidation for confirm path~~ — **Done.**
4. ~~Prevent close-confirm race~~ — **Done.**
   ~~block dialog close while confirm mutation is pending (`onInteractOutside`/`onEscapeKeyDown` guards).~~
5. ~~Align scheduling context window to `baseDate`~~ — **Done.**
   ~~in `SchedulerService.getSchedulingContext`, fetch events for `[baseDate, baseDate + horizon]`.~~
6. ~~Replace stats logic with event-linked counts~~ — **Done.**
   ~~stop querying `scheduledTime` and compute unscheduled/scheduled from task-linked events.~~
7. Enforce canonical timezone path:
   `SchedulingConfig.timezone` for day/hour extraction, clustering, and explanation formatting.
8. Make `rescheduleAll` horizon-scoped:
   delete/recreate only events in target window.
9. Make legacy save atomic (if retained temporarily during migration):
   use `db.$transaction` for event writes.
10. Add automatic expiry cleanup:
   run `expireActiveSessionsForUser` on scheduler entrypoints or periodic cleanup job.

## Test Cases and Scenarios
1. Same inputs + seed => identical schedule output.
2. Preview then confirm => saved events exactly equal preview events.
3. Feedback modifies tasks; cancel restores original values.
4. Expired preview blocks confirm and rolls back pending task edits.
5. Atomic save failure leaves zero events created.
6. BaseDate in future uses matching future busy slots.
7. Stats reflect event-linked scheduling truth.
8. RescheduleAll keeps out-of-horizon events untouched.
9. Timezone tests: consistent hour/day behavior independent of server timezone.

## Assumptions and Defaults
1. Preview session TTL: 30 minutes.
2. Hard cutover: old preview/confirm behavior removed, not retained.
3. Canonical timezone: `SchedulingConfig.timezone`, fallback `UTC`.
4. `Task.scheduledTime` remains only for legacy display compatibility, not scheduling logic.
