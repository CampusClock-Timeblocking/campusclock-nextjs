import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockInferMissingTaskFields } = vi.hoisted(() => ({
  mockInferMissingTaskFields: vi.fn(),
}));

vi.mock("@/server/api/services/ai-infer-service", async () => {
  const actual =
    await vi.importActual<
      typeof import("@/server/api/services/ai-infer-service")
    >("@/server/api/services/ai-infer-service");

  return {
    ...actual,
    inferMissingTaskFields: mockInferMissingTaskFields,
  };
});

import { createCaller } from "@/server/api/root";

type MockDb = {
  project: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  task: {
    create: ReturnType<typeof vi.fn>;
  };
};

function createMockDb(): MockDb {
  return {
    project: {
      findFirst: vi.fn(),
    },
    task: {
      create: vi.fn(),
    },
  };
}

function createAuthedCaller(db: MockDb, userId = "user-1") {
  return createCaller({
    db: db as never,
    session: { user: { id: userId } } as never,
    headers: new Headers(),
  } as never);
}

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

describe("task router create", () => {
  beforeEach(() => {
    mockInferMissingTaskFields.mockReset();
  });

  it("returns BAD_REQUEST when projectId does not belong to the user", async () => {
    const db = createMockDb();
    db.project.findFirst.mockResolvedValue(null);

    const caller = createAuthedCaller(db);

    await expect(
      caller.task.create({
        title: "Task with invalid project",
        projectId: PROJECT_ID,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid projectId. Project not found for this user.",
    });

    expect(mockInferMissingTaskFields).not.toHaveBeenCalled();
    expect(db.task.create).not.toHaveBeenCalled();
  });

  it("passes project title, deadline, and status to inference when projectId is valid", async () => {
    const db = createMockDb();
    const projectDeadline = new Date("2026-04-15T00:00:00.000Z");

    db.project.findFirst.mockResolvedValue({
      title: "Master Thesis",
      deadline: projectDeadline,
      status: "IN_PROGRESS",
    });

    mockInferMissingTaskFields.mockResolvedValue({
      status: 0,
      data: {
        title: "Write intro",
        durationMinutes: 90,
        priority: 4,
        complexity: 6,
        projectId: PROJECT_ID,
      },
    });

    db.task.create.mockResolvedValue({
      id: "task-1",
      title: "Write intro",
      projectId: PROJECT_ID,
      userId: "user-1",
    });

    const caller = createAuthedCaller(db);

    await caller.task.create({
      title: "Write intro",
      projectId: PROJECT_ID,
    });

    expect(db.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: PROJECT_ID,
        userId: "user-1",
      },
      select: {
        title: true,
        deadline: true,
        status: true,
      },
    });

    expect(mockInferMissingTaskFields).toHaveBeenCalledWith(
      {
        title: "Write intro",
        projectId: PROJECT_ID,
      },
      {
        title: "Master Thesis",
        deadline: projectDeadline,
        status: "IN_PROGRESS",
      },
    );

    expect(db.task.create).toHaveBeenCalledWith({
      data: {
        title: "Write intro",
        durationMinutes: 90,
        priority: 4,
        complexity: 6,
        projectId: PROJECT_ID,
        userId: "user-1",
      },
    });
  });
});
