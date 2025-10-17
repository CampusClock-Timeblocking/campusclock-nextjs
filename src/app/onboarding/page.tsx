// src/app/(private)/onboarding/page.tsx
"use client"

import { useEffect, useState } from "react"
import { event } from "@/lib/analytics"
import { useOnboardingDraft, onboardingSchema } from "@/lib/onboarding"
import OnboardingLayout from "@/components/onboarding/OnboardingLayout"
import Basics from "@/components/onboarding/sections/Basics"
import Blocks from "@/components/onboarding/sections/Blocks"
import Preferences from "@/components/onboarding/sections/Preferences"
import WowPreview from "@/components/onboarding/WowPreview"
// optional: import { useRouter } from "next/navigation"

export default function OnboardingPage() {
  const { data, patch, clear, mounted } = useOnboardingDraft()
  const [showPreview, setShowPreview] = useState(false)
  // const router = useRouter()

  useEffect(() => {
    event("onboarding_start", { entry: "welcome_or_direct" })
  }, [])

  if (!mounted) return null

  function handleQuickStart() {
    event("quickstart_clicked")
    // ggf. Defaults setzen – du hast sie schon im Draft
    setShowPreview(true) // -> öffnet die Vorschau
  }

  function handleFinish() {
    const ok = onboardingSchema.safeParse(data)
    if (!ok.success) {
      // TODO: Inline-Hinweis/Fehler anzeigen
      return
    }
    event("onboarding_finished", {
      mode: data.schedulingPolicy,
      energy: data.energyPreset,
      daysCount: data.workingDays.length,
    })
    setShowPreview(true) // Vorschau öffnen (nicht sofort clearen!)
  }

  function handleApply(scope: "today" | "both_days") {
    event("plan_applied", { scope })
    clear()                 // jetzt Draft löschen
    setShowPreview(false)
    // router.push("/app/today") // später aktivieren
  }

  return (
    <>
      <OnboardingLayout
        onQuickStart={handleQuickStart}
        onFinish={handleFinish}
        ctaDisabled={false}
      >
        <Basics value={data} onChange={patch} />
        <Blocks value={data} onChange={patch} />
        <Preferences value={data} onChange={patch} />
      </OnboardingLayout>

      <WowPreview
        open={showPreview}
        onClose={() => setShowPreview(false)}
        payload={{ earliestTime: data.earliestTime, latestTime: data.latestTime }}
        onApply={handleApply}
      />
    </>
  )
}
