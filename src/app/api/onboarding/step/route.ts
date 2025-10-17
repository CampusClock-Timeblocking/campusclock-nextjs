import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { getSession } from "@/lib/getSession"
import { onboardingSchema } from "@/lib/validation/onboarding"

// HH:MM -> Date in UTC (stabil für @db.Time)
function hhmmToUTCDate(t: string) {
  const [h, m] = t.split(":").map(Number)
  return new Date(Date.UTC(1970, 0, 1, h || 0, m || 0, 0))
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await req.json()
  const parsed = onboardingSchema.safeParse(body as typeof onboardingSchema["_input"])
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.format() },
      { status: 400 },
    )
  }

  const { earliestTime, latestTime, workingDays } = parsed.data

  // ⚠️ Für Prisma @db.Time: immer stabil in UTC erzeugen
  const earliest = hhmmToUTCDate(earliestTime)
  const latest = hhmmToUTCDate(latestTime)

  await prisma.workingPreferences.upsert({
    where: { userId: session.user.id },
    update: {
      earliestTime: earliest,
      latestTime: latest,
      workingDays: workingDays.map((d) =>
        ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].indexOf(d),
      ),
    },
    create: {
      userId: session.user.id,
      earliestTime: earliest,
      latestTime: latest,
      workingDays: workingDays.map((d) =>
        ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].indexOf(d),
      ),
      alertnessByHour: new Array(24).fill(0.5),
    },
  })

  return NextResponse.json({ ok: true })
}
