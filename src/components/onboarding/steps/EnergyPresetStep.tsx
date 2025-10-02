// FILE: src/components/onboarding/steps/EnergyPresetStep.tsx
"use client";
import React, { useId, useMemo } from "react";
import type { OnboardingData } from "@/lib/schemas";
import type * as ReactTypes from "react";

type Props = {
  value: OnboardingData;
  onChange: (v: OnboardingData) => void;
};

type PresetId = "early_bird" | "balanced" | "night_owl";

const PRESETS: Array<{
  id: PresetId;
  title: string;
  desc: string;
  icon: (active: boolean) => JSX.Element;
}> = [
  {
    id: "early_bird",
    title: "Frühaufsteher",
    desc: "Hoch am Morgen",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className={`h-6 w-6 ${active ? "opacity-100" : "opacity-80"}`}
        aria-hidden="true"
      >
        <path
          d="M12 4.5a7.5 7.5 0 1 0 7.5 7.5A7.508 7.508 0 0 0 12 4.5Zm0-3v2M12 20v2M3.515 3.515 4.93 4.93M19.07 19.07l1.415 1.415M1 12h2M21 12h2M3.515 20.485 4.93 19.07M19.07 4.93 20.485 3.515"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={active ? "text-white" : "text-neutral-700"}
        />
      </svg>
    ),
  },
  {
    id: "balanced",
    title: "Ausgeglichen",
    desc: "Konstant über den Tag",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className={`h-6 w-6 ${active ? "opacity-100" : "opacity-80"}`}
        aria-hidden="true"
      >
        <path
          d="M4 12h16M12 4v16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className={active ? "text-white" : "text-neutral-700"}
        />
      </svg>
    ),
  },
  {
    id: "night_owl",
    title: "Spätstarter",
    desc: "Peak am Abend",
    icon: (active) => (
      <svg
        viewBox="0 0 24 24"
        className={`h-6 w-6 ${active ? "opacity-100" : "opacity-80"}`}
        aria-hidden="true"
      >
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={active ? "text-white" : "text-neutral-700"}
        />
      </svg>
    ),
  },
] as const;

// Mini-Chart Profile (24h, 0..1)
function presetBars(id: PresetId): number[] {
  const base = Array(24).fill(0.5);
  if (id === "early_bird") {
    for (let h = 6; h <= 11; h++) base[h] = 0.95;
    for (let h = 18; h <= 22; h++) base[h] = 0.35;
  } else if (id === "night_owl") {
    for (let h = 17; h <= 22; h++) base[h] = 0.95;
    for (let h = 6; h <= 10; h++) base[h] = 0.35;
  } else {
    // balanced: smooth plateau
    for (let h = 9; h <= 17; h++) base[h] = 0.8;
  }
  return base;
}

export function EnergyPresetStep({ value, onChange }: Props) {
  const groupId = useId();

  const selected = useMemo(
    () => PRESETS.find((p) => p.id === value.energyPreset)?.id ?? "balanced",
    [value.energyPreset]
  );

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Energieprofil</h2>
          <p className="text-sm text-neutral-500">
            Wähle ein Preset. Feinjustierung später möglich.
          </p>
        </div>
        {/* Optionales Badge für Empfehlung */}
        {selected === "balanced" && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            Empfohlen
          </span>
        )}
      </div>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        role="radiogroup"
        aria-labelledby={groupId}
      >
        {PRESETS.map((p) => {
          const active = selected === p.id;
          return (
            <label
              key={p.id}
              className={[
                "relative block cursor-pointer rounded-2xl border p-4 transition",
                "focus-within:ring-2 focus-within:ring-black/50",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-lg shadow-black/10"
                  : "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:shadow-sm",
              ].join(" ")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange({ ...value, energyPreset: p.id });
                }
              }}
              tabIndex={0}
              role="radio"
              aria-checked={active}
              aria-label={p.title}
            >
              {/* Active Glow */}
              {active && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/15" />
              )}

              <input
                type="radio"
                name={`energy-${groupId}`}
                className="sr-only"
                checked={active}
                onChange={() => onChange({ ...value, energyPreset: p.id })}
              />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "grid h-10 w-10 place-items-center rounded-xl",
                      active
                        ? "bg-white/10 ring-1 ring-white/15"
                        : "bg-neutral-100 ring-1 ring-neutral-200",
                    ].join(" ")}
                  >
                    {p.icon(active)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-5">{p.title}</div>
                    <div
                      className={`text-xs ${
                        active ? "text-white/80" : "text-neutral-500"
                      }`}
                    >
                      {p.desc}
                    </div>
                  </div>
                </div>

                {/* Checkmark */}
                <div
                  className={[
                    "h-5 w-5 rounded-full border transition",
                    active
                      ? "border-white bg-white"
                      : "border-neutral-300 bg-white",
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

              {/* Mini 24h Chart */}
              <div className="mt-4">
                <MiniBars id={p.id} active={active} />
                <div className={`mt-2 flex justify-between text-[10px] ${active ? "text-white/70" : "text-neutral-500"}`}>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>

              {/* Active Gradient Edge */}
              {active && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-2xl bg-gradient-to-t from-white/10 to-transparent" />
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}

/** Kleine 24-Balken-Vorschau (0..1), bar-height = Intensität */
function MiniBars({ id, active }: { id: PresetId; active: boolean }) {
  const bars = useMemo(() => presetBars(id), [id]);
  return (
    <div
      className={[
        "flex h-16 items-end gap-[3px] rounded-xl p-2",
        active ? "bg-white/5 ring-1 ring-white/10" : "bg-neutral-50 ring-1 ring-neutral-100",
      ].join(" ")}
    >
      {bars.map((v, i) => (
        <div
          key={i}
          className={[
            "w-[calc((100%-23*3px)/24)] rounded-[3px] transition-transform duration-200",
            active ? "bg-white" : "bg-neutral-300",
            "hover:-translate-y-[2px]",
          ].join(" ")}
          style={{ height: `${Math.max(10, Math.round(v * 100))}%` }}
          aria-hidden="true"
          title={`${String(i).padStart(2, "0")}:00 – ${Math.round(v * 100)}%`}
        />
      ))}
    </div>
  );
}
