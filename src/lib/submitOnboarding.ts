// FILE: src/lib/submitOnboarding.ts
"use server";

import type { OnboardingData } from "./schemas";

function hhmmToUtcDate(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0, 0));
}

function alertnessFromPreset(preset: OnboardingData["energyPreset"]): number[] {
  const base = new Array(24).fill(0.5) as number[];
  if (preset === "early_bird") {
    for (let h = 6; h <= 11; h++) base[h] = 0.95;
    for (let h = 18; h <= 22; h++) base[h] = 0.35;
  } else if (preset === "night_owl") {
    for (let h = 17; h <= 22; h++) base[h] = 0.95;
    for (let h = 6; h <= 10; h++) base[h] = 0.35;
  } else {
    for (let h = 9; h <= 17; h++) base[h] = 0.8;
  }
  return base;
}

export async function submitOnboarding(data: OnboardingData) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const earliest = hhmmToUtcDate(data.earliestTime);
  const latest = hhmmToUtcDate(data.latestTime);
  const alertness = alertnessFromPreset(data.energyPreset);

  // Upsert WorkingPreferences
  await prisma.workingPreferences.upsert({
    where: { userId },
    update: {
      earliestTime: earliest,
      latestTime: latest,
      workingDays: data.workingDays,
      alertnessByHour: alertness,
      // sinnvolle Defaults:
      dailyMaxMinutes: 600,
      dailyOptimalMinutes: 480,
      focusPeriodMinutes: 60,
      shortBreakMinutes: 15,
      longBreakMinutes: 60,
      longBreakFrequency: 3,
    },
    create: {
      userId,
      earliestTime: earliest,
      latestTime: latest,
      workingDays: data.workingDays,
      alertnessByHour: alertness,
      dailyMaxMinutes: 600,
      dailyOptimalMinutes: 480,
      focusPeriodMinutes: 60,
      shortBreakMinutes: 15,
      longBreakMinutes: 60,
      longBreakFrequency: 3,
    },
  });

  // Upsert SchedulingConfig mit Defaults (kein User-Input nötig)
  await prisma.schedulingConfig.upsert({
    where: { userId },
    update: {
      timezone: "Europe/Berlin",
      horizonDays: 7,
      allowTaskSplitting: false,
      reschedulingAggressiveness: 0.5,
      reschedulingPolicy: "DAILY_INTERVAL", // entspricht deinem Enum
    },
    create: {
      userId,
      timezone: "Europe/Berlin",
      horizonDays: 7,
      allowTaskSplitting: false,
      reschedulingAggressiveness: 0.5,
      reschedulingPolicy: "DAILY_INTERVAL",
    },
  });

  // ExcludedPeriods: einfache Neusynchronisierung (delete+create)
  // (Alternativ: diffen – hier bewusst simpel, da Onboarding)
  await prisma.excludedPeriod.deleteMany({ where: { userId } });
  if (data.excluded?.length) {
    await prisma.excludedPeriod.createMany({
      data: data.excluded.map(p => ({
        userId,
        startTime: hhmmToUtcDate(p.start),
        endTime: hhmmToUtcDate(p.end),
        reason: p.reason ?? null,
      })),
    });
  }

  return { ok: true };
}
async function getCurrentUserId(): Promise<string | null> {
  const { userId } = auth();
  return userId ?? null;
}

