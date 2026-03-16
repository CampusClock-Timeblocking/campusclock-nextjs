import type { ScheduleEditIntent } from "@/lib/zod";
import { installE2ETestEnv } from "@/test/e2e/env";
import {
  disconnectE2EPrisma,
  getE2EPrisma,
  resetE2EDatabase,
  runE2EMigrations,
} from "@/test/e2e/prisma";
import {
  createBusyEventFixture,
  createSchedulerUserFixture,
  createTaskFixture,
  utcDate,
} from "@/test/e2e/scheduler-fixtures";
import { createAuthenticatedCaller } from "@/test/e2e/trpc";
import type { PrismaClient } from "@prisma/client";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";

installE2ETestEnv();

const mockParseScheduleFeedback = vi.fn<
  (
    userMessage: string,
    currentSchedule: Array<{ id: string; start: string; end: string }>,
    tasks: Array<{
      id: string;
      title: string;
      due?: Date | null;
      priority: number | null;
      durationMinutes: number | null;
      preferredStartAfter: number | null;
    }>,
    todayIso: string,
  ) => Promise<ScheduleEditIntent | null>
>();

vi.mock("@/server/api/services/chat-schedule-service", () => ({
  parseScheduleFeedback: mockParseScheduleFeedback,
}));

vi.mock("@/server/lib/openai", () => ({
  getOpenAIClient: () => ({ mocked: true }),
}));

vi.mock("@/server/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/server/api/services/cache-service", () => ({
  CacheService: class {
    async get() {
      return null;
    }

    async set() {}

    async delete() {}

    async deletePattern() {}

    async exists() {
      return false;
    }

    async getOrSet<T>(_key: string, fetcher: () => Promise<T>) {
      return fetcher();
    }
  },
}));

vi.mock("@/server/api/services/g-cal-service", () => ({
  GCalService: class {
    async getAllEventsFromCalendarAccount() {
      return new Map();
    }
  },
}));

vi.mock("@/server/api/services/caldav.service", () => ({
  CalDAVService: class {
    async getAllEventsFromCalendarAccount() {
      return new Map();
    }
  },
}));

