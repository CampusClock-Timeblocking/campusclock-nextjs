 "use client";
import type { OnboardingData } from "@/lib/schemas";

// Simple Heuristik: packe quickTasks linear zwischen earliest/latest unter Beachtung excluded
export function MiniTimelinePreview({ value }: { value: OnboardingData }) {
  function toMinutes(t: string) { const [h,m] = t.split(":").map(Number); return h*60+m; }
  const start = toMinutes(value.earliestTime);
  const end = toMinutes(value.latestTime);
  const width = end - start;

  return (
    <div className="rounded-xl border p-3">
      <div className="mb-2 text-xs text-neutral-500">Vorschau: heutiges Zeitfenster</div>
      <div className="relative h-10 w-full rounded-lg bg-neutral-100">
        {/* Excluded als Schraffur */}
        {(value.excluded ?? []).map((p,i)=>{
          const s = (toMinutes(p.start)-start)/width*100;
          const e = (toMinutes(p.end)-start)/width*100;
          const w = Math.max(0, e - s);
          if (w<=0) return null;
          return (
            <div key={i}
              className="absolute inset-y-0 bg-neutral-300/60"
              style={{ left: `${s}%`, width: `${w}%` }}
              aria-label={`Sperrzeit ${p.start}-${p.end}`}
            />
          );
        })}
        {/* Platzhalter-Tasks gleichmäßig */}
        {value.quickTasks.map((t, i) => {
          const slot = i + 1;
          const blocks = value.quickTasks.length + 1;
          const s = (slot / blocks) * 0.9; // 5% Padding
          const w = Math.min(0.15, t.durationMinutes! / width); // grob begrenzen
          return (
            <div key={i}
              className="absolute inset-y-1/4 rounded bg-neutral-900 text-white"
              style={{ left: `${s*100}%`, width: `${w*100}%` }}
              title={t.title}
            />
          );
        })}
        {/* Start/Ende Labels */}
        <div className="absolute -bottom-5 left-0 text-[10px] text-neutral-500">{value.earliestTime}</div>
        <div className="absolute -bottom-5 right-0 text-[10px] text-neutral-500">{value.latestTime}</div>
      </div>
    </div>
  );
}
