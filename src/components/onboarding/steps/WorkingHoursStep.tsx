// FILE: src/components/onboarding/steps/WorkingHoursStep.tsx
"use client";

import { useEffect, useMemo } from "react";
import type { OnboardingData } from "@/lib/schemas";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { Clock, CalendarDays, Sparkles } from "lucide-react";

/* ================= utils ================= */
type Props = {
  value: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
};

const DAY_MIN = 24 * 60;
const STEP_MIN = 30;

const DAYS = [
  { i: 1, label: "Mo" },
  { i: 2, label: "Di" },
  { i: 3, label: "Mi" },
  { i: 4, label: "Do" },
  { i: 5, label: "Fr" },
  { i: 6, label: "Sa" },
  { i: 0, label: "So" },
] as const;

const DUR_OPTIONS = [240, 360, 450, 480, 540, 600, 720]; // 4h, 6h, 7:30, 8h, 9h, 10h, 12h

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (Number.isFinite(h) ? h! : 0) * 60 + (Number.isFinite(m) ? m! : 0);
}
function toHHMM(min: number) {
  const mm = Math.max(0, Math.min(DAY_MIN - 1, Math.round(min)));
  const h = String(Math.floor(mm / 60)).padStart(2, "0");
  const m = String(mm % 60).padStart(2, "0");
  return `${h}:${m}`;
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function roundTo(n: number, step: number) {
  return Math.round(n / step) * step;
}
function fmtDur(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/* ================= component ================= */
export default function WorkingHoursStep({ value, onChange }: Props) {
  const startMin = toMin(value.earliestTime);
  const endMin = toMin(value.latestTime);
  const duration = Math.max(STEP_MIN, endMin - startMin);

  const windowMinutes = useMemo(
    () => Math.max(0, endMin - startMin),
    [startMin, endMin]
  );
  const invalid = windowMinutes < STEP_MIN;

  // Auto-Fix
  useEffect(() => {
    if (endMin <= startMin) {
      onChange({
        latestTime: toHHMM(clamp(startMin + STEP_MIN, 0, DAY_MIN)),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.earliestTime, value.latestTime]);

  function setDays(kind: "weekdays" | "all") {
    if (kind === "weekdays") onChange({ workingDays: [1, 2, 3, 4, 5] });
    if (kind === "all") onChange({ workingDays: [1, 2, 3, 4, 5, 6, 0] });
  }

  function onDaysChange(vals: string[]) {
    const arr = vals.map((v) => parseInt(v, 10));
    const order = [1, 2, 3, 4, 5, 6, 0];
    arr.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    onChange({ workingDays: arr });
  }

  function applyWindow(start: string, end: string) {
    onChange({ earliestTime: start, latestTime: end });
  }

  function commitStart(newStartMin: number) {
    const s = clamp(roundTo(newStartMin, STEP_MIN), 0, DAY_MIN - duration);
    const e = s + duration;
    onChange({ earliestTime: toHHMM(s), latestTime: toHHMM(e) });
  }

  function commitDuration(newDurMin: number) {
    const d = clamp(roundTo(newDurMin, STEP_MIN), 240, 720); // 4h–12h
    const s = clamp(startMin, 0, DAY_MIN - d);
    const e = s + d;
    onChange({ earliestTime: toHHMM(s), latestTime: toHHMM(e) });
  }

  const timeStepSeconds = STEP_MIN * 60;

  return (
    <section
      className="
        space-y-5
        rounded-2xl
        p-4
        [background:radial-gradient(1200px_500px_at_100%_-20%,hsl(var(--primary)/0.06),transparent_60%),radial-gradient(900px_360px_at_-10%_0%,hsl(var(--secondary)/0.07),transparent_60%)]
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold tracking-tight">Arbeitszeiten</h3>
        </div>
        <Badge
          variant="secondary"
          className="rounded-full border bg-background/60 backdrop-blur supports-[backdrop-filter]:px-3"
        >
          {fmtDur(windowMinutes)}
        </Badge>
      </div>

      {/* Pretty presets – pill buttons */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "8–16", s: "08:00", e: "16:00" },
          { label: "9–17", s: "09:00", e: "17:00" },
          { label: "10–18", s: "10:00", e: "18:00" },
        ].map((p) => (
          <Button
            key={p.label}
            className="h-12 rounded-xl border bg-white/60 text-sm shadow-sm backdrop-blur transition hover:shadow-md dark:bg-white/10"
            variant="outline"
            onClick={() => applyWindow(p.s, p.e)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Start & Dauer – visual compact cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Startzeit */}
        <Card className="border-muted/70 bg-background/60 shadow-sm backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label className="text-sm">Startzeit</Label>
              </div>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {value.earliestTime}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="time"
              className="h-12 w-full rounded-xl border bg-background px-4 font-mono text-base tabular-nums shadow-sm"
              value={value.earliestTime}
              step={timeStepSeconds}
              onChange={(e) => commitStart(toMin(e.target.value))}
            />
            <div className="text-xs text-muted-foreground">
              Ende:{" "}
              <span className="font-mono tabular-nums">
                {toHHMM(startMin + duration)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Dauer */}
        <Card className="border-muted/70 bg-background/60 shadow-sm backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <Label className="text-sm">Dauer</Label>
              </div>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {fmtDur(duration)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-12 w-full rounded-xl border bg-background px-4 text-base shadow-sm"
                value={String(duration)}
                onChange={(e) => commitDuration(parseInt(e.target.value, 10))}
              >
                {DUR_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {fmtDur(d)}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-12 rounded-xl"
                  onClick={() => commitDuration(duration - STEP_MIN)}
                >
                  −30m
                </Button>
                <Button
                  variant="outline"
                  className="h-12 rounded-xl"
                  onClick={() => commitDuration(duration + STEP_MIN)}
                >
                  +30m
                </Button>
              </div>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              {/* mini progress bar for day coverage */}
              <div
                className="h-full bg-primary/70"
                style={{
                  width: `${(Math.min(duration, 12 * 60) / (12 * 60)) * 100}%`,
                }}
              />
            </div>

            {invalid && (
              <Alert variant="default" className="mt-1">
                <AlertDescription className="text-sm">
                  Dein Fenster ist sehr klein. Erhöhe die Dauer.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Arbeitstage – visually delightful chips */}
      <Card className="border-muted/70 bg-background/60 shadow-sm backdrop-blur">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Arbeitstage</Label>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    Presets
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDays("weekdays")}>
                    Mo–Fr
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDays("all")}>
                    Alle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() =>
                  onChange({
                    earliestTime: "09:00",
                    latestTime: "17:00",
                    workingDays: [1, 2, 3, 4, 5],
                  })
                }
              >
                Zurücksetzen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="multiple"
            value={value.workingDays.map(String)}
            onValueChange={onDaysChange}
            className="flex flex-wrap gap-2"
            aria-label="Arbeitstage auswählen"
          >
            {DAYS.map((d) => (
              <ToggleGroupItem
                key={d.i}
                value={String(d.i)}
                className="
                  rounded-full px-4 py-2 text-sm
                  data-[state=on]:bg-primary data-[state=on]:text-primary-foreground
                  border bg-background/80 shadow-sm
                "
                aria-label={`Arbeitstag ${d.label}`}
              >
                {d.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {/* Small helper hint */}
          <div className="mt-3 text-xs text-muted-foreground">
            Tipp: Starte mit <span className="font-medium">Mo–Fr</span>, aktiviere{" "}
            <span className="font-medium">Sa</span> für Sprints.
          </div>
        </CardContent>
      </Card>

      {/* subtle footer pill with current window */}
      <div className="mt-1 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs shadow-sm backdrop-blur">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono tabular-nums">
            {value.earliestTime}–{value.latestTime}
          </span>
          <span className="text-muted-foreground">•</span>
          <span>{value.workingDays.length} Tage</span>
        </div>
      </div>
    </section>
  );
}
