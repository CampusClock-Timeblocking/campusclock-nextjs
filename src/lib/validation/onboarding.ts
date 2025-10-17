import { z } from "zod"

export const onboardingSchema = z.object({
  earliestTime: z.string().regex(/^\d{2}:\d{2}$/), // e.g. 08:00
  latestTime: z.string().regex(/^\d{2}:\d{2}$/),
  workingDays: z.array(z.string().min(2).max(2)), // ["Mo", "Di"]
  energyPreset: z.enum(["morning", "balanced", "evening"]).optional(),
  schedulingPolicy: z.enum(["DAILY_INTERVAL", "EVENT_BASED", "MANUAL_TRIGGER"]).optional(),
})
