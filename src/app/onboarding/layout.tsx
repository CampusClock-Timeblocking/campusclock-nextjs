import { SessionGuard } from "@/components/SessionGuard"

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGuard>
      <main className="px-4 sm:px-6 py-10 max-w-xl mx-auto min-h-[100dvh] flex flex-col justify-center">
        {children}
      </main>
    </SessionGuard>
  )
}
