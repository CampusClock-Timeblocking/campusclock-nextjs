// src/components/onboarding/sections/Blocks.tsx
"use client"
import { OnboardingData } from "@/lib/onboarding"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const QUICK = [
  { id: "lunch", label: "Mittag 12–13", start: "12:00", end: "13:00", reason: "Lunch" },
  { id: "off",   label: "Feierabend ab 18", start: "18:00", end: "23:59", reason: "Feierabend" },
  { id: "sport", label: "Sport 17–18", start: "17:00", end: "18:00", reason: "Sport" },
]

export default function Blocks({ value, onChange }: {
  value: OnboardingData; onChange: (p: Partial<OnboardingData>) => void
}) {
  const toggle = (q: typeof QUICK[number]) => {
    const exists = (value.excluded ?? []).some(p => p.start===q.start && p.end===q.end && (p.reason??"")===q.reason)
    const next = exists
      ? (value.excluded ?? []).filter(p => !(p.start===q.start && p.end===q.end && (p.reason??"")===q.reason))
      : [ ...(value.excluded ?? []), { start: q.start, end: q.end, reason: q.reason } ]
    onChange({ excluded: next })
  }
  return (
    <Card className="p-4">
      <h2 className="text-lg font-medium mb-2">Sperrzeiten & Pausen</h2>
      <div className="flex flex-wrap gap-2">
        {QUICK.map(q => (
          <Button key={q.id} variant="outline" className="rounded-full" onClick={() => toggle(q)}>
            {q.label}
          </Button>
        ))}
      </div>
    </Card>
  )
}
