// src/components/onboarding/sections/Preferences.tsx
"use client"
import { OnboardingData } from "@/lib/onboarding"
import { Card } from "@/components/ui/card"

export default function Preferences({ value, onChange }: {
  value: OnboardingData; onChange: (p: Partial<OnboardingData>) => void
}) {
  return (
    <Card className="p-4">
      <h2 className="text-lg font-medium mb-2">Planungsart & Energie</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <fieldset>
          <legend className="text-sm text-neutral-600">Automatisch planen</legend>
          {[
            { id:"DAILY_INTERVAL", label:"Täglich 00:00 (Empfohlen)" },
            { id:"EVENT_BASED", label:"Ereignisbasiert" },
            { id:"MANUAL", label:"Manuell" },
          ].map(opt => (
            <label key={opt.id} className="mt-2 flex items-center gap-2">
              <input type="radio" name="mode" checked={value.schedulingPolicy===opt.id}
                     onChange={() => onChange({ schedulingPolicy: opt.id as any })}/>
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="text-sm text-neutral-600">Energieprofil</legend>
          {[
            { id:"early_bird", label:"Frühaufsteher" },
            { id:"balanced", label:"Ausgeglichen (Empfohlen)" },
            { id:"night_owl", label:"Spätstarter" },
          ].map(opt => (
            <label key={opt.id} className="mt-2 flex items-center gap-2">
              <input type="radio" name="energy" checked={value.energyPreset===opt.id}
                     onChange={() => onChange({ energyPreset: opt.id as any })}/>
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </Card>
  )
}
