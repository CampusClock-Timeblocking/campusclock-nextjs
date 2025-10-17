// src/components/onboarding/sections/Basics.tsx
"use client"
import { OnboardingData } from "@/lib/onboarding"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Basics({ value, onChange }: {
  value: OnboardingData; onChange: (p: Partial<OnboardingData>) => void
}) {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-medium mb-2">Arbeitszeiten & Tage</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm text-neutral-600">Start</label>
          <input type="time" value={value.earliestTime}
                 onChange={e => onChange({ earliestTime: e.target.value })}
                 className="mt-1 w-full rounded-xl border px-3 py-2"/>
        </div>
        <div>
          <label className="text-sm text-neutral-600">Ende</label>
          <input type="time" value={value.latestTime}
                 onChange={e => onChange({ latestTime: e.target.value })}
                 className="mt-1 w-full rounded-xl border px-3 py-2"/>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Mo","Di","Mi","Do","Fr","Sa","So"].map((d, idx) => {
          const mapIndex = [1,2,3,4,5,6,0][idx]
          const active = value.workingDays.includes(mapIndex)
          return (
            <Button key={d} variant="outline"
                    className={`rounded-full ${active ? "bg-black text-white" : ""}`}
                    onClick={() => {
                      const set = new Set(value.workingDays)
                      if (set.has(mapIndex)) set.delete(mapIndex); else set.add(mapIndex)
                      onChange({ workingDays: Array.from(set) })
                    }}>
              {d}
            </Button>
          )
        })}
      </div>
    </Card>
  )
}
