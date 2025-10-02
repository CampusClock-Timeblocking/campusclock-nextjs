// FILE: src/lib/submitOnboarding.ts
import { onboardingSchema, type OnboardingData } from "./schemas"

export async function submitOnboarding(data: OnboardingData) {
  // Finalvalidierung (Safety)
  const parsed = onboardingSchema.parse(data)

  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed),
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => "Unbekannter Fehler")
    throw new Error(msg || `HTTP ${res.status}`)
  }
  return (await res.json().catch(() => ({}))) as { success: true }
}
