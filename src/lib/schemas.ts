// FILE: src/lib/schemas.ts
import { z } from "zod"

/* ===================== Zeit-Utils ===================== */
export const toMin = (t: string) => {
  const [hRaw, mRaw] = t.split(":")
  const h = Number(hRaw)
  const m = Number(mRaw)
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m)
}

export const toHHMM = (min: number) => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(min)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

/* ===================== Shared ===================== */
export const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Bitte im Format HH:MM eingeben")

export const excludedPeriodSchema = z.object({
  start: timeString,
  end: timeString,
  reason: z.string().optional(),
})

export const energyPresetEnum = z.enum(["early_bird", "balanced", "night_owl"])
export type EnergyPreset = z.infer<typeof energyPresetEnum>

export const schedulingModeEnum = z.enum([
  "EVENT_BASED",
  "DAILY_INTERVAL",
  "MANUAL_TRIGGER",
])

/** Quick-Items (Tasks/Habits) teilen sich dasselbe Schema */
export const quickItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Zu kurz"),
  durationMinutes: z.number().int().min(5).max(240).optional(), // für Habits optional
  priority: z.number().int().min(1).max(5).default(3).optional(),
})

/* ===================== Step-Schemas ===================== */
// 1) Arbeitszeiten
export const workingHoursStepSchema = z
  .object({
    earliestTime: timeString,
    latestTime: timeString,
    workingDays: z.array(z.number().int().min(0).max(6)).min(1, "Mind. 1 Tag wählen"),
  })
  .refine(
    (v) => toMin(v.latestTime) > toMin(v.earliestTime),
    "Ende muss nach Start liegen"
  )

// 2) Energieprofil
export const energyStepSchema = z.object({
  energyPreset: energyPresetEnum.default("balanced"),
})

// 3) Sperrzeiten
export const excludedStepSchema = z
  .object({
    excluded: z.array(excludedPeriodSchema).default([]),
    earliestTime: timeString,
    latestTime: timeString,
  })
  .refine(
    (v) => toMin(v.latestTime) > toMin(v.earliestTime),
    "Arbeitsfenster ungültig"
  )

// 4) Scheduling (für deinen Wizard-Step erwartet)
export const schedulingStepSchema = z.object({
  schedulingMode: schedulingModeEnum,
})

// 5) Quick-Items (für QuickItemsStep erwartet)
export const quickItemsStepSchema = z.object({
  quickTasks: z.array(quickItemSchema).max(12).default([]),
  quickHabits: z.array(quickItemSchema).max(12).default([]),
})

/* ===================== Gesamtdatentyp (Onboarding) ===================== */
/** Der Wizard erwartet diese Felder in OnboardingData. */
export const onboardingSchema = z.object({
  earliestTime: timeString,
  latestTime: timeString,
  workingDays: z.array(z.number().int().min(0).max(6)),
  excluded: z.array(excludedPeriodSchema).default([]),

  energyPreset: energyPresetEnum.default("balanced"),

  schedulingMode: schedulingModeEnum.default("DAILY_INTERVAL"),

  quickTasks: z.array(quickItemSchema).default([]),
  quickHabits: z.array(quickItemSchema).default([]),
})

export type OnboardingData = z.infer<typeof onboardingSchema>

/* ===================== Normalisierung/Merging ===================== */
export function normalizeBlocks(
  blocks: Array<{ start: string; end: string; reason?: string }>,
  windowStart: string,
  windowEnd: string
) {
  const s0 = toMin(windowStart)
  const e0 = toMin(windowEnd)

  const inRange = blocks
    .map((b) => ({
      s: Math.max(s0, toMin(b.start)),
      e: Math.min(e0, toMin(b.end)),
      reason: b.reason?.trim(),
    }))
    .filter((b) => b.e > b.s)
    .sort((a, b) => a.s - b.s)

  const merged: typeof inRange = []
  for (const b of inRange) {
    const last = merged[merged.length - 1]
    if (!last || b.s > last.e) {
      merged.push({ ...b })
    } else {
      last.e = Math.max(last.e, b.e)
      if (last.reason && b.reason && last.reason !== b.reason) {
        last.reason = `${last.reason}, ${b.reason}`
      } else {
        last.reason = last.reason ?? b.reason
      }
    }
  }

  return merged.map((b) => ({
    start: toHHMM(b.s),
    end: toHHMM(b.e),
    reason: b.reason,
  }))
}