describe("scheduler router e2e", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    await runE2EMigrations();
    db = await getE2EPrisma();
  });

  beforeEach(async () => {
    mockParseScheduleFeedback.mockReset();
    await resetE2EDatabase();
  });

  afterAll(async () => {
    await disconnectE2EPrisma();
  });

  it("keeps preview events inside working-hour boundaries", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "11:00",
    });
    await createTaskFixture(db, user.userId, {
      title: "Boundary task",
      durationMinutes: 60,
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      timeHorizon: 1,
    });

    expect(result.scheduleResult.events).toHaveLength(1);

    const [event] = result.scheduleResult.events;
    expect(event?.start.toISOString()).toBe("2026-03-16T09:00:00.000Z");
    expect(event?.end.toISOString()).toBe("2026-03-16T10:00:00.000Z");
  });

  it("allows tasks to exactly fill a working-hours boundary", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "10:00",
    });
    const task = await createTaskFixture(db, user.userId, {
      title: "Exact fit task",
      durationMinutes: 60,
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      taskIds: [task.id],
      timeHorizon: 1,
    });

    expect(result.scheduleResult.scheduledTaskIds).toEqual([task.id]);
    expect(result.scheduleResult.events).toHaveLength(1);
    expect(result.scheduleResult.events[0]?.start.toISOString()).toBe(
      "2026-03-16T09:00:00.000Z",
    );
    expect(result.scheduleResult.events[0]?.end.toISOString()).toBe(
      "2026-03-16T10:00:00.000Z",
    );
  });

  it("allows a task to end exactly when a busy slot starts", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "12:00",
    });
    await createTaskFixture(db, user.userId, {
      title: "Edge touch before busy slot",
      durationMinutes: 60,
    });
    await createBusyEventFixture(db, user.userId, {
      start: utcDate("2026-03-16", "10:00"),
      end: utcDate("2026-03-16", "11:00"),
    });
    await createBusyEventFixture(db, user.userId, {
      start: utcDate("2026-03-16", "11:00"),
      end: utcDate("2026-03-16", "12:00"),
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      timeHorizon: 1,
    });

    expect(result.scheduleResult.events).toHaveLength(1);
    expect(result.scheduleResult.events[0]?.start.toISOString()).toBe(
      "2026-03-16T09:00:00.000Z",
    );
    expect(result.scheduleResult.events[0]?.end.toISOString()).toBe(
      "2026-03-16T10:00:00.000Z",
    );
  });

  it("allows a task to start exactly when a busy slot ends", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "12:00",
    });
    await createTaskFixture(db, user.userId, {
      title: "Edge touch after busy slot",
      durationMinutes: 60,
    });
    await createBusyEventFixture(db, user.userId, {
      start: utcDate("2026-03-16", "09:00"),
      end: utcDate("2026-03-16", "10:00"),
    });
    await createBusyEventFixture(db, user.userId, {
      start: utcDate("2026-03-16", "11:00"),
      end: utcDate("2026-03-16", "12:00"),
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      timeHorizon: 1,
    });

    expect(result.scheduleResult.events).toHaveLength(1);
    expect(result.scheduleResult.events[0]?.start.toISOString()).toBe(
      "2026-03-16T10:00:00.000Z",
    );
    expect(result.scheduleResult.events[0]?.end.toISOString()).toBe(
      "2026-03-16T11:00:00.000Z",
    );
  });

  it("rejects a placement when the only slot overlaps a busy event", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "10:00",
    });
    const task = await createTaskFixture(db, user.userId, {
      title: "Blocked task",
      durationMinutes: 60,
    });

    for (let day = 16; day <= 23; day += 1) {
      await createBusyEventFixture(db, user.userId, {
        start: utcDate(`2026-03-${day.toString().padStart(2, "0")}`, "09:30"),
        end: utcDate(`2026-03-${day.toString().padStart(2, "0")}`, "10:30"),
      });
    }

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      taskIds: [task.id],
      timeHorizon: 1,
    });

    expect(result.scheduleResult.events).toHaveLength(0);
    expect(result.scheduleResult.unscheduledTaskIds).toEqual([task.id]);
  });

  it("skips closed days and schedules on the next working day", async () => {
    const user = await createSchedulerUserFixture(db, {
      workingDays: ["TUESDAY"],
      earliestTime: "09:00",
      latestTime: "10:00",
    });
    await createTaskFixture(db, user.userId, {
      title: "Tuesday task",
      durationMinutes: 60,
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      timeHorizon: 2,
    });

    expect(result.scheduleResult.events).toHaveLength(1);
    expect(result.scheduleResult.events[0]?.start.toISOString()).toBe(
      "2026-03-17T09:00:00.000Z",
    );
    expect(result.scheduleResult.events[0]?.end.toISOString()).toBe(
      "2026-03-17T10:00:00.000Z",
    );
  });

  it("leaves tasks unscheduled when duration exceeds the contiguous working window", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "10:00",
    });
    const task = await createTaskFixture(db, user.userId, {
      title: "Too long",
      durationMinutes: 90,
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      taskIds: [task.id],
      timeHorizon: 1,
    });

    expect(result.scheduleResult.events).toHaveLength(0);
    expect(result.scheduleResult.unscheduledTaskIds).toEqual([task.id]);
  });

  it("aligns the busy-slot fetch window to baseDate", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "11:00",
      workingDays: ["WEDNESDAY"],
    });
    await createTaskFixture(db, user.userId, {
      title: "Future-aligned task",
      durationMinutes: 60,
    });
    await createBusyEventFixture(db, user.userId, {
      start: utcDate("2026-03-17", "09:00"),
      end: utcDate("2026-03-17", "10:00"),
      title: "Before baseDate",
    });
    await createBusyEventFixture(db, user.userId, {
      start: utcDate("2026-03-18", "09:00"),
      end: utcDate("2026-03-18", "10:00"),
      title: "Inside window",
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const result = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-18"),
      timeHorizon: 1,
    });

    expect(result.scheduleResult.events).toHaveLength(1);
    expect(result.scheduleResult.events[0]?.start.toISOString()).toBe(
      "2026-03-18T10:00:00.000Z",
    );
    expect(result.scheduleResult.events[0]?.end.toISOString()).toBe(
      "2026-03-18T11:00:00.000Z",
    );
  });

  it("persists exactly the previewed events on confirmAndSave", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "10:00",
    });
    const task = await createTaskFixture(db, user.userId, {
      title: "Confirm me",
      durationMinutes: 60,
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const preview = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      taskIds: [task.id],
      timeHorizon: 1,
    });

    await caller.scheduler.confirmAndSave({
      previewSessionId: preview.previewSessionId,
      calendarId: user.calendarId,
    });

    const savedEvents = await db.event.findMany({
      where: { taskId: task.id },
      orderBy: { start: "asc" },
    });
    const session = await db.schedulePreviewSession.findUniqueOrThrow({
      where: { id: preview.previewSessionId },
    });

    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0]?.title).toBe(preview.scheduleResult.events[0]?.title);
    expect(savedEvents[0]?.start.toISOString()).toBe(
      preview.scheduleResult.events[0]?.start.toISOString(),
    );
    expect(savedEvents[0]?.end.toISOString()).toBe(
      preview.scheduleResult.events[0]?.end.toISOString(),
    );
    expect(savedEvents[0]?.calendarId).toBe(user.calendarId);
    expect(session.status).toBe("CONFIRMED");
  });

  it("updates preview state via mocked feedback and rolls task changes back on cancel", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "11:00",
    });
    const task = await createTaskFixture(db, user.userId, {
      title: "Move later",
      durationMinutes: 60,
      preferredStartAfter: null,
    });

    mockParseScheduleFeedback.mockResolvedValue({
      taskId: task.id,
      field: "preferredStartAfter",
      operation: "set",
      value: 600,
      explanation: "Ich plane die Aufgabe ab 10 Uhr.",
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const preview = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      taskIds: [task.id],
      timeHorizon: 3,
    });

    expect(preview.scheduleResult.events[0]?.start.toISOString()).toBe(
      "2026-03-16T09:00:00.000Z",
    );

    const feedbackResult = await caller.scheduler.applyFeedbackAndPreview({
      previewSessionId: preview.previewSessionId,
      message: "Bitte erst ab 10 Uhr einplanen.",
      currentSchedule: preview.scheduleResult.events.map((event) => ({
        id: event.taskId,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
      })),
    });

    const updatedTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
    });
    const updatedSession = await db.schedulePreviewSession.findUniqueOrThrow({
      where: { id: preview.previewSessionId },
    });

    expect(feedbackResult.newSchedule).not.toBeNull();
    expect(feedbackResult.newSchedule?.events).toHaveLength(1);
    expect(feedbackResult.newSchedule?.events[0]?.start.toISOString()).toBe(
      "2026-03-16T10:00:00.000Z",
    );
    expect(feedbackResult.newSchedule?.events[0]?.end.toISOString()).toBe(
      "2026-03-16T11:00:00.000Z",
    );
    expect(feedbackResult.newSchedule?.meta.seed).toBe(updatedSession.seed);
    expect(updatedSession.baseDate.toISOString()).toBe(
      "2026-03-16T00:00:00.000Z",
    );
    expect(updatedSession.timeHorizon).toBe(3);
    expect(updatedTask.preferredStartAfter).toBe(600);
    expect(updatedSession.previewEventsJson).toEqual([
      expect.objectContaining({
        taskId: task.id,
        start: "2026-03-16T10:00:00.000Z",
        end: "2026-03-16T11:00:00.000Z",
      }),
    ]);

    const rollback = await caller.scheduler.cancelPreview({
      previewSessionId: preview.previewSessionId,
    });

    const rolledBackTask = await db.task.findUniqueOrThrow({
      where: { id: task.id },
    });
    const canceledSession = await db.schedulePreviewSession.findUniqueOrThrow({
      where: { id: preview.previewSessionId },
    });

    expect(rollback.rolledBackTaskIds).toEqual([task.id]);
    expect(rolledBackTask.preferredStartAfter).toBeNull();
    expect(canceledSession.status).toBe("CANCELED");
  });

  it("rejects confirmAndSave for a read-only calendar", async () => {
    const user = await createSchedulerUserFixture(db, {
      earliestTime: "09:00",
      latestTime: "10:00",
    });
    const task = await createTaskFixture(db, user.userId, {
      title: "Read-only rejection",
      durationMinutes: 60,
    });

    const caller = await createAuthenticatedCaller(db, user.userId);
    const preview = await caller.scheduler.schedulePreview({
      baseDate: utcDate("2026-03-16"),
      taskIds: [task.id],
      timeHorizon: 1,
    });

    await expect(
      caller.scheduler.confirmAndSave({
        previewSessionId: preview.previewSessionId,
        calendarId: user.readOnlyCalendarId,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
