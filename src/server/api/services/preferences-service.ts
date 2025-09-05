import type { PrismaClient, WorkingPreferences, SchedulingConfig } from "@prisma/client";
import { db as newDbInstance } from "@/server/db";

export interface UserPreferences {
  workingPreferences: WorkingPreferences;
  schedulingConfig: SchedulingConfig;
}

export class PreferencesService {
  private readonly db: PrismaClient;

  constructor(db?: PrismaClient) {
    this.db = db ?? newDbInstance;
  }

  /**
   * Get all scheduling-related preferences for a user
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const [workingPreferences, schedulingConfig] = await Promise.all([
      this.db.workingPreferences.findUnique({
        where: { userId },
      }),
      this.db.schedulingConfig.findUnique({
        where: { userId },
      }),
    ]);

    if (!workingPreferences || !schedulingConfig) {
      throw new Error(
        "User preferences not configured. Please complete onboarding first."
      );
    }

    return {
      workingPreferences,
      schedulingConfig,
    };
  }

  /**
   * Get working preferences for a user
   */
  async getWorkingPreferences(userId: string): Promise<WorkingPreferences> {
    const preferences = await this.db.workingPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      throw new Error("Working preferences not found");
    }

    return preferences;
  }

  /**
   * Get scheduling config for a user
   */
  async getSchedulingConfig(userId: string): Promise<SchedulingConfig> {
    const config = await this.db.schedulingConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      throw new Error("Scheduling config not found");
    }

    return config;
  }
}

