// FILE: src/components/onboarding/steps/WorkingHoursStep.tsx
"use client";

import { useEffect, useMemo } from "react";
import type { OnboardingData } from "@/lib/schemas";

type Props = {
  value: OnboardingData;
  /** Patch-API: nur geänderte Felder übergeben */
  onChange: (patch: Partial<OnboardingData>) => void;
};

const DAYS = [
  { i: 0, label: "So" },
  { i: 1, label: "Mo" },
  { i: 2, label: "Di" },
  { i: 3, label: "Mi" },
  { i: 4, label: "Do" },
  { i: 5, label: "Fr" },
  { i: 6, label: "Sa" },
];

/** Zeitutils lokal halten, damit der Step autark bleibt */
function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m ?? 0);
}
function toHHMM(min: number) {
  const mm = Math.max(0, Math.min(23 * 60 + 59, min));
  const h = String(Math.floor(mm / 60)).padStart(2, "0");
  const m = String(mm % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function WorkingHoursStep({ value, onChange }: Props) {
  // Tage toggeln
  function toggleDay(i: number) {
    const set = new Set(value.workingDays);
    if (set.has(i)) {
      set.delete(i);
    } else {
      set.add(i);
    }
    onChange({ workingDays: Array.from(set).sort((a, b) => a - b) });
  }

  // Persona-Presets (setzen Zeiten & Tage)
  function applyPersona(p: "student" | "employee" | "freelancer") {
    if (p === "student") {
      onChange({
        earliestTime: "09:00",
        latestTime: "17:30",
        workingDays: [1, 2, 3, 4, 5],
        // energyPreset: "night_owl" as any, // ← optional, nur falls im Schema vorhanden
      });
    } else if (p === "employee") {
      onChange({
        earliestTime: "08:00",
        latestTime: "17:00",
        workingDays: [1, 2, 3, 4, 5],
        // energyPreset: "balanced" as any,
      });
    } else {
      onChange({
        earliestTime: "10:00",
        latestTime: "18:00",
        workingDays: [1, 2, 3, 4, 5, 6],
        // energyPreset: "night_owl" as any,
      });
    }
  }

  // Schnell-Auswahl für Arbeitstage
  function setDays(kind: "weekdays" | "weekend" | "all" | "none") {
    if (kind === "weekdays") onChange({ workingDays: [1, 2, 3, 4, 5] });
    if (kind === "weekend") onChange({ workingDays: [0, 6] }); // konsistent sortiert
    if (kind === "all") onChange({ workingDays: [0, 1, 2, 3, 4, 5, 6] });
    if (kind === "none") onChange({ workingDays: [] });
  }

  // Sanfter Auto-Fix: Ende > Start erzwingen (min. 30 Min Fenster)
  useEffect(() => {
    const start = toMin(value.earliestTime);
    const end = toMin(value.latestTime);
    if (end <= start) {
      const fixed = toHHMM(Math.min(start + 30, 23 * 60 + 59)); // exakt +30 Min
      onChange({ latestTime: fixed });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.earliestTime, value.latestTime]);

  const windowMinutes = useMemo(() => {
    return Math.max(0, toMin(value.latestTime) - toMin(value.earliestTime));
  }, [value.earliestTime, value.latestTime]);

  const invalid = windowMinutes < 30;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Arbeitszeiten & Tage</h2>
          <p className="text-sm text-neutral-500">
            Wir planen nur innerhalb dieser Fenster.
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
          Fenster: {windowMinutes} Min
        </span>
      </div>

      {/* Persona Presets */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          Schnellstart-Presets
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPersona("student")}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => applyPersona("employee")}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Berufstätig
          </button>
          <button
            type="button"
            onClick={() => applyPersona("freelancer")}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            Freelancer
          </button>
        </div>
      </div>

      {/* Zeiten */}
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-700">Früheste Zeit</span>
          <input
            type="time"
            value={value.earliestTime}
            onChange={(e) => onChange({ earliestTime: e.target.value })}
            className="rounded-xl border px-3 py-2"
            aria-label="Früheste Zeit"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-700">Späteste Zeit</span>
          <input
            type="time"
            value={value.latestTime}
            onChange={(e) => onChange({ latestTime: e.target.value })}
            className="rounded-xl border px-3 py-2"
            aria-label="Späteste Zeit"
          />
        </label>
      </div>

      {invalid && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Dein Arbeitsfenster ist sehr klein. Erhöhe die „Späteste Zeit“ für sinnvollere Planung.
        </div>
      )}

      {/* Tage */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="block text-sm text-neutral-700">Arbeitstage</span>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setDays("weekdays")}
              className="rounded-lg px-2 py-1 text-xs text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
            >
              Mo–Fr
            </button>
            <button
              type="button"
              onClick={() => setDays("weekend")}
              className="rounded-lg px-2 py-1 text-xs text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
            >
              Sa–So
            </button>
            <button
              type="button"
              onClick={() => setDays("all")}
              className="rounded-lg px-2 py-1 text-xs text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => setDays("none")}
              className="rounded-lg px-2 py-1 text-xs text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
            >
              Keine
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const active = value.workingDays.includes(d.i);
            return (
              <button
                key={d.i}
                type="button"
                onClick={() => toggleDay(d.i)}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
                aria-pressed={active}
                aria-label={`Arbeitstag ${d.label}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mini Timeline Preview */}
      <div className="rounded-xl border p-3">
        <div className="mb-2 text-xs text-neutral-500">
          Vorschau: Tagesleiste (Arbeitsfenster)
        </div>
        <div className="relative h-8 w-full rounded bg-neutral-100 ring-1 ring-neutral-200">
          {/* Arbeitsfenster */}
          {(() => {
            const s = toMin(value.earliestTime) / (24 * 60);
            const e = toMin(value.latestTime) / (24 * 60);
            const left = `${s * 100}%`;
            const width = `${Math.max(0, (e - s) * 100)}%`;
            return (
              <div
                className="absolute inset-y-0 rounded bg-neutral-400/60"
                style={{ left, width }}
                aria-hidden="true"
                title={`${value.earliestTime}–${value.latestTime}`}
              />
            );
          })()}
          <div className="absolute -bottom-5 left-0 text-[10px] text-neutral-500">
            00:00
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-neutral-500">
            12:00
          </div>
          <div className="absolute -bottom-5 right-0 text-[10px] text-neutral-500">
            24:00
          </div>
        </div>
      </div>
    </section>
  );
}
