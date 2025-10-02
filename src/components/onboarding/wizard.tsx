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
  quickItemsStepSchema,
  normalizeBlocks,
  toMin,
  type OnboardingData,
} from "@/lib/schemas"
import { submitOnboarding } from "@/lib/submitOnboarding"

// Steps
import { WorkingHoursStep } from "./steps/WorkingHoursStep"
import { ExcludedPeriodsStep } from "./steps/ExcludedPeriodsStep"
import { SchedulingStep } from "./steps/SchedulingStep"
import { QuickItemsStep } from "./steps/QuickItemsStep"

const STORAGE_KEY = "onboarding_draft_v1"
const TOTAL_STEPS = 4

const DEFAULT_DATA: OnboardingData = {
  earliestTime: "08:00",
  latestTime: "18:00",
  workingDays: [1, 2, 3, 4, 5],
  excluded: [],
  schedulingMode: "DAILY_INTERVAL",
  quickTasks: [],
  quickHabits: [],
}

function getInitialData(): OnboardingData {
  // SSR-Guard
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
  const [step, setStep] = useState(0)
  const [value, setValue] = useState<OnboardingData>(() => getInitialData())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const headerRef = useRef<HTMLHeadingElement>(null)

  // Autosave (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // ignore
      }
    }, 400)
    return () => clearTimeout(id)
  }, [value])

  // Leave protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submitted) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [submitted])

  // Fokus beim Step-Wechsel
  useEffect(() => {
    headerRef.current?.focus()
  }, [step])

  // Verfügbare Minuten (Arbeitsfenster – Excluded)
  const availableMinutes = useMemo(() => {
    const start = toMin(value.earliestTime)
    const end = toMin(value.latestTime)
    const window = Math.max(0, end - start)
    const blocked = (value.excluded ?? []).reduce((acc, p) => {
      const b = Math.max(0, toMin(p.end) - toMin(p.start))
      return acc + b
    }, 0)
    return Math.max(0, window - blocked)
  }, [value.earliestTime, value.latestTime, value.excluded])

  // Geplante Minuten aus QuickTasks (Habits hier nicht auf Minuten umgelegt)
  const plannedMinutes = useMemo(() => {
    const tasks: Array<{ durationMinutes?: number }> = value.quickTasks ?? []
    return tasks.reduce((acc, t) => acc + (typeof t.durationMinutes === "number" ? t.durationMinutes : 0), 0)
  }, [value.quickTasks])

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
      onboardingSchema.parse(value) // finale Safety
      await submitOnboarding(value)
      setSubmitted(true)
      localStorage.removeItem(STORAGE_KEY)
      // TODO: Router push zu /app/today
    } catch (e) {
      console.error(e)
      // TODO: Toast Fehleranzeige
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

  // Keyboard Navigation (nach Deklaration der Handler)
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
  }, [handleNext, handlePrev])

  // Render Step
  const StepEl = (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.18 }}
        className="space-y-6"
      >
        <h2 ref={headerRef} tabIndex={-1} className="text-xl font-semibold outline-none" aria-live="polite">
          {["Arbeitszeiten", "Ausschlüsse", "Plan-Modus", "Schnell-Einträge"][step]}
        </h2>

        {step === 0 && <WorkingHoursStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
        {step === 1 && <ExcludedPeriodsStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
        {step === 2 && <SchedulingStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
        {step === 3 && <QuickItemsStep value={value} onChange={(v) => setValue((x) => ({ ...x, ...v }))} />}
      </motion.div>
    </AnimatePresence>
  )

  return (
    <section className="flex flex-col min-h-[65vh]">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <ProgressDots total={TOTAL_STEPS} current={step} onJump={setStep} />
        <div className="text-sm text-neutral-500">Schritt {step + 1}/{TOTAL_STEPS}</div>
      </div>

      {/* Body */}
      <div className="flex-1">{StepEl}</div>

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
