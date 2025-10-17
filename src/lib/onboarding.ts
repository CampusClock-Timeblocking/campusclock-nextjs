// src/lib/onboarding.ts
"use client"
import { z } from "zod"
import { useEffect, useState } from "react"

export const onboardingSchema = z.object({
  earliestTime: z.string().regex(/^\d{2}:\d{2}$/),
  latestTime: z.string().regex(/^\d{2}:\d{2}$/),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1),
  excluded: z.array(z.object({
    start: z.string(),
    end: z.string(),
    reason: z.string().optional(),
  })).default([]),
  energyPreset: z.enum(["early_bird","balanced","night_owl"]).default("balanced"),
  schedulingPolicy: z.enum(["DAILY_INTERVAL","EVENT_BASED","MANUAL"]).default("DAILY_INTERVAL"),
  schedulingHorizon: z.number().int().min(1).max(30).default(7),
  allowTaskSplitting: z.boolean().default(false),
})
export type OnboardingData = z.infer<typeof onboardingSchema>

export const DEFAULTS: OnboardingData = {
  earliestTime: "09:00",
  latestTime: "17:00",
  workingDays: [1,2,3,4,5],
  excluded: [],
  energyPreset: "balanced",
  schedulingPolicy: "DAILY_INTERVAL",
  schedulingHorizon: 7,
  allowTaskSplitting: false,
}

const STORAGE_KEY = "onboarding_draft_v1"

export function useOnboardingDraft() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<OnboardingData>(DEFAULTS)
  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!mounted) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        const ok = onboardingSchema.safeParse(parsed)
        if (ok.success) setData(ok.data)
      }
    } catch {}
  }, [mounted])
  useEffect(() => {
    if (!mounted) return
    const id = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }, 300)
    return () => clearTimeout(id)
  }, [data, mounted])

  const patch = (p: Partial<OnboardingData>) => setData(d => ({ ...d, ...p }))
  const clear = () => localStorage.removeItem(STORAGE_KEY)

  return { data, patch, clear, mounted }
}

export const toMin = (t: string) => {
  const [h = 0, m = 0] = t.split(":").map(Number)
  return (Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0)
}
