"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Sparkles, ShieldCheck, Zap, LineChart, ArrowRight, Check, Youtube, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";

// ────────────────────────────────────────────────────────────────────────────────
// Color system
// If your logo defines specific brand colors, map them here once and reuse.
// Adjust the gradient + accents in one place (no magic hex throughout the code).
const BRAND = {
  // Primary gradient: sunrise → tweak with your logo colors
  from: "#5B7CFF", // soft blue
  via: "#8B5CF6", // violet
  to: "#FF69B4", // pink highlight
  // Solids
  primary: "#8B5CF6",
  primaryFg: "#ffffff",
  surface: "#0B0B12",
  surfaceAlt: "#12121C",
  border: "#27273A",
  ring: "#C4B5FD",
};

export default function Home() {
  const requestGoogleCalendarAccess = async () => {
    await authClient.linkSocial({ provider: "google", scopes: ["https://www.googleapis.com/auth/calendar"] });
  };

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      {/* Background gradient + glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-90"
        style={{
          background:
            `radial-gradient(60% 60% at 50% 0%, ${BRAND.from}11 0%, transparent 60%),` +
            `radial-gradient(40% 40% at 90% 20%, ${BRAND.to}14 0%, transparent 60%),` +
            `linear-gradient(180deg, #07070C 0%, #05050A 100%)`,
        }}
      />

      {/* NAV */}
      <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-black/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Replace with your real logo and set sizes */}
            <Image src="/campusclock.png" alt="CampusClock" width={36} height={36} priority />
            <span className="text-lg font-semibold tracking-tight">CampusClock</span>
            <Badge variant="secondary" className="ml-2 bg-white/10 text-white">Beta</Badge>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="#features" className="text-sm text-white/80 hover:text-white">Features</Link>
            <Link href="#how" className="text-sm text-white/80 hover:text-white">How it works</Link>
            <Link href="#integrations" className="text-sm text-white/80 hover:text-white">Integrations</Link>
            <Link href="#faq" className="text-sm text-white/80 hover:text-white">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/auth/sign-in"><Button variant="ghost" className="text-white">Log in</Button></Link>
            <Link href="/onboarding/welcome"><Button className="bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)] border-0 text-white" style={{
              // feed CSS vars for easier theming
              ['--from' as string]: BRAND.from,
              ['--via' as string]: BRAND.via,
              ['--to' as string]: BRAND.to,
            }}>Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-10 pt-20 md:grid-cols-2 md:gap-14 md:pb-20 md:pt-28">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-balance text-5xl font-bold leading-tight sm:text-6xl"
            >
              Time‑blocking that actually <span className="bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)] bg-clip-text text-transparent" style={{ ['--from' as string]: BRAND.from, ['--via' as string]: BRAND.via, ['--to' as string]: BRAND.to }}>sticks</span>
            </motion.h1>
            <p className="mt-5 max-w-prose text-lg text-white/80">
              CampusClock is your scheduling copilot: plan classes, deep‑work and life in one place. Smart blocks, energy‑aware routines, and real‑time calendar sync.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/onboarding/welcome"><Button className="h-14 px-8 bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)] border-0 text-white text-lg" style={{
              // feed CSS vars for easier theming
              ['--from' as string]: BRAND.from,
              ['--via' as string]: BRAND.via,
              ['--to' as string]: BRAND.to,
            }}>Get started</Button></Link>
            </div>

            <div className="mt-6 flex items-center gap-4 text-xs text-white/60">
              <div className="flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> OAuth 2.0, your data stays yours</div>
              <div className="hidden items-center gap-1 sm:flex"><Zap className="h-4 w-4" /> 60‑second onboarding</div>
            </div>
          </div>

          {/* Visual mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl ring-1 ring-white/5 backdrop-blur">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <MockCalendar />
              </div>
            </div>
            {/* glow */}
            <div className="absolute -inset-6 -z-10 rounded-[2rem] opacity-30 blur-3xl" style={{ background: `linear-gradient(90deg, ${BRAND.from}, ${BRAND.via}, ${BRAND.to})` }} />
          </motion.div>
        </div>
      </section>

      {/* VALUE PILLARS */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard icon={<Clock className="h-5 w-5" />} title="Energy‑aware blocks" desc="Match tasks to your energy curve. Hit hard when you’re sharp, protect focus when you’re not." />
          <FeatureCard icon={<LineChart className="h-5 w-5" />} title="Adaptive planning" desc="Plans adjust when life happens. Keep your day realistic without manual dragging." />
          <FeatureCard icon={<Bell className="h-5 w-5" />} title="Smart nudges" desc="Micro‑prompts that keep momentum — not spam. Gentle cues, just‑in‑time." />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
          <Link href="/auth/sign-up" className="text-sm text-white/80 hover:text-white">Create free account →</Link>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StepCard step={1} title="Connect" desc="Link Google Calendar in one click. We’ll import events and keep everything in sync." />
          <StepCard step={2} title="Tune" desc="Pick your energy profile, work hours and class schedule. We’ll propose a realistic plan." />
          <StepCard step={3} title="Flow" desc="Stay in the zone with block‑by‑block guidance and subtle nudges when plans change." />
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section id="integrations" className="mx-auto max-w-7xl px-4 pb-20">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white/90">
              <Sparkles className="h-5 w-5" /> Plays nice with your stack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <IntegrationPill label="Google Calendar" />
              <IntegrationPill label="Apple Calendar (ICS)" />
              <IntegrationPill label="Notion Tasks" />
              <IntegrationPill label="Microsoft 365 (soon)" />
            </div>
          </CardContent>
          <CardFooter className="text-sm text-white/70">Need another integration? <Link href="/contact" className="underline-offset-2 hover:underline">Tell us</Link>.</CardFooter>
        </Card>
      </section>

      {/* SOCIAL PROOF */}
      <section className="mx-auto max-w-7xl px-4 pb-24">
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2">
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Youtube className="h-5 w-5" /> 90‑sec tour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/40" />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>What students say</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/80">
              <Testimonial text="Finally a planner that adapts when profs move deadlines. My week stays sane." name="Miriam • B.Sc. WiInf" />
              <Testimonial text="The energy‑blocks are game‑changing. I schedule deep work when I’m actually sharp." name="Jonas • CS" />
              <Testimonial text="Sync is instant. Blocks feel ‘alive’ instead of static boxes." name="Sofia • Design" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-4 pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r p-[1px]" style={{ backgroundImage: `linear-gradient(90deg, ${BRAND.from}, ${BRAND.via}, ${BRAND.to})` }}>
          <div className="rounded-[calc(theme(borderRadius.3xl)-1px)] bg-black/70 p-8 md:p-12">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h3 className="text-2xl font-semibold md:text-3xl">Build your best week yet</h3>
                <p className="mt-2 max-w-prose text-white/80">Start free. Link your calendar, pick your energy curve, and watch your schedule click.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" className="h-12 px-6 text-base font-semibold" onClick={requestGoogleCalendarAccess}>
                  Try with Google <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Link href="/auth/sign-up"><Button size="lg" variant="secondary" className="h-12 px-6 text-base">Create account</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-black/40 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="CampusClock" width={24} height={24} />
            <span className="text-sm text-white/70">© {new Date().getFullYear()} CampusClock</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/70">
            <Link href="/imprint" className="hover:text-white">Imprint</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Sub‑components

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="border-white/10 bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-white/80">{desc}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <Card className="relative overflow-hidden border-white/10 bg-white/5">
      <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white/70">Step {step}</div>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-white/80">
          {desc.split(". ").map((s, i) => (
            s ? (
              <li key={i} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0" /> <span>{s}{i !== desc.split(". ").length - 1 ? "." : ""}</span></li>
            ) : null
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function IntegrationPill({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
      {label}
    </div>
  );
}

function Testimonial({ text, name }: { text: string; name: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-3">
      <p className="text-white/90">“{text}”</p>
      <p className="mt-2 text-xs text-white/60">{name}</p>
    </div>
  );
}

// A lightweight, illustrative calendar mock (pure JSX/CSS) to avoid bundling heavy libs here
function MockCalendar() {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-white/80">October 2025</div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Week</span>
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Month</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-white/60">
        {days.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-white/10 bg-white/5 p-1">
            {/* Example blocks */}
            {i % 9 === 0 && <div className="mb-1 h-2 rounded bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)]" style={{ ['--from' as string]: BRAND.from, ['--via' as string]: BRAND.via, ['--to' as string]: BRAND.to }} />}
            {i % 13 === 0 && <div className="h-2 rounded bg-white/20" />}
          </div>
        ))}
      </div>
    </div>
  );
}
