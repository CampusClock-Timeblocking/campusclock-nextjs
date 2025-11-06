// app/auth/[path]/AuthShell.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { AuthView } from "@daveyplate/better-auth-ui"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const BRAND = {
  from: "#5B7CFF",
  via:  "#8B5CF6",
  to:   "#FF69B4",
}

export default function AuthShell({ path }: { path: string }) {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center bg-black text-white">
      {/* Hintergrund: softer Verlauf + subtile Glow-Flächen */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            `radial-gradient(55% 55% at 50% -10%, ${BRAND.from}10 0%, transparent 70%),` +
            `radial-gradient(35% 35% at 100% 10%, ${BRAND.to}18 0%, transparent 60%),` +
            `linear-gradient(180deg, #0A0A10 0%, #07070D 100%)`,
        }}
      />

      {/* Kopf: Logo + Home-Link minimal */}
      <header className="absolute left-0 right-0 top-0 mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-sm text-white/80">
        <div className="flex items-center gap-2">
          <Image src="/campusclock.png" alt="CampusClock" width={24} height={24} priority />
          <span className="font-medium tracking-tight text-white/90">CampusClock</span>
        </div>
        <Link href="/" className="hover:text-white">Back to home</Link>
      </header>

      {/* Center-Stack */}
      <section className="w-full px-4">
        <div className="mx-auto mb-6 flex max-w-md items-center justify-center gap-2">
          <span
            className="bg-gradient-to-r bg-clip-text text-transparent text-3xl font-semibold"
            style={{
              backgroundImage: `linear-gradient(90deg, ${BRAND.from}, ${BRAND.via}, ${BRAND.to})`,
            }}
          >
            Welcome to CampusClock!
          </span>
        </div>

        <Card className="mx-auto w-full max-w-md border-white/10 bg-white/5 shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white bg-clip-text">Log in to your account</CardTitle>
            <p className="text-xs text-white/70">
              Sync your calendar and keep your week on track.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            {/* Better-Auth übernimmt die eigentlichen Felder/Provider */}
            <AuthView path={path} />
          </CardContent>
        </Card>

        {/* Kleine, klare CTAs darunter */}
        <div className="mx-auto mt-4 flex w-full max-w-md items-center justify-between text-xs text-white/70">
          <Link href="/terms" className="hover:text-white">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
        </div>
        </section>


      {/* Footer kompakt */}
      <footer className="absolute bottom-0 left-0 right-0 mx-auto mb-4 flex max-w-7xl items-center justify-between px-4 text-xs text-white/60">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="CampusClock" width={18} height={18} />
          <span>© {new Date().getFullYear()} CampusClock</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/imprint" className="hover:text-white">Imprint</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
        </div>
      </footer>
    </main>
  )
}
