import type {
  PrismaClient,
  Task,
  TaskCompletion,
  WorkingPreferences,
} from "@prisma/client";

type WorkingPreferencesWithLearning = WorkingPreferences & {
  durationMultiplier?: number;
  durationObservations?: number;
  weightDeadlinePenalty?: number;
  deadlineMissCount?: number;
  deadlineTotalCount?: number;
};

const LEARNING_RATE = 0.1;
const MIN_DURATION_RATIO = 0.25;
const MAX_DURATION_RATIO = 4;
const DEADLINE_WEIGHT_MIN = 0.5;
const DEADLINE_WEIGHT_MAX = 3;

export class LearningService {
  static async processCompletion(
    db: PrismaClient,
    taskId: string,
    userId: string,
  ): Promise<void> {
    try {
      const [task, completion, prefs] = await Promise.all([
        db.task.findFirst({
          where: { id: taskId, userId },
          select: {
            id: true,
            due: true,
            durationMinutes: true,
          },
        }),
        db.taskCompletion.findFirst({
          where: { taskId },
          orderBy: { endTime: "desc" },
          select: {
            startTime: true,
            endTime: true,
          },
        }),
        db.workingPreferences.findUnique({ where: { userId } }),
      ]);

      if (!task || !completion || !prefs) {
        return;
      }

      const updateData = this.buildLearningUpdate(task, completion, prefs);
      if (!updateData) {
        return;
      }

      await db.workingPreferences.update({
        where: { userId },
        data: updateData,
      });
    } catch (error) {
      console.error("LearningService.processCompletion failed", {
        taskId,
        userId,
        error,
      });
    }
  }

  private static buildLearningUpdate(
    task: Pick<Task, "due" | "durationMinutes">,
    completion: Pick<TaskCompletion, "startTime" | "endTime">,
    prefs: WorkingPreferences,
  ): Record<string, unknown> | null {
    const learningPrefs = prefs as WorkingPreferencesWithLearning;
    const durationUpdate = this.getDurationLearningUpdate(
      task,
      completion,
      learningPrefs,
    );
    const weightUpdate = this.getFitnessWeightUpdate(
      task,
      completion,
      learningPrefs,
    );

    const combined = {
      ...durationUpdate,
      ...weightUpdate,
    };

    return Object.keys(combined).length > 0 ? combined : null;
  }

  private static getDurationLearningUpdate(
    task: Pick<Task, "durationMinutes">,
    completion: Pick<TaskCompletion, "startTime" | "endTime">,
    prefs: WorkingPreferencesWithLearning,
  ): Record<string, number> {
    const estimatedMinutes = Math.max(1, task.durationMinutes ?? 60);
    const actualMinutes = this.getActualMinutes(completion);

    if (actualMinutes <= 0) {
      return {};
    }

    const ratio = clamp(
      actualMinutes / estimatedMinutes,
      MIN_DURATION_RATIO,
      MAX_DURATION_RATIO,
    );

    const oldMultiplier = prefs.durationMultiplier ?? 1;
    const durationMultiplier =
      oldMultiplier * (1 - LEARNING_RATE) + ratio * LEARNING_RATE;

    return {
      durationMultiplier,
      durationObservations: (prefs.durationObservations ?? 0) + 1,
    };
  }

  private static getFitnessWeightUpdate(
    task: Pick<Task, "due">,
    completion: Pick<TaskCompletion, "endTime">,
    prefs: WorkingPreferencesWithLearning,
  ): Record<string, number> {
    if (!task.due) {
      return {};
    }

    const deadlineTotalCount = (prefs.deadlineTotalCount ?? 0) + 1;
    const isMiss = completion.endTime.getTime() > task.due.getTime();
    const deadlineMissCount = (prefs.deadlineMissCount ?? 0) + (isMiss ? 1 : 0);
    const missRate = deadlineMissCount / deadlineTotalCount;

    let weightDeadlinePenalty = prefs.weightDeadlinePenalty ?? 1;
    if (deadlineTotalCount >= 5 && missRate > 0.3) {
      weightDeadlinePenalty = Math.min(
        DEADLINE_WEIGHT_MAX,
        weightDeadlinePenalty * 1.05,
      );
    } else if (deadlineTotalCount >= 10 && missRate < 0.05) {
      weightDeadlinePenalty = Math.max(
        DEADLINE_WEIGHT_MIN,
        weightDeadlinePenalty * 0.99,
      );
    }

    return {
      deadlineMissCount,
      deadlineTotalCount,
      weightDeadlinePenalty,
    };
  }

  private static getActualMinutes(
    completion: Pick<TaskCompletion, "startTime" | "endTime">,
  ): number {
    const diff = completion.endTime.getTime() - completion.startTime.getTime();
    return Math.max(0, diff / 60_000);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
