// FILE: src/components/onboarding/steps/QuickItemsStep.tsx
"use client";

import { useMemo, useState } from "react";
import type { OnboardingData } from "@/lib/schemas";

type Props = {
  value: OnboardingData;
  /** Patch-API: nur geänderte Felder übergeben */
  onChange: (patch: Partial<OnboardingData>) => void;
};

type QuickTask = NonNullable<OnboardingData["quickTasks"]>[number];
type QuickHabit = NonNullable<OnboardingData["quickHabits"]>[number];

const TASK_TEMPLATES: Array<Pick<QuickTask, "title" | "durationMinutes" | "priority">> = [
  { title: "Deep-Work: Bachelorarbeit", durationMinutes: 90, priority: 4 },
  { title: "E-Mails & Admin", durationMinutes: 30, priority: 2 },
  { title: "Projekt X – Konzept", durationMinutes: 60, priority: 3 },
  { title: "Lernen: 1 Kapitel", durationMinutes: 75, priority: 3 },
];

const HABIT_TEMPLATES: Array<
  Pick<QuickHabit, "title" | "recurrenceType" | "interval" | "timesPerPeriod">
> = [
  { title: "Täglich: Deep-Work 60′", recurrenceType: "DAY", interval: 1, timesPerPeriod: 1 },
  { title: "Wöchentlich: Review", recurrenceType: "WEEK", interval: 1, timesPerPeriod: 1 },
  { title: "Sport 3×/Woche", recurrenceType: "WEEK", interval: 1, timesPerPeriod: 3 },
];

const PRIORITY_PILLS = [
  { v: 1, label: "Low" },
  { v: 2, label: "Med-" },
  { v: 3, label: "Med" },
  { v: 4, label: "High" },
  { v: 5, label: "Urgent" },
] as const;

const MAX_TASKS = 5;
const MAX_HABITS = 3;
const MIN_TASK_MIN = 15;
const MAX_TASK_MIN = 240;

/* ---------- kleine Utils ---------- */
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function normTitle(s: string) {
  return s.trim().replace(/\s+/g, " ");
}
function hasDuplicate(arr: Array<{ title?: string }>, title: string) {
  const t = normTitle(title).toLocaleLowerCase();
  return arr.some((x) => normTitle(x.title ?? "").toLocaleLowerCase() === t);
}

