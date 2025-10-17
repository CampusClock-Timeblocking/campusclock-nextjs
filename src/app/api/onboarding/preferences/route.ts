// src/app/api/onboarding/preferences/route.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/server/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_USER_ID = process.env.DEV_USER_ID ?? "00000000-0000-0000-0000-000000000000"
const DEV_USER_EMAIL = "dev@example.local"

const bodySchema = z.object({
  energyProfile: z.enum(["EARLY_BIRD", "BALANCED", "NIGHT_OWL"]),
  planningMode: z.enum(["DAILY", "EVENT_BASED", "MANUAL"]),
})

// simple presets (24 Werte, 0..1)
const energyPresets: Record<"EARLY_BIRD" | "BALANCED" | "NIGHT_OWL", number[]> = {
  EARLY_BIRD: [
    // 00..23 – morgens hoch, abends runter
    0.2,0.2,0.25,0.3,0.45,0.65,0.85,0.95,0.9,0.8,0.7,0.65,
    0.6,0.55,0.5,0.5,0.55,0.6,0.55,0.45,0.35,0.3,0.25,0.22
  ],
  BALANCED: new Array(24).fill(0).map((_,h)=> (h>=9 && h<=17) ? 0.75 : 0.55),
  NIGHT_OWL: [
    // abends hoch
    0.2,0.2,0.2,0.22,0.25,0.3,0.35,0.45,0.55,0.6,0.65,0.7,
    0.75,0.8,0.85,0.9,0.95,0.95,0.9,0.8,0.65,0.5,0.35,0.25
  ],
}

export async function POST(req: Request) {
  try {
    const json = await req.json() as z.infer<typeof bodySchema>
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.format() }, { status: 400 })
    }
    const { energyProfile, planningMode } = parsed.data

    // ensure DEV user exists (FK)
    await prisma.user.upsert({
      where: { id: DEV_USER_ID },
      update: {},
      create: { id: DEV_USER_ID, name: "Dev User", email: DEV_USER_EMAIL },
    })

    // map planningMode -> enum in Schema
    const policy =
      planningMode === "DAILY" ? "DAILY_INTERVAL" :
      planningMode === "EVENT_BASED" ? "EVENT_BASED" :
      "MANUAL_TRIGGER"

    // write SchedulingConfig (unique per user)
    await prisma.schedulingConfig.upsert({
      where: { userId: DEV_USER_ID },
      update: { reschedulingPolicy: policy },
      create: { userId: DEV_USER_ID, reschedulingPolicy: policy },
    })

    // write energy profile to WorkingPreferences (create if missing)
    await prisma.workingPreferences.upsert({
      where: { userId: DEV_USER_ID },
      update: { alertnessByHour: energyPresets[energyProfile] },
      create: {
        userId: DEV_USER_ID,
        // defaults aus deinem Schema greifen für vieles;
        earliestTime: new Date(Date.UTC(1970,0,1,8,0,0)),
        latestTime:   new Date(Date.UTC(1970,0,1,17,0,0)),
        workingDays:  [1,2,3,4,5],
        alertnessByHour: energyPresets[energyProfile],
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("preferences POST failed", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
