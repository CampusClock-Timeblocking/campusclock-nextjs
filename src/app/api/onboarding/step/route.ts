// src/app/api/onboarding/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { onboardingSchema } from "@/lib/validation/onboarding"

// Helper: HH:MM -> UTC Date (stabil für @db.Time)
function hhmmToUTCDate(t: string) {
  const [h, m] = t.split(":").map(Number)
  return new Date(Date.UTC(1970, 0, 1, h ?? 0, m ?? 0, 0))
}

// ⚠️ DEV-Only: Fester User für lokale Tests (unique in workingPreferences.userId)
const DEV_USER_ID =
  process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000000"

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json()
    const parsed = onboardingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { earliestTime, latestTime, workingDays } = parsed.data
    const earliest = hhmmToUTCDate(earliestTime)
    const latest = hhmmToUTCDate(latestTime)

    const wdays = workingDays.map((d: string) =>
      ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].indexOf(d)
    )

    await prisma.workingPreferences.upsert({
      where: { userId: DEV_USER_ID }, // <- unique
      update: {
        earliestTime: earliest,
        latestTime: latest,
        workingDays: wdays,
      },
      create: {
        userId: DEV_USER_ID,
        earliestTime: earliest,
        latestTime: latest,
        workingDays: wdays,
        alertnessByHour: new Array(24).fill(0.5),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("onboarding POST failed", err)
    return NextResponse.json(
      { error: "Server error while saving onboarding" },
      { status: 500 }
    )
  }
}
