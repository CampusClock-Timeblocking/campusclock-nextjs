"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

interface SessionGuardProps {
    children: React.ReactNode
    redirectTo?: string
}

export function SessionGuard({ children, redirectTo = "/auth/sign-up" }: SessionGuardProps) {
    const { data: session, isPending } = authClient.useSession()
    const router = useRouter()

    useEffect(() => {
        if (!isPending && !session?.user?.id) {
            router.push(redirectTo)
        }
    }, [session, isPending, router, redirectTo])

    // Show loading state while checking session
    if (isPending) {
        return (
            <div className="flex items-center justify-center min-h-[100dvh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    // Don't render children if not authenticated
    if (!session?.user?.id) {
        return null
    }

    return <>{children}</>
}
