"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function WorkingHoursPage() {
  const router = useRouter()
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-6">
      {/* ---- Background Glow (subtle aesthetic layer) ---- */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100 opacity-40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-100 opacity-40 blur-3xl" />
      </div>

      {/* ---- Content ---- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 flex w-full max-w-md flex-col items-center text-center"
      >
        {/* Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-8"
        >
          <Image
            src="/sunrise.png"
            alt="Illustration Arbeitszeiten"
            width={100}
            height={100}
            className="drop-shadow-sm"
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

        {/* Slider Mock (visual only) */}
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
          <div className="relative h-2 rounded-full bg-gray-100">
            <div
              className="absolute top-0 h-2 rounded-full bg-blue-500"
              style={{ left: "15%", width: "70%" }}
            />
            <div className="absolute top-1/2 left-[15%] h-4 w-4 -translate-y-1/2 rounded-full bg-blue-500 shadow-md" />
            <div className="absolute top-1/2 left-[85%] h-4 w-4 -translate-y-1/2 rounded-full bg-blue-500 shadow-md" />
          </div>
          <div className="mt-4 flex justify-between text-sm text-gray-700">
            <span>08:00</span>
            <span>17:00</span>
          </div>
        </motion.div>

        {/* Quick Presets */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="mb-8 flex flex-wrap justify-center gap-3"
        >
          {["08–16", "09–17", "10–18"].map((label) => (
            <motion.button
              key={label}
              whileHover={{ scale: 1.05 }}
              className="rounded-full border border-gray-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-400 hover:text-blue-600"
            >
              {label}
            </motion.button>
          ))}
        </motion.div>

        {/* Weekdays */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="mb-32 flex flex-wrap justify-center gap-2"
        >
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <motion.button
              key={d}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              className="h-10 w-10 rounded-full bg-white text-sm font-medium text-gray-700 shadow-sm transition hover:bg-blue-100"
            >
              {d}
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* ---- Sticky Footer CTA ---- */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/70 backdrop-blur-md"
      >
        <div className="mx-auto max-w-md px-6 py-4">
          <Button
            size="lg"
            onClick={() => {
              void handleNext(router);
              window.location.href = '/onboarding/preferences';
            }}
          >
            Weiter
          </Button>
        </div>
      </motion.footer>
    </main>
  )
}

async function handleNext(router: ReturnType<typeof useRouter>) {
  const res = await fetch("/api/onboarding/step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      earliestTime: "08:00",
      latestTime: "17:00",
      workingDays: ["Mo", "Di", "Mi", "Do", "Fr"],
    }),
  })

  if (res.ok) router.push("/onboarding/preferences")
  else console.error(await res.json())
}
