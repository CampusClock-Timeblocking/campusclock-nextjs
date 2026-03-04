import type {
  Prisma,
  PrismaClient,
  SchedulePreviewSession,
} from "@prisma/client";

const DEFAULT_PREVIEW_TTL_MINUTES = 30;

export type PreviewEventInput = {
  taskId: string;
  start: Date | string;
  end: Date | string;
  title: string;
  description?: string | null;
  color?: string | null;
};

export type PreviewEventSnapshot = {
  taskId: string;
  start: string;
  end: string;
  title: string;
  description?: string | null;
  color?: string | null;
};

export type RollbackResult = {
  rolledBackTaskIds: string[];
  skippedTaskIds: string[];
};

export class SchedulePreviewService {
  constructor(private readonly db: PrismaClient) {}

  async createPreviewSession(input: {
    userId: string;
    seed: number;
    baseDate: Date;
    timeHorizon: number;
    previewEvents: PreviewEventInput[];
    ttlMinutes?: number;
  }): Promise<SchedulePreviewSession> {
    const ttlMinutes = input.ttlMinutes ?? DEFAULT_PREVIEW_TTL_MINUTES;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    return this.db.schedulePreviewSession.create({
      data: {
        userId: input.userId,
        seed: normalizeSeed(input.seed),
        baseDate: input.baseDate,
        timeHorizon: input.timeHorizon,
        previewEventsJson:
          normalizePreviewEvents(input.previewEvents) as Prisma.InputJsonValue,
        expiresAt,
      },
    });
  }

  async getPreviewSession(sessionId: string, userId: string) {
    return this.db.schedulePreviewSession.findFirst({
      where: { id: sessionId, userId },
    });
  }

  async getActiveSessionOrThrow(sessionId: string, userId: string) {
    const session = await this.getPreviewSession(sessionId, userId);
    if (!session) {
      throw new Error("Preview session not found");
    }
    if (session.status !== "ACTIVE") {
      throw new Error(`Preview session is not active (${session.status})`);
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.expireSession(session.id, userId);
      throw new Error("Preview session expired");
    }

    return session;
  }