/* ---------- Komponente ---------- */
export function QuickItemsStep({ value, onChange }: Props) {
  const [taskTitle, setTaskTitle] = useState("");
  const [habitTitle, setHabitTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tasks: QuickTask[] = value.quickTasks ?? [];
  const habits: QuickHabit[] = value.quickHabits ?? [];

  const minutesPlanned = useMemo(
    () => tasks.reduce((s, t) => s + clamp(t.durationMinutes ?? 60, MIN_TASK_MIN, MAX_TASK_MIN), 0),
    [tasks]
  );

  /* ---------- Mutationen (Tasks) ---------- */
  function addTask(t?: Pick<QuickTask, "title" | "durationMinutes" | "priority">) {
    setError(null);
    if (tasks.length >= MAX_TASKS) {
      setError(`Maximal ${MAX_TASKS} Aufgaben im Schnellstart.`);
      return;
    }
    const title = normTitle(t?.title ?? taskTitle);
    if (!title) return;
    if (hasDuplicate(tasks, title)) {
      setError("Diese Aufgabe existiert bereits.");
      return;
    }
    const newTask: QuickTask = {
      title,
      durationMinutes: clamp(t?.durationMinutes ?? 60, MIN_TASK_MIN, MAX_TASK_MIN),
      priority: clamp(t?.priority ?? 3, 1, 5),
    };
    onChange({ quickTasks: [...tasks, newTask] });
    if (!t) setTaskTitle("");
  }

  function removeTask(idx: number) {
    setError(null);
    const copy = [...tasks];
    copy.splice(idx, 1);
    onChange({ quickTasks: copy });
  }

  function mutateTask(idx: number, patch: Partial<QuickTask>) {
    const copy = [...tasks];
    const cur = copy[idx] ?? {};
    const next: QuickTask = {
      ...cur,
      ...patch,
      durationMinutes: patch.durationMinutes !== undefined
        ? clamp(patch.durationMinutes, MIN_TASK_MIN, MAX_TASK_MIN)
        : cur.durationMinutes,
      priority: patch.priority !== undefined ? clamp(patch.priority, 1, 5) : cur.priority,
      title: patch.title !== undefined ? normTitle(patch.title) : cur.title,
    };
    copy[idx] = next;
    onChange({ quickTasks: copy });
  }

  function moveTask(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= tasks.length) return;
    const copy = [...tasks];
    const [item] = copy.splice(idx, 1);
    copy.splice(to, 0, item);
    onChange({ quickTasks: copy });
  }

  /* ---------- Mutationen (Habits) ---------- */
  function addHabit(h?: Pick<QuickHabit, "title" | "recurrenceType" | "interval" | "timesPerPeriod">) {
    setError(null);
    if (habits.length >= MAX_HABITS) {
      setError(`Maximal ${MAX_HABITS} Gewohnheiten im Schnellstart.`);
      return;
    }
    const title = normTitle(h?.title ?? habitTitle);
    if (!title) return;
    if (hasDuplicate(habits, title)) {
      setError("Diese Gewohnheit existiert bereits.");
      return;
    }
    const newHabit: QuickHabit = {
      title,
      recurrenceType: h?.recurrenceType ?? "DAY",
      interval: clamp(h?.interval ?? 1, 1, 365),
      timesPerPeriod: clamp(h?.timesPerPeriod ?? 1, 1, 30),
    };
    onChange({ quickHabits: [...habits, newHabit] });
    if (!h) setHabitTitle("");
  }

  function removeHabit(idx: number) {
    setError(null);
    const copy = [...habits];
    copy.splice(idx, 1);
    onChange({ quickHabits: copy });
  }

  function moveHabit(idx: number, dir: -1 | 1) {
    const to = idx + dir;
    if (to < 0 || to >= habits.length) return;
    const copy = [...habits];
    const [item] = copy.splice(idx, 1);
    copy.splice(to, 0, item);
    onChange({ quickHabits: copy });
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Starter-Aufgaben & Gewohnheiten</h2>
          <p className="text-sm text-neutral-500">
            Füge bis zu {MAX_TASKS} Tasks und {MAX_HABITS} Gewohnheiten hinzu (optional).
          </p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-200">
          Geplant: {minutesPlanned} Min
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Tasks */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Aufgaben</div>
            <div className="text-xs text-neutral-500">{tasks.length}/{MAX_TASKS}</div>
          </div>

          {/* Templates */}
          <div className="mb-2 flex flex-wrap gap-2">
            {TASK_TEMPLATES.map((t) => (
              <button
                key={t.title}
                type="button"
                onClick={() => addTask(t)}
                className="rounded-full bg-white px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
              >
                + {t.title}
              </button>
            ))}
          </div>

          {/* Input Row */}
          <div className="flex gap-2">
            <input
              placeholder="z.B. Projekt X Konzept"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
            />
            <button
              type="button"
              onClick={() => addTask()}
              className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-900/90"
            >
              Add
            </button>
          </div>

          {/* List */}
          <ul className="mt-3 space-y-2">
            {tasks.map((t, i) => (
              <li key={`${t.title}-${i}`} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{t.title}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                      onClick={() => moveTask(i, -1)}
                      title="Nach oben"
                      aria-label="Aufgabe nach oben"
                    >
                      ⬆️
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                      onClick={() => moveTask(i, +1)}
                      title="Nach unten"
                      aria-label="Aufgabe nach unten"
                    >
                      ⬇️
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                      onClick={() => removeTask(i)}
                      aria-label="Aufgabe entfernen"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {/* Dauer */}
                  <label className="flex items-center gap-3">
                    <span className="w-20 text-xs text-neutral-500">Dauer</span>
                    <input
                      type="range"
                      min={MIN_TASK_MIN}
                      max={MAX_TASK_MIN}
                      step={5}
                      value={clamp(t.durationMinutes ?? 60, MIN_TASK_MIN, MAX_TASK_MIN)}
                      onChange={(e) =>
                        mutateTask(i, { durationMinutes: Number(e.target.value) })
                      }
                      className="flex-1"
                    />
                    <span className="w-10 text-xs text-neutral-600">
                      {clamp(t.durationMinutes ?? 60, MIN_TASK_MIN, MAX_TASK_MIN)}′
                    </span>
                  </label>

                  {/* Priority */}
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-neutral-500">Prio</span>
                    <div className="flex flex-wrap gap-1">
                      {PRIORITY_PILLS.map((p) => {
                        const active = (t.priority ?? 3) === p.v;
                        return (
                          <button
                            key={p.v}
                            type="button"
                            onClick={() => mutateTask(i, { priority: p.v })}
                            className={[
                              "rounded-full px-2 py-1 text-xs ring-1 transition",
                              active
                                ? "bg-neutral-900 text-white ring-neutral-900"
                                : "bg-white text-neutral-700 ring-neutral-300 hover:bg-neutral-50",
                            ].join(" ")}
                            aria-pressed={active}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </li>
            ))}

            {tasks.length === 0 && (
              <li className="rounded-lg border border-dashed px-3 py-3 text-sm text-neutral-500">
                Noch keine Aufgaben – nutze die Vorlagen oder füge eine hinzu.
              </li>
            )}
          </ul>
        </div>

        {/* Habits */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Gewohnheiten</div>
            <div className="text-xs text-neutral-500">{habits.length}/{MAX_HABITS}</div>
          </div>

          {/* Templates */}
          <div className="mb-2 flex flex-wrap gap-2">
            {HABIT_TEMPLATES.map((h) => (
              <button
                key={h.title}
                type="button"
                onClick={() => addHabit(h)}
                className="rounded-full bg-white px-3 py-1 text-xs text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
              >
                + {h.title}
              </button>
            ))}
          </div>

          {/* Input Row */}
          <div className="flex gap-2">
            <input
              placeholder="z.B. Täglich Deep-Work 60′"
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addHabit();
                }
              }}
            />
            <button
              type="button"
              onClick={() => addHabit()}
              className="rounded-xl bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-900/90"
            >
              Add
            </button>
          </div>

          {/* List */}
          <ul className="mt-3 space-y-2">
            {habits.map((h, i) => (
              <li
                key={`${h.title}-${i}`}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{h.title}</span>
                  <span className="text-xs text-neutral-500">
                    {h.recurrenceType === "DAY"
                      ? `täglich ×${h.timesPerPeriod ?? 1}`
                      : h.recurrenceType === "WEEK"
                      ? `wöchentlich ×${h.timesPerPeriod ?? 1}`
                      : h.recurrenceType === "MONTH"
                      ? `monatlich ×${h.timesPerPeriod ?? 1}`
                      : `jährlich ×${h.timesPerPeriod ?? 1}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                    onClick={() => moveHabit(i, -1)}
                    title="Nach oben"
                    aria-label="Gewohnheit nach oben"
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                    onClick={() => moveHabit(i, +1)}
                    title="Nach unten"
                    aria-label="Gewohnheit nach unten"
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                    onClick={() => removeHabit(i)}
                    aria-label="Gewohnheit entfernen"
                  >
                    Entfernen
                  </button>
                </div>
              </li>
            ))}

            {habits.length === 0 && (
              <li className="rounded-lg border border-dashed px-3 py-3 text-sm text-neutral-500">
                Noch keine Gewohnheiten – nutze die Vorlagen oder füge eine hinzu.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Inline Error */}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </section>
  );
}
