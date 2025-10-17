import { NextResponse } from "next/server"
import { prisma } from "@/server/db"
import { getSession } from "@/lib/getSession"

export async function POST() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Optional: SchedulingConfig automatisch anlegen
  await prisma.schedulingConfig.upsert({
    where: { userId: session.user.id },
    update: {},
    create: {
      userId: session.user.id,
      reschedulingPolicy: "DAILY_INTERVAL",
      horizonDays: 7,
    },
  })

  // Optional: User-Metadaten aktualisieren
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
