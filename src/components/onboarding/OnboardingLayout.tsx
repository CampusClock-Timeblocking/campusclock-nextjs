// src/components/onboarding/OnboardingLayout.tsx
"use client"
import { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export default function OnboardingLayout({
  children,
  onQuickStart,
  onFinish,
  ctaDisabled,
}: {
  children: ReactNode
  onQuickStart: () => void
  onFinish: () => void
  ctaDisabled?: boolean
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Mach Schluss mit Chaos – dein Tag plant sich jetzt selbst.</h1>
        <p className="text-sm text-neutral-600">Wir lesen nur Kalender-Zeiten, keine Inhalte.</p>
        <div className="mt-4">
          <Button onClick={onQuickStart} className="rounded-xl">Mit empfohlenen Einstellungen starten</Button>
        </div>
      </header>

      {/* Sections */}
      <div className="space-y-6">{children}</div>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 mt-8 border-t bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button className="text-sm text-neutral-600 hover:underline">Später anpassen</button>
          <Button onClick={onFinish} disabled={!!ctaDisabled} className="rounded-xl">
            Fertigstellen & Plan ansehen
          </Button>
        </div>
      </footer>
    </section>
  )
}
