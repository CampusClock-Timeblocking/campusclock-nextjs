"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Button } from "@/components/ui/button"

type EnergyKey = "EARLY_BIRD" | "BALANCED" | "NIGHT_OWL"
type ModeKey = "DAILY" | "EVENT_BASED" | "MANUAL"

export default function PreferencesPage() {
  const [energy, setEnergy] = useState<EnergyKey | null>(null)
  const [mode, setMode] = useState<ModeKey | null>(null)
  const [loading, setLoading] = useState(false)
  const canSubmit = !!energy && !!mode && !loading

  async function submit() {
    if (!energy || !mode) return
    try {
      setLoading(true)
      const res = await fetch("/api/onboarding/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energyProfile: energy, planningMode: mode }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j?.error ?? "Fehler beim Speichern")
      }
      // weiter zur Success-Seite
      window.location.href = "/onboarding/success"
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message);
      } else {
        alert("Unerwarteter Fehler");
      }
    } finally {
      setLoading(false)
    }
  }

  const cards: Array<{k:EnergyKey; title:string; desc:string; grad:string}> = [
    { k:"EARLY_BIRD", title:"Frühaufsteher 🌅", desc:"Morgens höchste Energie – ideal für frühe Deep-Work-Phasen.", grad:"from-yellow-100 via-orange-100 to-white" },
    { k:"BALANCED",   title:"Ausgeglichen ☀️",  desc:"Stabile Energie über den Tag – ausgewogen und planbar.",     grad:"from-blue-100 via-teal-100 to-white" },
    { k:"NIGHT_OWL",  title:"Spätstarter 🌙",    desc:"Abends/Spät top – kreativ & flow nach 18 Uhr.",              grad:"from-indigo-100 via-purple-100 to-white" },
  ]

  const modes: Array<{k:ModeKey; title:string; subtitle:string}> = [
    { k:"DAILY",       title:"Täglich automatisch", subtitle:"Neuer Plan jeden Tag um 00:00 Uhr (empfohlen)" },
    { k:"EVENT_BASED", title:"Bei Ereignissen",     subtitle:"Neuplanung nur, wenn sich Termine ändern" },
    { k:"MANUAL",      title:"Manuell",             subtitle:"Du entscheidest, wann neu geplant wird" },
  ]

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-6">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-100 opacity-40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-100 opacity-40 blur-3xl" />
      </div>

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
          className="mb-8 py-10"
        >
          <Image src="/energy.png" alt="Illustration Energieprofil" width={120} height={120} className="drop-shadow-sm" />
        </motion.div>

        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-2 text-3xl font-semibold text-gray-900 sm:text-4xl"
        >
          Wann bist du am produktivsten?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mb-10 text-gray-600"
        >
          CampusClock nutzt dein Energieprofil, um Aufgaben besser zu verteilen.
        </motion.p>

        {/* Energy Profile Cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-12 grid w-full max-w-md gap-5"
        >
          {cards.map((card) => {
            const active = energy === card.k
            return (
              <motion.button
                type="button"
                key={card.k}
                onClick={()=> setEnergy(card.k)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className={[
                  "cursor-pointer rounded-3xl border bg-gradient-to-br p-6 text-left shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition",
                  active ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
                  card.grad,
                ].join(" ")}
              >
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{card.title}</h3>
                <p className="text-sm text-gray-700">{card.desc}</p>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Planungsmodus */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-32 w-full max-w-md rounded-3xl border border-gray-200 bg-white/70 p-6 text-left shadow-sm backdrop-blur-md"
        >
          <h3 className="mb-4 text-base font-semibold text-gray-800">Wie soll CampusClock planen?</h3>
          <div className="space-y-3">
            {modes.map((opt) => {
              const active = mode === opt.k
              return (
                <button
                  type="button"
                  key={opt.k}
                  onClick={()=> setMode(opt.k)}
                  className={[
                    "flex w-full flex-col rounded-2xl border bg-white px-5 py-4 text-left transition",
                    active ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-blue-400 hover:bg-blue-50",
                  ].join(" ")}
                >
                  <span className="font-medium text-gray-900">{opt.title}</span>
                  <span className="text-sm text-gray-600">{opt.subtitle}</span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* Sticky Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white/70 backdrop-blur-md"
      >
        <div className="mx-auto max-w-md px-6 py-4">
          <Button
            size="lg"
            disabled={!canSubmit}
            className="w-full rounded-full bg-black py-6 text-lg text-white shadow-md transition hover:bg-blue-600 disabled:opacity-50"
            onClick={submit}
          >
            {loading ? "Speichere..." : "Plan erstellen"}
          </Button>
        </div>
      </motion.footer>
    </main>
  )
}
