// FILE: src/components/onboarding/wizard.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ProgressDots } from "./parts/ProgressDots"
import {
  onboardingSchema,
  workingHoursStepSchema,
  excludedStepSchema,
  schedulingStepSchema,
  quickItemsStepSchema, // bleibt so – wir stellen es in schemas.ts sicher
  normalizeBlocks,
  toMin,
  type OnboardingData,
} from "@/lib/schemas"
import { submitOnboarding } from "@/lib/submitOnboarding"

// Steps
import WorkingHoursStep from "./steps/WorkingHoursStep" // <-- default import!
import { ExcludedPeriodsStep } from "./steps/ExcludedPeriodsStep"
import { SchedulingStep } from "./steps/SchedulingStep"
import { QuickItemsStep } from "./steps/QuickItemsStep"
import { EnergyPresetStep } from "./steps/EnergyPresetStep"

const STORAGE_KEY = "onboarding_draft_v1"
const TOTAL_STEPS = 4

const DEFAULT_DATA: OnboardingData = {
  earliestTime: "08:00",
  latestTime: "18:00",
  workingDays: [1, 2, 3, 4, 5],
  excluded: [],
  energyPreset: "balanced",
  schedulingMode: "DAILY_INTERVAL",
  quickTasks: [],
  quickHabits: [],
}

function getInitialData(): OnboardingData {
  if (typeof window === "undefined") return DEFAULT_DATA
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    const parsed: unknown = JSON.parse(raw)
    const res = onboardingSchema.safeParse(parsed)
    return res.success ? res.data : DEFAULT_DATA
  } catch {
    return DEFAULT_DATA
  }
}

export default function Wizard() {
  // Mount-Gate gegen Hydration-Mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [step, setStep] = useState(0)
  const [value, setValue] = useState<OnboardingData>(() => getInitialData())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const headerRef = useRef<HTMLHeadingElement>(null)

  // Always call useEffect hooks at the top level, not conditionally.

  // Autosave (debounced)
  useEffect(() => {
    if (!mounted) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {}
    }, 400)
    return () => clearTimeout(id)
  }, [value, mounted])

  // Leave protection
  useEffect(() => {
    if (!mounted) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (!submitted) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [submitted, mounted])

  // Fokus beim Step-Wechsel
  useEffect(() => {
    if (!mounted) return;
    headerRef.current?.focus()
  }, [step, mounted])
  const plannedMinutes = useMemo(() => {
    return value.quickTasks.reduce((acc, t) => acc + (typeof t.durationMinutes === "number" ? t.durationMinutes : 0), 0)
  }, [value.quickTasks])

  // Calculate available minutes based on working hours and working days
  const availableMinutes = useMemo(() => {
    const [startHour, startMinute] = value.earliestTime.split(":").map(Number)
    const [endHour, endMinute] = value.latestTime.split(":").map(Number)
    const minutesPerDay = (endHour * 60 + endMinute) - (startHour * 60 + startMinute)
    return minutesPerDay * (value.workingDays?.length ?? 0)
  }, [value.earliestTime, value.latestTime, value.workingDays])

  const overbooked = plannedMinutes > availableMinutes

  // Step-Validation
  const validateStep = useCallback(() => {
    if (step === 0) {
      workingHoursStepSchema.parse({
        earliestTime: value.earliestTime,
        latestTime: value.latestTime,
        workingDays: value.workingDays,
      })
      return
    }
    if (step === 1) {
      excludedStepSchema.parse({
        earliestTime: value.earliestTime,
        latestTime: value.latestTime,
        excluded: value.excluded,
      })
      return
    }
    if (step === 2) {
      schedulingStepSchema.parse({ schedulingMode: value.schedulingMode })
      return
    }
    if (step === 3) {
      quickItemsStepSchema.parse({
        quickTasks: value.quickTasks ?? [],
        quickHabits: value.quickHabits ?? [],
      })
      return
    }
  }, [step, value])

  // Submit
  const onSubmit = useCallback(async () => {
    if (overbooked) return
    setSubmitting(true)
    try {
      onboardingSchema.parse(value)
      await submitOnboarding(value)
      setSubmitted(true)
      localStorage.removeItem(STORAGE_KEY)
      // TODO: router.push("/app/today")
    } catch (e) {
      console.error(e)
      // TODO: Toast
    } finally {
      setSubmitting(false)
    }
  }, [overbooked, value])

  // Navigations
  const handleNext = useCallback(() => {
    try {
      if (step === 0 || step === 1) {
        const normalized = normalizeBlocks(value.excluded ?? [], value.earliestTime, value.latestTime)
        if (JSON.stringify(normalized) !== JSON.stringify(value.excluded)) {
          setValue((v) => ({ ...v, excluded: normalized }))
        }
      }
      validateStep()
      if (step < TOTAL_STEPS - 1) setStep((s) => s + 1)
      else void onSubmit()
    } catch (err) {
      console.error(err)
    }
  }, [step, value.excluded, value.earliestTime, value.latestTime, validateStep, onSubmit])

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  // Keyboard Navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.getAttribute("role") === "textbox")
      if (isInput) return

      if (e.key === "ArrowRight") {
        e.preventDefault()
        handleNext()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        handlePrev()
      } else if (e.key === "Enter") {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleNext, handlePrev, mounted])

  if (!mounted) {
    return (
      <section className="flex min-h-[65vh] flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-5 w-40 rounded bg-neutral-100" />
          <div className="h-4 w-20 rounded bg-neutral-100" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-6 w-1/2 rounded bg-neutral-100" />
          <div className="h-28 w-full rounded-xl border bg-neutral-50" />
          <div className="h-28 w-full rounded-xl border bg-neutral-50" />
        </div>
        <div className="mt-8 flex items-center justify-between gap-3">
          <div className="h-9 w-24 rounded-md bg-neutral-100" />
          <div className="h-9 w-28 rounded-md bg-neutral-900/10" />
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col min-h-[65vh]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <ProgressDots total={TOTAL_STEPS} current={step} onJump={setStep} />
        <div className="text-sm text-neutral-500">Schritt {step + 1}/{TOTAL_STEPS}</div>
      </div>

      {/* Body */}
      <div className="flex-1">
        {step === 0 && <WorkingHoursStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
        {step === 1 && <ExcludedPeriodsStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
        {step === 2 && <SchedulingStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
        {step === 3 && <QuickItemsStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
        {step === 4 && <EnergyPresetStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={step === 0 || submitting}
          className="rounded-md bg-neutral-100 px-3 py-2 hover:bg-neutral-200 disabled:opacity-50"
        >
          Zurück
        </button>

        <div className="flex items-center gap-3">
          {overbooked && (
            <div
              className="rounded bg-red-100 px-2 py-1 text-sm text-red-700"
              title={`Geplant ${Math.round((plannedMinutes / 60) * 10) / 10}h • Verfügbar ${Math.round((availableMinutes / 60) * 10) / 10}h`}
            >
              Überbucht – bitte Zeiten anpassen
            </div>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={(step === TOTAL_STEPS - 1 && overbooked) || submitting}
            className="rounded-md bg-black px-3 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {step < TOTAL_STEPS - 1 ? "Weiter" : submitting ? "Wird gesendet…" : "Fertigstellen"}
          </button>
        </div>
      </div>
    </section>
  )
}
