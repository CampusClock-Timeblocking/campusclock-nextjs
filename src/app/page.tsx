"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Clock,
  ShieldCheck,
  Zap,
  LineChart,
  ArrowRight,
  Check,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ────────────────────────────────────────────────────────────────────────────────
// Color system
// Diese bleiben gleich, da sie für die Akzent-Steigung verwendet werden
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
  return (
    // "text-foreground" ist themenbewusst
    <main className="min-h-[100dvh] text-foreground overflow-x-hidden">
      {/* Background gradient + glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-90"
        style={{
          background:
            `radial-gradient(60% 60% at 50% 0%, ${BRAND.from}11 0%, transparent 60%),` +
            `radial-gradient(40% 40% at 90% 20%, ${BRAND.to}14 0%, transparent 60%),` +
            // Ersetzt durch CSS-Variablen aus globals.css
            `linear-gradient(180deg, var(--gradient-start) 0%, var(--gradient-end) 100%)`,
        }}
      />

      {/* NAV */}
      {/* "bg-background/70" und "border-border" sind themenbewusst */}
      <header className="sticky top-0 z-40 w-full backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="CampusClock" width={36} height={48} />
            <span className="text-2xl tracking-tight font-semibold">
              CampusClock
            </span>
            {/* "variant=secondary" ist bereits themenbewusst */}
            </div>
          <nav className="hidden items-center gap-6 md:flex">
            {/* "text-muted-foreground" und "hover:text-foreground" */}
            <Link
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#setup"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              How it works
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {/* Ghost-Button ist automatisch themenbewusst */}
            <Button variant="ghost" asChild>
              <Link href="/auth/sign-in">Log in</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)] border-0 text-white" // text-white ist hier OK, da der Button immer hell auf dunklem Verlauf ist
              style={{
                ["--from" as string]: BRAND.from,
                ["--via" as string]: BRAND.via,
                ["--to" as string]: BRAND.to,
              }}
            >
              <Link href="/onboarding/welcome">Get started</Link>
            </Button>
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
              Time‑blocking that actually{" "}
              <span
                className="bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)] bg-clip-text text-transparent"
                style={{
                  ["--from" as string]: BRAND.from,
                  ["--via" as string]: BRAND.via,
                  ["--to" as string]: BRAND.to,
                }}
              >
                sticks
              </span>
            </motion.h1>
            {/* "text-muted-foreground" für sekundären Text */}
            <p className="mt-5 max-w-prose text-lg text-muted-foreground">
              CampusClock is your scheduling copilot: plan classes, deep‑work and
              life in one place. Smart blocks, energy‑aware routines, and
              real‑time calendar sync.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/onboarding/welcome">
                <Button
                  className="h-14 px-8 bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)] border-0 text-white text-lg"
                  style={{
                    ["--from" as string]: BRAND.from,
                    ["--via" as string]: BRAND.via,
                    ["--to" as string]: BRAND.to,
                  }}
                >
                  Get started
                </Button>
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> OAuth 2.0, your data stays
                yours
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                <Zap className="h-4 w-4" /> 60‑second onboarding
              </div>
            </div>
          </div>

          {/* Visual mock */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            {/* "border-border" und "bg-card/50" (oder bg-background/30) */}
            <div className="relative rounded-3xl border border-border bg-card/50 p-3 shadow-2xl ring-1 ring-border backdrop-blur">
              {/* "border-border" und "bg-background/50" */}
              <div className="rounded-2xl border border-border bg-background/50 p-4">
                <MockCalendar />
              </div>
            </div>
            {/* glow */}
            <div
              className="absolute -inset-6 -z-10 rounded-[2rem] opacity-30 blur-3xl dark:opacity-40" // Leicht unterschiedliche Opazität für Light/Dark
              style={{
                background: `linear-gradient(90deg, ${BRAND.from}, ${BRAND.via}, ${BRAND.to})`,
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* VALUE PILLARS */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Clock className="h-5 w-5" />}
            title="Energy‑aware blocks"
            desc="Match tasks to your energy curve. Hit hard when you’re sharp, protect focus when you’re not."
          />
          <FeatureCard
            icon={<LineChart className="h-5 w-5" />}
            title="Adaptive planning"
            desc="Plans adjust when life happens. Keep your day realistic without manual dragging."
          />
          <FeatureCard
            icon={<Bell className="h-5 w-5" />}
            title="Smart nudges"
            desc="Micro‑prompts that keep momentum — not spam. Gentle cues, just‑in‑time."
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="setup" className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            How it works
          </h2>
          <Button variant="link" asChild>
            <Link
              href="/auth/sign-up"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Create free account <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StepCard
            step={1}
            title="Connect"
            desc="Link Google Calendar in one click. We’ll import events and keep everything in sync."
          />
          <StepCard
            step={2}
            title="Tune"
            desc="Pick your energy profile, work hours and class schedule. We’ll propose a realistic plan."
          />
          <StepCard
            step={3}
            title="Flow"
            desc="Stay in the zone with block‑by‑block guidance and subtle nudges when plans change."
          />
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="mx-auto max-w-7xl px-4 pb-24">
        {/* "border-border" und "bg-card" */}
        <Card className="border-border bg-card max-w-2xl mx-auto">
          <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-center text-2xl">
          <span
            className="bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)] bg-clip-text text-transparent"
            style={{
              ["--from" as string]: BRAND.from,
              ["--via" as string]: BRAND.via,
              ["--to" as string]: BRAND.to,
            }}
          >
            90-Seconds Demo
          </span>
        </CardTitle>
          </CardHeader>
          <CardContent>
        <video className="aspect-video w-full overflow-hidden rounded-xl" controls>
          <source src="/demo-tour.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
          </CardContent>
        </Card>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-4 pb-28">
        <div
          className="relative overflow-hidden rounded-3xl border border-border p-[1px]" // "border-border"
          style={{
            backgroundImage: `linear-gradient(90deg, ${BRAND.from}, ${BRAND.via}, ${BRAND.to})`,
          }}
        >
          {/* "bg-background/70" */}
          <div className="rounded-[calc(theme(borderRadius.3xl)-1px)] bg-background/70 p-8 md:p-12">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h3 className="text-2xl font-semibold md:text-3xl">
                  Build your best week yet
                </h3>
                <p className="mt-2 max-w-prose text-muted-foreground">
                  Link your calendar, pick your energy curve, and watch your
                  schedule click.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {/* Dieser Button sollte eine helle Textfarbe haben,
                    also verwenden wir "text-primary-foreground" (was im Dark Mode fast schwarz und im Light Mode weiß ist)
                    oder wir lassen "text-white" für den Gradient-Button. 
                    Da der Button-Hintergrund (der CTA) im Light-Mode hell ist, 
                    ist ein "primary" Button besser. */}
                <Button
                  size="lg"
                  className="py-6 px-8 text-base font-semibold"
                  asChild
                >
                  <Link href="/auth/sign-up">
                    Create free account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background/40 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CampusClock
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">
              Imprint
            </Link>
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Sub‑components

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    // "border-border" und "bg-card"
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {/* "border-border" und "bg-accent" */}
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-accent">
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  title,
  desc,
}: {
  step: number;
  title: string;
  desc: string;
}) {
  return (
    // "border-border" und "bg-card"
    <Card className="relative overflow-hidden border-border bg-card">
      {/* "border-border" und "bg-accent", "text-muted-foreground" */}
      <div className="absolute right-3 top-3 rounded-full border border-border bg-accent px-2 py-0.5 text-xs text-muted-foreground">
        Step {step}
      </div>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {desc.split(". ").map((s, i) =>
            s ? (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                <span>
                  {s}
                  {i !== desc.split(". ").length - 1 ? "." : ""}
                </span>
              </li>
            ) : null,
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

// A lightweight, illustrative calendar mock (pure JSX/CSS) to avoid bundling heavy libs here
function MockCalendar() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-foreground">October 2025</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {/* "border-border" und "bg-accent" */}
          <span className="rounded-md border border-border bg-accent px-2 py-1">
            Week
          </span>
          <span className="rounded-md border border-border bg-accent px-2 py-1">
            Month
          </span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
        {days.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          // "border-border" und "bg-card/50" oder "bg-accent/50"
          <div
            key={i}
            className="h-20 rounded-lg border border-border bg-card/50 p-1"
          >
            {/* Example blocks */}
            {i % 9 === 0 && (
              <div
                className="mb-1 h-2 rounded bg-gradient-to-r from-[var(--from)] via-[var(--via)] to-[var(--to)]"
                style={{
                  ["--from" as string]: BRAND.from,
                  ["--via" as string]: BRAND.via,
                  ["--to" as string]: BRAND.to,
                }}
              />
            )}
            {/* "bg-muted" für Platzhalter-Elemente */}
            {i % 13 === 0 && <div className="h-2 rounded bg-muted" />}
          </div>
        ))}
      </div>
    </div>
  );
}