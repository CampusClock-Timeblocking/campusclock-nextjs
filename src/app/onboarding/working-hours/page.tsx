"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import Image from "next/image"
import { runWithViewTransition } from "@/lib/transition-nav"

// ---------- Utils ----------
const STEP = 30 // Minuten
const toHHMM = (min: number) => {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)))
  const h = String(Math.floor(m / 60)).padStart(2, "0")
  const mm = String(m % 60).padStart(2, "0")
  return `${h}:${mm}`
}

// ---------- Component ----------
export default function WorkingHoursPage() {
  const router = useRouter()

  // State für Zeitfenster & Arbeitstage
  const [range, setRange] = useState<[number, number]>([8 * 60, 17 * 60])
  const [days, setDays] = useState<string[]>(["Mo", "Di", "Mi", "Do", "Fr"])

  const startHHMM = useMemo(() => toHHMM(range[0]), [range])
  const endHHMM = useMemo(() => toHHMM(range[1]), [range])

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))

  const applyPreset = (label: "08–16" | "09–17" | "10–18") => {
    const map: Record<typeof label, [number, number]> = {
      "08–16": [8 * 60, 16 * 60],
      "09–17": [9 * 60, 17 * 60],
      "10–18": [10 * 60, 18 * 60],
    }
    setRange(map[label])
  }

  // ---------- Submit Handler ----------
  const handleNext = async () => {
    try {
      const res = await fetch("/api/onboarding/step", {
        method: "POST",
        credentials: "include", // 👈 sendet Session-Cookies mit!
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          earliestTime: startHHMM,
          latestTime: endHHMM,
          workingDays: [...days].sort(
            (a, b) =>
              ["Mo","Di","Mi","Do","Fr","Sa","So"].indexOf(a) -
              ["Mo","Di","Mi","Do","Fr","Sa","So"].indexOf(b)
          ),
        }),
      })

      if (res.ok) {
        await runWithViewTransition(() => router.push("/onboarding/preferences"))
        return
      }

      // Fehler auslesen, falls vorhanden
      let err: unknown = null
      try {
        err = await res.json()
      } catch {
        err = { status: res.status, statusText: res.statusText }
      }

      console.error("Onboarding step failed:", err)

      if (res.status === 401) {
        router.push("/auth") // ggf. Login erzwingen
      }
    } catch (e) {
      console.error("Network error:", e)
    }
  }

  // ---------- UI ----------
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-6">
      {/* Background Glow (mit ruhiger Bewegung) */}
      <motion.div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100 opacity-40 blur-3xl"
          animate={{ y: [0, -8, 0], scale: [1, 1.03, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-100 opacity-40 blur-3xl"
          animate={{ y: [0, 10, 0], scale: [1, 1.02, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* ---------- Content ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="z-10 flex w-full max-w-md flex-col items-center text-center"
      >
        {/* Illustration – Shared Element (gleiches viewTransitionName wie Welcome) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-8"
        >
          {/* WICHTIG: echtes <img> */}
          <Image
            src="/sunrise.png"
            alt="Illustration Arbeitszeiten"
            width={100}
            height={100}
            className="mx-auto drop-shadow-sm"
            style={{ viewTransitionName: "cc-hero" }}
            priority
          />
        </motion.div>

        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-2 text-3xl font-semibold text-gray-900 sm:text-4xl"
        >
          Wann startest du in deinen Arbeitstag?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-10 text-gray-600"
        >
          Wir planen deinen Fokus rund um dein perfektes Zeitfenster.
        </motion.p>

        {/* ---------- Slider ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="relative mb-8 w-full rounded-3xl border border-gray-200 bg-white/60 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-lg"
        >
          <div className="mb-5 flex justify-between text-sm text-gray-700">
            <span>Start</span>
            <span>Ende</span>
          </div>

          <div className="px-1">
            <Slider
              value={range}
              min={0}
              max={24 * 60}
              step={STEP}
              onValueChange={(v) => {
                const [s, e] = v as [number, number]
                if (e - s < 60) return // min 60 Minuten Abstand
                setRange([s, e])
              }}
              className="[&>.relative>.absolute.bg-primary]:bg-blue-500"
            />
          </div>

          <div className="mt-4 flex justify-between text-sm font-medium text-gray-800">
            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{startHHMM}</span>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">{endHHMM}</span>
          </div>
        </motion.div>

        {/* ---------- Quick Presets ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mb-8 flex flex-wrap justify-center gap-3"
        >
          {(["08–16", "09–17", "10–18"] as const).map((label) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.05 }}
              onClick={() => applyPreset(label)}
              className="rounded-full border border-gray-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-600"
            >
              {label}
            </motion.button>
          ))}
        </motion.div>

        {/* ---------- Weekdays ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-32 flex flex-wrap justify-center gap-2"
        >
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => {
            const active = days.includes(d)
            return (
              <motion.button
                key={d}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.08 }}
                onClick={() => toggleDay(d)}
                className={[
                  "h-10 w-10 rounded-full text-sm font-medium shadow-sm transition",
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-blue-100",
                ].join(" ")}
                aria-pressed={active}
              >
                {d}
              </motion.button>
            )
          })}
        </motion.div>
      </motion.div>

      {/* ---------- Footer CTA ---------- */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/70 backdrop-blur-md"
      >
        <div className="mx-auto max-w-md px-6 py-4">
          <Button
            size="lg"
            className="w-full rounded-full bg-black py-6 text-lg text-white shadow-md transition hover:bg-blue-600 data-[state=loading]:opacity-70"
            onClick={async (e) => {
              const btn = e.currentTarget
              btn.setAttribute("data-state", "loading")
              await handleNext()
            }}
          >
            Weiter
          </Button>
        </div>
      </motion.footer>
    </main>
  )
}
