"use client";
import Image from "next/image";
import Link from "next/link";
import { AuthView } from "@daveyplate/better-auth-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";

const BRAND = {
  from: "#5B7CFF",
  via: "#8B5CF6",
  to: "#FF69B4",
};

export default function AuthShell({ path }: { path: string }) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* Animated gradient background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${BRAND.from}15 0%, transparent 40%),` +
            `radial-gradient(800px circle at 80% 20%, ${BRAND.via}12 0%, transparent 50%),` +
            `radial-gradient(600px circle at 20% 80%, ${BRAND.to}12 0%, transparent 50%),` +
            `linear-gradient(180deg, #0A0A14 0%, #05050A 100%)`,
        }}
      />

      {/* Animated orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full opacity-20 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${BRAND.from} 0%, transparent 70%)`,
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="absolute top-1/3 right-1/4 h-80 w-80 animate-pulse rounded-full opacity-20 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${BRAND.to} 0%, transparent 70%)`,
            animation: "float 10s ease-in-out infinite reverse",
            animationDelay: "2s",
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${BRAND.from} 1px, transparent 1px), linear-gradient(90deg, ${BRAND.from} 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Header with glass effect */}
      <header className="absolute top-0 right-0 left-0 z-50 mx-auto flex max-w-7xl items-center justify-between px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3 transition-all hover:scale-105">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-50 blur-md" />
            <Image
              src="/logo.svg"
              alt="CampusClock"
              width={28}
              height={28}
              priority
              className="relative"
            />
          </div>
          <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
            CampusClock
          </span>
        </div>
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to home
        </Link>
      </header>

      {/* Main content */}
      <section className="relative z-10 w-full px-4">
        {/* Animated title */}
        <div className="mx-auto mb-8 max-w-md text-center">
          <h1
            className="mb-2 animate-fadeIn bg-gradient-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl"
            style={{
              backgroundImage: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.via}, ${BRAND.to})`,
              animationDelay: "0.1s",
            }}
          >
            Welcome Back
          </h1>

        </div>

        {/* Enhanced card with glow effect */}
        <div className="relative mx-auto w-full max-w-md">
          {/* Glow effect behind card */}
          <div
            className="absolute -inset-1 animate-pulse rounded-2xl opacity-30 blur-2xl"
            style={{
              background: `linear-gradient(135deg, ${BRAND.from}, ${BRAND.via}, ${BRAND.to})`,
            }}
          />

          <Card className="relative animate-fadeIn border-white/10 bg-gradient-to-b from-white/10 to-white/5 shadow-2xl backdrop-blur-xl" style={{ animationDelay: "0.3s" }}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl font-semibold text-white">
                Sign in to continue
              </CardTitle>
              <p className="text-sm text-white/60">
                Keep your schedule organized and never miss a class
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              <AuthView path={path} callbackURL={callbackUrl} />
            </CardContent>
          </Card>
        </div>

        {/* Enhanced links */}
        <div className="mx-auto mt-6 flex w-full max-w-md animate-fadeIn items-center justify-center gap-6 text-sm" style={{ animationDelay: "0.4s" }}>
          <Link
            href="/terms"
            className="text-white/50 transition-colors hover:text-white"
          >
            Terms of Service
          </Link>
          <span className="text-white/20">•</span>
          <Link
            href="/privacy"
            className="text-white/50 transition-colors hover:text-white"
          >
            Privacy Policy
          </Link>
        </div>
      </section>

      {/* Modern footer */}
      <footer className="absolute right-0 bottom-0 left-0 z-50 mx-auto mb-6 flex max-w-7xl items-center justify-between px-6 text-sm text-white/40 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="CampusClock"
            width={16}
            height={16}
            className="opacity-60"
          />
          <span>© {new Date().getFullYear()} CampusClock</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/imprint" className="transition-colors hover:text-white/80">
            Imprint
          </Link>
          <Link href="/terms" className="transition-colors hover:text-white/80">
            Terms
          </Link>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </main>
  );
}