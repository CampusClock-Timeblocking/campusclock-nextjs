// FILE: src/components/onboarding/parts/ProgressDots.tsx
"use client"

type Props = {
  total: number
  current: number
  onJump?: (index: number) => void
}

export function ProgressDots({ total, current, onJump }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Onboarding-Fortschritt"
      className="flex items-center gap-2"
    >
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current
        return (
          <button
            key={i}
            role="tab"
            type="button"
            aria-current={isActive ? "step" : undefined}
            aria-label={`Schritt ${i + 1} von ${total}`}
            onClick={() => onJump?.(i)}
            className={[
              "h-2 w-2 rounded-full focus:outline-none focus:ring-2 focus:ring-neutral-400 transition",
              isActive ? "bg-neutral-900" : "bg-neutral-300 hover:bg-neutral-400",
            ].join(" ")}
          />
        )
      })}
    </div>
  )
}
