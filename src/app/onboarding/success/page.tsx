"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function WowPreviewPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-6 overflow-hidden">
      {/* ---- Soft Background Glow ---- */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-blue-100 opacity-40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-emerald-100 opacity-40 blur-3xl" />
      </div>

      {/* ---- Content ---- */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="z-10 flex w-full max-w-md flex-col items-center text-center"
      >
        {/* Celebration Illustration */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <Image
            src="/success.png"
            alt="Erster Plan erstellt"
            width={140}
            height={140}
            className="drop-shadow-sm py-10"
          />
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-3 text-3xl font-semibold text-gray-900 sm:text-4xl"
        >
          Dein Tag ist geplant! 🎉
        </motion.h1>

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-12 text-gray-600"
        >
          CampusClock hat automatisch Fokusblöcke zwischen <b>09:00</b> und <b>17:00</b> erstellt – 
          perfekt abgestimmt auf dein Energieprofil.
        </motion.p>

        {/* Mock Plan Preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="relative mb-16 w-full max-w-sm rounded-3xl border border-gray-200 bg-white/70 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md"
        >
          <h3 className="mb-4 text-sm font-medium text-gray-700">Heute</h3>
          <div className="space-y-3">
            {[
              { time: "09:00 – 11:00", label: "Deep Work", color: "bg-blue-500/80" },
              { time: "11:30 – 13:00", label: "Meetings", color: "bg-emerald-500/80" },
              { time: "14:00 – 17:00", label: "Projektarbeit", color: "bg-indigo-500/80" },
            ].map((b, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + idx * 0.1, duration: 0.3 }}
                className={`flex items-center justify-between rounded-2xl ${b.color} px-4 py-3 text-left text-white shadow-sm`}
              >
                <span className="text-sm font-medium">{b.label}</span>
                <span className="text-xs opacity-90">{b.time}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          <Button className="w-full rounded-full bg-black py-6 text-lg text-white hover:bg-blue-600">
            Plan übernehmen
          </Button>
          <Button
            variant="outline"
            className="w-full rounded-full border-gray-300 bg-white py-6 text-lg text-gray-800 hover:bg-gray-100"
          >
            Nur heute testen
          </Button>
        </motion.div>

        {/* Microtrust + Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="mt-12 text-xs text-gray-500"
        >
          CampusClock lernt täglich dazu – du behältst immer die Kontrolle.
        </motion.p>
      </motion.div>

      {/* Optional Confetti Layer (later via Lottie or Framer Motion) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* später animierte Partikel oder Konfetti */}
      </div>
    </main>
  )
}
