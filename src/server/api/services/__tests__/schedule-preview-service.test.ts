import { describe, it, expect, vi, beforeEach } from "vitest";
import { SchedulePreviewService } from "../schedule-preview-service";
import type { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helpers to build a mock PrismaClient that executes $transaction inline
// ---------------------------------------------------------------------------

type MockDb = {
  schedulePreviewSession: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  schedulePreviewTaskChange: {
    findMany: ReturnType<typeof vi.fn>;
  };
  task: {
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function createMockDb(): MockDb {
  const db: MockDb = {
    schedulePreviewSession: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    schedulePreviewTaskChange: {
      findMany: vi.fn(),
    },
    task: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  // $transaction executes the callback with `db` as the tx client
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  db.$transaction.mockImplementation((fn: (tx: MockDb) => Promise<unknown>) => fn(db));

  return db;
}

const SESSION_ID = "session-1";
const USER_ID = "user-1";
const TASK_ID_A = "task-a";
const TASK_ID_B = "task-b";

const FEEDBACK_TIMESTAMP = new Date("2026-03-04T10:00:00.000Z");
const DIFFERENT_TIMESTAMP = new Date("2026-03-04T10:05:00.000Z");

function activeSession() {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    status: "ACTIVE",
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SchedulePreviewService – rollback conflict guard", () => {
  let db: MockDb;
  let service: SchedulePreviewService;

  beforeEach(() => {
    db = createMockDb();
    service = new SchedulePreviewService(db as unknown as PrismaClient);
  });

  it("rolls back a task when updatedAt matches lastSessionUpdatedAt (CAS succeeds)", async () => {
    db.schedulePreviewSession.findFirst.mockResolvedValue(activeSession());
    db.schedulePreviewSession.update.mockResolvedValue({});

    db.schedulePreviewTaskChange.findMany.mockResolvedValue([
      {
        taskId: TASK_ID_A,
        oldDue: new Date("2026-03-10"),
        oldPriority: 5,
        oldDurationMinutes: 60,
        oldPreferredStartAfter: null,
        lastSessionUpdatedAt: FEEDBACK_TIMESTAMP,
      },
    ]);

    // CAS: updateMany matches 1 row (timestamps equal)
    db.task.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.cancelSession(SESSION_ID, USER_ID);

    expect(result.rolledBackTaskIds).toEqual([TASK_ID_A]);
    expect(result.skippedTaskIds).toEqual([]);

    // Verify the WHERE clause includes the updatedAt guard
    expect(db.task.updateMany).toHaveBeenCalledWith({
      where: {
        id: TASK_ID_A,
        userId: USER_ID,
        updatedAt: FEEDBACK_TIMESTAMP,
      },
      data: {
        due: new Date("2026-03-10"),
        priority: 5,
        durationMinutes: 60,
        preferredStartAfter: null,
      },
    });
  });

  it("skips rollback when updatedAt differs (concurrent external edit)", async () => {
    db.schedulePreviewSession.findFirst.mockResolvedValue(activeSession());
    db.schedulePreviewSession.update.mockResolvedValue({});

    db.schedulePreviewTaskChange.findMany.mockResolvedValue([
      {
        taskId: TASK_ID_A,
        oldDue: new Date("2026-03-10"),
        oldPriority: 5,
        oldDurationMinutes: 60,
        oldPreferredStartAfter: null,
        lastSessionUpdatedAt: FEEDBACK_TIMESTAMP,
      },
    ]);

    // CAS: updateMany matches 0 rows (external edit changed updatedAt)
    db.task.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.cancelSession(SESSION_ID, USER_ID);

    expect(result.rolledBackTaskIds).toEqual([]);
    expect(result.skippedTaskIds).toEqual([TASK_ID_A]);
  });

  it("skips tasks where lastSessionUpdatedAt is null (snapshot taken but no mutation applied)", async () => {
    db.schedulePreviewSession.findFirst.mockResolvedValue(activeSession());
    db.schedulePreviewSession.update.mockResolvedValue({});

    db.schedulePreviewTaskChange.findMany.mockResolvedValue([
      {
        taskId: TASK_ID_A,
        oldDue: new Date("2026-03-10"),
        oldPriority: 5,
        oldDurationMinutes: 60,
        oldPreferredStartAfter: null,
        lastSessionUpdatedAt: null, // no mutation was applied
      },
    ]);

    const result = await service.cancelSession(SESSION_ID, USER_ID);

    expect(result.rolledBackTaskIds).toEqual([]);
    expect(result.skippedTaskIds).toEqual([]);
    expect(db.task.updateMany).not.toHaveBeenCalled();
  });

  it("handles mixed: one task matches CAS, another is externally edited", async () => {
    db.schedulePreviewSession.findFirst.mockResolvedValue(activeSession());
    db.schedulePreviewSession.update.mockResolvedValue({});

    db.schedulePreviewTaskChange.findMany.mockResolvedValue([
      {
        taskId: TASK_ID_A,
        oldDue: new Date("2026-03-10"),
        oldPriority: 5,
        oldDurationMinutes: 60,
        oldPreferredStartAfter: null,
        lastSessionUpdatedAt: FEEDBACK_TIMESTAMP,
      },
      {
        taskId: TASK_ID_B,
        oldDue: new Date("2026-03-12"),
        oldPriority: 8,
        oldDurationMinutes: 30,
        oldPreferredStartAfter: 780,
        lastSessionUpdatedAt: DIFFERENT_TIMESTAMP,
      },
    ]);

    // First task: CAS succeeds; second task: CAS fails (concurrent edit)
    db.task.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await service.cancelSession(SESSION_ID, USER_ID);

    expect(result.rolledBackTaskIds).toEqual([TASK_ID_A]);
    expect(result.skippedTaskIds).toEqual([TASK_ID_B]);
  });

  it("uses the same CAS logic for expireSession", async () => {
    db.schedulePreviewSession.findFirst.mockResolvedValue(activeSession());
    db.schedulePreviewSession.update.mockResolvedValue({});

    db.schedulePreviewTaskChange.findMany.mockResolvedValue([
      {
        taskId: TASK_ID_A,
        oldDue: null,
        oldPriority: 3,
        oldDurationMinutes: 45,
        oldPreferredStartAfter: null,
        lastSessionUpdatedAt: FEEDBACK_TIMESTAMP,
      },
    ]);

    db.task.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.expireSession(SESSION_ID, USER_ID);

    expect(result.skippedTaskIds).toEqual([TASK_ID_A]);
    expect(result.rolledBackTaskIds).toEqual([]);
  });

  it("returns empty arrays when session is not ACTIVE", async () => {
    db.schedulePreviewSession.findFirst.mockResolvedValue({
      ...activeSession(),
      status: "CONFIRMED",
    });

    const result = await service.cancelSession(SESSION_ID, USER_ID);

    expect(result.rolledBackTaskIds).toEqual([]);
    expect(result.skippedTaskIds).toEqual([]);
    expect(db.task.updateMany).not.toHaveBeenCalled();
  });
});
