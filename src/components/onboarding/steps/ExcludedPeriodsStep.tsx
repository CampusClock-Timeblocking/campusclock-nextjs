// FILE: src/components/onboarding/steps/ExcludedPeriodsStep.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import type { OnboardingData } from "@/lib/schemas";

type LocalPeriod = { start: string; end: string; reason?: string };

const QUICK: Array<{ id: string; label: string; start: string; end: string; reason: string }> = [
  { id: "lunch", label: "Mittag 12–13", start: "12:00", end: "13:00", reason: "Lunch" },
  { id: "off", label: "Feierabend >18", start: "18:00", end: "23:59", reason: "Feierabend" },
  { id: "sport", label: "Sport 17–18", start: "17:00", end: "18:00", reason: "Sport" },
];

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  const hours = Number.isFinite(h) ? h : 0;
  const minutes = Number.isFinite(m) ? m : 0;
  return (typeof hours === "number" && Number.isFinite(hours) ? hours : 0) * 60 + (typeof minutes === "number" && Number.isFinite(minutes) ? minutes : 0);
}
function toHHMM(min: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, min));
  const h = String(Math.floor(clamped / 60)).padStart(2, "0");
  const m = String(clamped % 60).padStart(2, "0");
  return `${h}:${m}`;
}
function minutesBetween(a: string, b: string) { return Math.max(0, toMin(b) - toMin(a)); }

// merge overlapping/adjacent periods
function mergePeriods(list: LocalPeriod[]): LocalPeriod[] {
  if (!list.length) return [];
  const sorted = [...list].sort((a, b) => toMin(a.start) - toMin(b.start));
  const res: LocalPeriod[] = sorted[0] ? [sorted[0]] : [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = res[res.length - 1];
    const cur = sorted[i];
    if (prev && cur && toMin(cur.start) <= toMin(prev.end)) {
      // overlap/adjacent: extend end, combine reason if different
      const reason =
        prev.reason && cur.reason && prev.reason !== cur.reason
          ? `${prev.reason}, ${cur.reason}`
          : prev.reason ?? cur.reason;
      prev.end = toMin(cur.end) > toMin(prev.end) ? cur.end : prev.end;
      prev.reason = reason;
    } else if (cur) {
      res.push({ ...cur });
    }
  }
  return res;
}

