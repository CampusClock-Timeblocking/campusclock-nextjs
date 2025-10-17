"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function OnboardingWelcomePage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50 px-6 text-center overflow-hidden">
      {/* Hintergrundlichter */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-100 opacity-40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-100 opacity-40 blur-3xl" />
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mb-8"
      >
        <Image
          src="/campusclock.png"
          alt="CampusClock Logo"
          width={140}
          height={140}
          className="drop-shadow-md"
        />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mb-10"
      >
        <h1 className="mb-3 text-3xl font-semibold text-gray-900 sm:text-4xl">
          Schluss mit Chaos –<br />
          <span className="text-blue-600">dein Tag plant sich selbst.</span>
        </h1>
        <p className="text-gray-600">
          Dein smarter Assistent für Fokus, Energie und Balance.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="relative z-10"
      >
        <Button
          size="lg"
          className="rounded-full bg-black px-10 py-6 text-lg text-white shadow-md transition hover:bg-blue-600"
          asChild
        >
          <a href="/onboarding/working-hours">Loslegen</a>
        </Button>
      </motion.div>

      {/* Trust Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="fixed bottom-6 z-10 text-xs text-gray-500"
      >
        CampusClock liest nur deine Kalenderzeiten – niemals Inhalte.
      </motion.p>
      
    </main>
  )
}
