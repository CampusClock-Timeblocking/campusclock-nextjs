// FILE: src/components/onboarding/steps/SchedulingStep.tsx
"use client";

import { useMemo } from "react";
import type { OnboardingData } from "@/lib/schemas";

type Props = {
  value: OnboardingData;
  /** Patch-API: nur geänderte Felder übergeben */
  onChange: (patch: Partial<OnboardingData>) => void;
};

const OPTIONS = [
  { id: "EVENT_BASED", label: "Ereignisbasiert", hint: "Reagiert sofort auf Änderungen" },
  { id: "DAILY_INTERVAL", label: "Täglich 00:00", hint: "Automatisch einmal pro Tag" },
  { id: "MANUAL_TRIGGER", label: "Manuell", hint: "Volle Kontrolle, kein Auto-Plan" },
] as const;

export function SchedulingStep({ value, onChange }: Props) {
  // Feldnamen beibehalten wie in deinem Code: schedulingPolicy, horizonDays, allowTaskSplitting
  const selected = value.schedulingPolicy as
    | "EVENT_BASED"
    | "DAILY_INTERVAL"
    | "MANUAL_TRIGGER"
    | undefined;

  const horizonDays = Number.isFinite((value as any).schedulingHorizon)
    ? (value as any).schedulingHorizon
    : 7;

  const allowTaskSplitting =
    typeof value.allowTaskSplitting === "boolean"
      ? value.allowTaskSplitting
      : false;

  // Preview-Kennzahlen (Fenster/Frei) – geblocktes wird ins Arbeitsfenster geclamped
  const { windowMinutes, blockedMinutes, freeMinutes } = useMemo(() => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const H = Number.isFinite(h) ? h! : 0;
      const M = Number.isFinite(m) ? m! : 0;
      return Math.max(0, Math.min(23 * 60 + 59, H * 60 + M));
    };

    const ws = toMin(value.earliestTime);
    const we = toMin(value.latestTime);
    const win = Math.max(0, we - ws);

    const blocked = (value.excluded ?? []).reduce((acc, p) => {
      const s = Math.max(ws, toMin(p.start));
      const e = Math.min(we, toMin(p.end));
      return acc + Math.max(0, e - s);
    }, 0);

    const free = Math.max(0, win - blocked);
    return { windowMinutes: win, blockedMinutes: Math.min(blocked, win), freeMinutes: free };
  }, [value.earliestTime, value.latestTime, value.excluded]);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Planungslogik</h2>
          <p className="text-sm text-neutral-500">Wie soll neu geplant werden?</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
            Fenster: {windowMinutes} Min
          </span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
            Frei: {freeMinutes} Min
          </span>
        </div>
      </div>

      {/* Radio Cards – semantisch korrekt mit fieldset/radio-Inputs */}
      <fieldset className="grid grid-cols-1 gap-4 md:grid-cols-3" role="radiogroup" aria-label="Rescheduling Policy">
        <legend className="sr-only">Planungsmodus wählen</legend>
        {OPTIONS.map((opt) => {
          const active = selected === opt.id;
          return (
            <label
              key={opt.id}
              className={[
                "cursor-pointer rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-black/50",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-lg shadow-black/10"
                  : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
              ].join(" ")}
            >
              <input
                type="radio"
                name="schedulingPolicy"
                value={opt.id}
                checked={active}
                onChange={() => onChange({ schedulingPolicy: opt.id })}
                className="sr-only"
              />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className={active ? "text-xs text-white/80" : "text-xs text-neutral-600"}>
                    {opt.hint}
                  </div>
                </div>
                <div
                  className={[
                    "h-5 w-5 rounded-full border",
                    active ? "border-white bg-white" : "border-neutral-300 bg-white",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {active && (
                    <svg viewBox="0 0 20 20" className="h-5 w-5 text-neutral-900">
                      <path
                        d="M6 10l2 2 6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </fieldset>

      {/* Horizon + Splitting */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Horizon slider + number in sync */}
        <div className="md:col-span-2 rounded-2xl border p-4">
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            Planungshorizont (Tage)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={30}
              value={horizonDays}
              onChange={(e) => onChange({ schedulingHorizon: Number(e.target.value || 7) })}
              className="flex-1"
              aria-label="Planungshorizont (Tage)"
            />
            <input
              type="number"
              min={1}
              max={30}
              value={horizonDays}
              onChange={(e) => onChange({ horizonDays: Number(e.target.value || 7) })}
              className="w-20 rounded-xl border px-3 py-2 text-sm"
              aria-label="Planungshorizont als Zahl"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Tipp: 7–14 Tage bieten gute Balance zwischen Stabilität und Flexibilität.
          </p>
        </div>

        {/* Splitting toggle */}
        <div className="rounded-2xl border p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={allowTaskSplitting}
              onChange={(e) => onChange({ allowTaskSplitting: e.target.checked })}
              className="mt-0.5 h-4 w-4"
            />
            <div>
              <div className="text-sm font-medium text-neutral-800">Task-Splitting aktivieren</div>
              <div className="text-xs text-neutral-500">
                (Beta) Längere Aufgaben werden in mehrere Fokusblöcke geteilt.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Mini-Preview Bar */}
      <div className="rounded-2xl border p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-800">Vorschau: Tagesleiste</span>
          <span className="text-xs text-neutral-500">
            Blockiert: {blockedMinutes} Min • Verfügbar: {freeMinutes} Min
          </span>
        </div>
        <PreviewBar
          start={value.earliestTime}
          end={value.latestTime}
          blocked={(value.excluded ?? []).map((p) => ({ start: p.start, end: p.end }))}
        />
      </div>
    </section>
  );
}

/** Schlanke 24h-Preview mit clamped Block-Segmenten innerhalb des Arbeitsfensters */
function PreviewBar({
  start,
  end,
  blocked,
}: {
  start: string;
  end: string;
  blocked: Array<{ start: string; end: string }>;
}) {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const H = Number.isFinite(h) ? h! : 0;
    const M = Number.isFinite(m) ? m! : 0;
    return Math.max(0, Math.min(23 * 60 + 59, H * 60 + M));
  };
  const ws = toMin(start);
  const we = toMin(end);
  const width = Math.max(1, we - ws);

  return (
    <div className="relative h-8 w-full overflow-hidden rounded bg-neutral-100 ring-1 ring-neutral-200">
      {/* Arbeitsfenster-Hintergrund */}
      <div className="absolute inset-y-0 rounded bg-neutral-200" style={{ left: 0, width: "100%" }} aria-hidden="true" />
      {/* Blocked Segmente (clamped ins Fenster) */}
      {blocked.map((b, i) => {
        const s = Math.max(ws, toMin(b.start));
        const e = Math.min(we, toMin(b.end));
        if (e <= s) return null;
        const leftPct = ((s - ws) / width) * 100;
        const wPct = ((e - s) / width) * 100;
        return (
          <div
            key={i}
            className="absolute inset-y-0 rounded bg-neutral-500/70"
            style={{ left: `${leftPct}%`, width: `${wPct}%` }}
            aria-label={`Sperre ${b.start}-${b.end}`}
            title={`${b.start}–${b.end}`}
          />
        );
      })}
      {/* Labels */}
      <div className="absolute -bottom-5 left-0 text-[10px] text-neutral-500">{start}</div>
      <div className="absolute -bottom-5 right-0 text-[10px] text-neutral-500">{end}</div>
    </div>
  );
}