export function ExcludedPeriodsStep({
  value,
  onChange,
}: {
  value: OnboardingData;
  onChange: (v: OnboardingData) => void;
}) {
  const [loc, setLoc] = useState<LocalPeriod>({ start: "12:00", end: "13:00" });
  const [error, setError] = useState<string | null>(null);

  // normalize user input live (Ende > Start)
  useEffect(() => {
    const s = toMin(loc.start);
    const e = toMin(loc.end);
    if (e <= s) {
      const fixed = toHHMM(s + 15); // min. 15 Minuten
      setLoc((prev) => ({ ...prev, end: fixed }));
    }
  }, [loc.start, loc.end]);

  const periods = useMemo(
    () => mergePeriods(value.excluded ?? []),
    [value.excluded]
  );

  function commit(list: LocalPeriod[]) {
    const merged = mergePeriods(list);
    onChange({ ...value, excluded: merged });
  }

  function add(p: LocalPeriod) {
    setError(null);
    if (minutesBetween(p.start, p.end) < 5) {
      setError("Sperrzeit muss mindestens 5 Minuten lang sein.");
      return;
    }
    const arr = [...(value.excluded ?? []), p];
    commit(arr);
  }

  function remove(index: number) {
    setError(null);
    const arr = [...(value.excluded ?? [])];
    arr.splice(index, 1);
    commit(arr);
  }

  function toggleQuick(q: (typeof QUICK)[number]) {
    const idx = (value.excluded ?? []).findIndex(
      (p) => p.start === q.start && p.end === q.end && (p.reason ?? "") === q.reason
    );
    if (idx >= 0) {
      // remove exact match
      const arr = [...(value.excluded ?? [])];
      arr.splice(idx, 1);
      commit(arr);
    } else {
      add({ start: q.start, end: q.end, reason: q.reason });
    }
  }

  const activeQuick = new Set(
    (value.excluded ?? [])
      .map((p) => QUICK.find((q) => q.start === p.start && q.end === p.end && (p.reason ?? "") === q.reason)?.id)
      .filter(Boolean) as string[]
  );

  const totalBlocked = periods.reduce((acc, p) => acc + minutesBetween(p.start, p.end), 0);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Sperrzeiten</h2>
          <p className="text-sm text-neutral-500">Während dieser Zeiten wird nicht geplant.</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
          Blockiert: {totalBlocked} Min
        </span>
      </div>

      {/* Quick Toggles */}
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => {
          const active = activeQuick.has(q.id);
          return (
            <button
              key={q.id}
              onClick={() => toggleQuick(q)}
              className={[
                "rounded-full px-3 py-2 text-sm ring-1 transition",
                active
                  ? "bg-neutral-900 text-white ring-neutral-900"
                  : "bg-white text-neutral-700 ring-neutral-300 hover:bg-neutral-50",
              ].join(" ")}
              aria-pressed={active}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {/* Custom Add */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-700">Start</span>
          <input
            type="time"
            value={loc.start}
            onChange={(e) => setLoc((s) => ({ ...s, start: e.target.value }))}
            className="rounded-xl border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-700">Ende</span>
          <input
            type="time"
            value={loc.end}
            onChange={(e) => setLoc((s) => ({ ...s, end: e.target.value }))}
            className="rounded-xl border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-neutral-700">Grund (optional)</span>
          <input
            placeholder="z.B. Familie"
            value={loc.reason ?? ""}
            onChange={(e) => setLoc((s) => ({ ...s, reason: e.target.value }))}
            className="rounded-xl border px-3 py-2"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => add(loc)}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-900/90"
        >
          Hinzufügen
        </button>
        {error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>

      {/* List */}
      <ul className="space-y-2">
        {periods.length === 0 && (
          <li className="rounded-lg border border-dashed px-3 py-3 text-sm text-neutral-500">
            Noch keine Sperrzeiten – füge oben welche hinzu.
          </li>
        )}
        {periods.map((p, i) => {
          const dur = minutesBetween(p.start, p.end);
          return (
            <li
              key={`${p.start}-${p.end}-${i}`}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
                  {p.start}–{p.end}
                </span>
                {p.reason && (
                  <span className="rounded-md bg-neutral-50 px-2 py-1 text-xs text-neutral-600 ring-1 ring-neutral-200">
                    {p.reason}
                  </span>
                )}
                <span className="text-xs text-neutral-500">({dur} Min)</span>
              </div>
              <button
                onClick={() => remove(i)}
                className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                aria-label="Sperrzeit entfernen"
              >
                Entfernen
              </button>
            </li>
          );
        })}
      </ul>

      {/* Mini Timeline Preview */}
      <div className="rounded-xl border p-3">
        <div className="mb-2 text-xs text-neutral-500">Vorschau: Tagesleiste</div>
        <div className="relative h-8 w-full rounded bg-neutral-100">
          {(periods ?? []).map((p, i) => {
            const s = toMin(p.start) / (24 * 60);
            const e = toMin(p.end) / (24 * 60);
            return (
              <div
                key={i}
                className="absolute inset-y-0 rounded bg-neutral-400/70"
                style={{ left: `${s * 100}%`, width: `${Math.max(0, (e - s) * 100)}%` }}
                title={`${p.start}-${p.end}${p.reason ? ` • ${p.reason}` : ""}`}
              />
            );
          })}
          <div className="absolute -bottom-5 left-0 text-[10px] text-neutral-500">00:00</div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-neutral-500">
            12:00
          </div>
          <div className="absolute -bottom-5 right-0 text-[10px] text-neutral-500">24:00</div>
        </div>
      </div>
    </section>
  );
}