  async replacePreviewEvents(input: {
    sessionId: string;
    userId: string;
    previewEvents: PreviewEventInput[];
  }) {
    const session = await this.getActiveSessionOrThrow(input.sessionId, input.userId);

    return this.db.schedulePreviewSession.update({
      where: { id: session.id },
      data: {
        previewEventsJson:
          normalizePreviewEvents(input.previewEvents) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Snapshot original task fields once per (session, task) so we can roll back
   * feedback writes if preview is canceled/expired.
   */
  async snapshotTaskBeforeMutation(input: {
    sessionId: string;
    userId: string;
    taskId: string;
  }) {
    await this.getActiveSessionOrThrow(input.sessionId, input.userId);

    const existing = await this.db.schedulePreviewTaskChange.findUnique({
      where: {
        sessionId_taskId: {
          sessionId: input.sessionId,
          taskId: input.taskId,
        },
      },
    });
    if (existing) return existing;

    const task = await this.db.task.findFirst({
      where: {
        id: input.taskId,
        userId: input.userId,
      },
      select: {
        id: true,
        due: true,
        priority: true,
        durationMinutes: true,
        preferredStartAfter: true,
      },
    });
    if (!task) {
      throw new Error("Task not found for preview snapshot");
    }

    return this.db.schedulePreviewTaskChange.create({
      data: {
        sessionId: input.sessionId,
        taskId: task.id,
        oldDue: task.due,
        oldPriority: task.priority,
        oldDurationMinutes: task.durationMinutes,
        oldPreferredStartAfter: task.preferredStartAfter,
      },
    });
  }

  async markTaskMutation(input: {
    sessionId: string;
    userId: string;
    taskId: string;
    taskUpdatedAt: Date;
  }) {
    await this.getActiveSessionOrThrow(input.sessionId, input.userId);

    return this.db.schedulePreviewTaskChange.update({
      where: {
        sessionId_taskId: {
          sessionId: input.sessionId,
          taskId: input.taskId,
        },
      },
      data: {
        lastSessionUpdatedAt: input.taskUpdatedAt,
      },
    });
  }

  async cancelSession(sessionId: string, userId: string): Promise<RollbackResult> {
    return this.db.$transaction(async (tx) => {
      const session = await tx.schedulePreviewSession.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) throw new Error("Preview session not found");

      if (session.status !== "ACTIVE") {
        return { rolledBackTaskIds: [], skippedTaskIds: [] };
      }

      const rollback = await this.rollbackTaskChangesTx(tx, sessionId, userId);

      await tx.schedulePreviewSession.update({
        where: { id: sessionId },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
        },
      });

      return rollback;
    });
  }

  async confirmSession(sessionId: string, userId: string) {
    const session = await this.getActiveSessionOrThrow(sessionId, userId);

    return this.db.schedulePreviewSession.update({
      where: { id: session.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
  }

  async expireSession(sessionId: string, userId: string): Promise<RollbackResult> {
    return this.db.$transaction(async (tx) => {
      const session = await tx.schedulePreviewSession.findFirst({
        where: { id: sessionId, userId },
      });
      if (!session) throw new Error("Preview session not found");

      if (session.status !== "ACTIVE") {
        return { rolledBackTaskIds: [], skippedTaskIds: [] };
      }

      const rollback = await this.rollbackTaskChangesTx(tx, sessionId, userId);

      await tx.schedulePreviewSession.update({
        where: { id: sessionId },
        data: {
          status: "EXPIRED",
        },
      });

      return rollback;
    });
  }

  async expireActiveSessionsForUser(userId: string): Promise<number> {
    const activeExpiredSessions = await this.db.schedulePreviewSession.findMany({
      where: {
        userId,
        status: "ACTIVE",
        expiresAt: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const session of activeExpiredSessions) {
      await this.expireSession(session.id, userId);
    }

    return activeExpiredSessions.length;
  }

  private async rollbackTaskChangesTx(
    tx: Prisma.TransactionClient,
    sessionId: string,
    userId: string,
  ): Promise<RollbackResult> {
    const taskChanges = await tx.schedulePreviewTaskChange.findMany({
      where: { sessionId },
      select: {
        taskId: true,
        oldDue: true,
        oldPriority: true,
        oldDurationMinutes: true,
        oldPreferredStartAfter: true,
        lastSessionUpdatedAt: true,
      },
    });

    const rolledBackTaskIds: string[] = [];
    const skippedTaskIds: string[] = [];

    for (const change of taskChanges) {
      if (!change.lastSessionUpdatedAt) {
        continue;
      }

      // Atomic compare-and-swap: only rolls back if updatedAt still matches
      // the timestamp from our last feedback write. If a concurrent edit
      // changed updatedAt, the WHERE clause won't match and count === 0.
      const result = await tx.task.updateMany({
        where: {
          id: change.taskId,
          userId,
          updatedAt: change.lastSessionUpdatedAt,
        },
        data: {
          due: change.oldDue,
          priority: change.oldPriority,
          durationMinutes: change.oldDurationMinutes,
          preferredStartAfter: change.oldPreferredStartAfter,
        },
      });

      if (result.count === 1) {
        rolledBackTaskIds.push(change.taskId);
      } else {
        skippedTaskIds.push(change.taskId);
      }
    }

    return { rolledBackTaskIds, skippedTaskIds };
  }
}

function normalizeSeed(seed: number): number {
  const normalized = Math.floor(seed) >>> 0;
  return normalized === 0 ? 1 : normalized;
}

function normalizePreviewEvents(events: PreviewEventInput[]): PreviewEventSnapshot[] {
  return events.map((event) => ({
    taskId: event.taskId,
    start: toIsoString(event.start),
    end: toIsoString(event.end),
    title: event.title,
    description: event.description ?? null,
    color: event.color ?? null,
  }));
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid datetime value for preview event: ${value}`);
  }
  return parsed.toISOString();
}
