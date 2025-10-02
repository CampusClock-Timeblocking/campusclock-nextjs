"use client";
import type { OnboardingData } from "@/lib/schemas";

const PRESETS = [
  {
    id: "student",
    title: "Student",
    desc: "Mo–Fr 9–17, Fokus Nachmittags",
    mutate: (d: OnboardingData): OnboardingData => ({
      ...d,
      earliestTime: "09:00",
      latestTime: "17:30",
      workingDays: [1,2,3,4,5],
      energyPreset: "night_owl",
    }),
  },
  {
    id: "employee",
    title: "Berufstätig",
    desc: "Mo–Fr 8–17, ausgewogen",
    mutate: (d) => ({
      ...d,
      earliestTime: "08:00",
      latestTime: "17:00",
      workingDays: [1,2,3,4,5],
      energyPreset: "balanced",
    }),
  },
  {
    id: "freelancer",
    title: "Freelancer",
    desc: "Mo–Sa 10–18, Peak am Abend",
    mutate: (d) => ({
      ...d,
      earliestTime: "10:00",
      latestTime: "18:00",
      workingDays: [1,2,3,4,5,6],
      energyPreset: "night_owl",
    }),
  },
] as const;

export function PersonaPresets({
  value,
  onChange,
}: {
  value: OnboardingData;
  onChange: (v: OnboardingData) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {PRESETS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.mutate(value))}
          className="rounded-2xl border border-neutral-300 p-4 text-left hover:bg-neutral-50"
        >
          <div className="text-sm font-medium">{p.title}</div>
          <div className="text-xs opacity-80">{p.desc}</div>
        </button>
      ))}
    </div>
  );
}
