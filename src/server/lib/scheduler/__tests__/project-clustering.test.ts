import { TaskStatus, type Task } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateFitness, type EATask } from "@/server/lib/scheduler/ea-core";
import {
  getTaskClusterLocation,
  taskToSchedulerTask,
} from "@/server/lib/scheduler/prisma-adapters";

function makeTask(overrides?: Partial<Task>): Task {
  return {
    id: overrides?.id ?? "task-1",
    title: overrides?.title ?? "Task",
    description: overrides?.description ?? null,
    status: overrides?.status ?? TaskStatus.TO_DO,
    durationMinutes: overrides?.durationMinutes ?? 60,
    priority: overrides?.priority ?? 5,
    complexity: overrides?.complexity ?? 5,
    due: overrides?.due ?? null,
    scheduledTime: overrides?.scheduledTime ?? null,
    preferredStartAfter: overrides?.preferredStartAfter ?? null,
    updatedAt: overrides?.updatedAt ?? new Date("2026-03-25T00:00:00.000Z"),
    userId: overrides?.userId ?? "user-1",
    projectId: overrides?.projectId ?? null,
    habitId: overrides?.habitId ?? null,
  };
}

function scoreSchedule(tasks: EATask[]): number {
  const schedule = {
    "task-a": 9 * 60,
    "task-b": 11 * 60,
  };

  return calculateFitness(
    schedule,
    tasks,
    [],
    Array(24).fill(0.5),
    24 * 60,
    [[0, 24 * 60]],
    new Map(tasks.map((task) => [task.id, task])),
    new Map(),
  );
}

describe("project-based scheduler clustering", () => {
  it("maps tasks with projectId to a shared project cluster key", () => {
    const schedulerTask = taskToSchedulerTask(
      makeTask({ id: "task-a", projectId: "project-1" }),
    );

    expect(schedulerTask.location).toBe("project:project-1");
  });

  it("maps tasks without projectId to unique non-cluster keys", () => {
    const schedulerTask = taskToSchedulerTask(makeTask({ id: "task-a" }));

    expect(schedulerTask.location).toBe("none:task-a");
  });

  it("applies cluster bonus only for tasks that share a project", () => {
    const withProjectCluster: EATask[] = [
      {
        id: "task-a",
        priority: 0.5,
        durationMinutes: 60,
        complexity: 0.5,
        location: getTaskClusterLocation("task-a", "project-1"),
        dependsOn: [],
      },
      {
        id: "task-b",
        priority: 0.5,
        durationMinutes: 60,
        complexity: 0.5,
        location: getTaskClusterLocation("task-b", "project-1"),
        dependsOn: [],
      },
    ];

    const withoutProjectCluster: EATask[] = [
      {
        id: "task-a",
        priority: 0.5,
        durationMinutes: 60,
        complexity: 0.5,
        location: getTaskClusterLocation("task-a", null),
        dependsOn: [],
      },
      {
        id: "task-b",
        priority: 0.5,
        durationMinutes: 60,
        complexity: 0.5,
        location: getTaskClusterLocation("task-b", null),
        dependsOn: [],
      },
    ];

    const projectFitness = scoreSchedule(withProjectCluster);
    const noProjectFitness = scoreSchedule(withoutProjectCluster);

    expect(noProjectFitness - projectFitness).toBe(200);
  });
});
