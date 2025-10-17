// src/components/onboarding/WowPreview.tsx
"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { event } from "@/lib/analytics"

type Block = { start: string; end: string; kind: "focus" | "break" }
type DayPlan = { date: string; blocks: Block[] }

export default function WowPreview({
  open,
  onClose,
  payload, // { earliestTime, latestTime }
  onApply,
}: {
  open: boolean
  onClose: () => void
  payload: { earliestTime: string; latestTime: string }
  onApply: (scope: "today" | "both_days") => void
}) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DayPlan[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    setData(null)
    fetch("/api/onboarding/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((res) => {
        setData(res.plan as DayPlan[])
        event("first_autoplan_created", { scope: "2days" })
        event("first_plan_shown")
      })
      .catch(() => setError("Vorschau konnte nicht geladen werden."))
      .finally(() => setLoading(false))
  }, [open, payload])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-2xl overflow-hidden rounded-2xl border bg-white">
        {/* Header */}
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-semibold">
            {loading ? "Plan wird erstellt …" : error ? "Fehler" : "Dein Tag ist geplant! 🎉"}
          </h3>
          {!loading && !error && (
            <p className="text-sm text-neutral-600">
              CampusClock schlägt Fokusblöcke zwischen {payload.earliestTime} und {payload.latestTime} vor.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-auto p-5">
          {loading && (
            <div className="grid place-items-center p-10">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-300 border-t-black" />
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && data && (
            <div className="grid gap-4 md:grid-cols-2">
              {data.map((day) => (
                <DayCard key={day.date} day={day} window={[payload.earliestTime, payload.latestTime]} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t bg-white/70 px-5 py-3">
          <button className="text-sm text-neutral-600 hover:underline" onClick={onClose}>
            Später anpassen
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onApply("today")}>
              Nur heute übernehmen
            </Button>
            <Button onClick={() => onApply("both_days")}>Plan übernehmen</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function DayCard({ day, window }: { day: DayPlan; window: [string, string] }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-2 text-sm font-medium">{formatDate(day.date)}</div>
      <Timeline window={window} blocks={day.blocks} />
      <ul className="mt-3 space-y-1 text-sm">
        {day.blocks.map((b, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                b.kind === "focus" ? "bg-blue-600" : "bg-neutral-400"
              }`}
            />
            <span className="font-mono tabular-nums">{b.start}–{b.end}</span>
            <span className="text-neutral-500">{b.kind === "focus" ? "Fokus" : "Pause"}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Timeline({ window, blocks }: { window: [string, string]; blocks: Block[] }) {
  const [start, end] = window
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + (m || 0)
  }
  const ws = toMin(start), we = toMin(end), width = Math.max(1, we - ws)
  return (
    <div className="relative h-8 w-full rounded bg-neutral-100">
      {blocks.map((b, i) => {
        const s = Math.max(ws, toMin(b.start))
        const e = Math.min(we, toMin(b.end))
        if (e <= s) return null
        const left = ((s - ws) / width) * 100
        const w = ((e - s) / width) * 100
        return (
          <div
            key={i}
            className={`absolute inset-y-0 rounded ${b.kind === "focus" ? "bg-blue-600/70" : "bg-neutral-400/70"}`}
            style={{ left: `${left}%`, width: `${w}%` }}
            title={`${b.start}–${b.end}`}
          />
        )
      })}
      <div className="absolute -bottom-4 left-0 text-[10px] text-neutral-500">{start}</div>
      <div className="absolute -bottom-4 right-0 text-[10px] text-neutral-500">{end}</div>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "2-digit" })
  } catch {
    return iso
  }
}
