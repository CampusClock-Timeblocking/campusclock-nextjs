"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface NavProps {
  next?: string
  back?: string
  nextLabel?: string
}

export function NavButtons({ next, back, nextLabel = "Weiter" }: NavProps) {
  const router = useRouter()

  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/70 backdrop-blur-md z-20">
      <div className="mx-auto max-w-md flex justify-between gap-3 px-6 py-4">
        {back ? (
          <Button
            variant="outline"
            className="rounded-full bg-white py-5 text-gray-800"
            onClick={() => router.push(back)}
          >
            Zurück
          </Button>
        ) : (
          <div />
        )}
        {next && (
          <Button
            className="rounded-full bg-black py-5 text-white hover:bg-blue-600"
            onClick={() => router.push(next)}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </footer>
  )
}
