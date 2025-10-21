"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ConfettiButton } from "../../components/ui/confetti"

interface OnboardingNavigationProps {
    onBack?: () => void
    onNext?: () => void
    nextText?: string
    nextDisabled?: boolean
    showBack?: boolean
    showNext?: boolean
    className?: string
    isLastStep?: boolean
}

export function OnboardingNavigation({
    onBack,
    onNext,
    nextText = "Continue",
    nextDisabled = false,
    showBack = true,
    showNext = true,
    isLastStep = false,
    className,
}: OnboardingNavigationProps) {
    const router = useRouter()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else {
            router.back()
        }
    }

    return (
        <div className={cn("flex justify-between gap-2 items-baseline w-full", className)}>
            {showBack && (
                <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                    Back
                </Button>
            )}
            {showNext && (isLastStep ? (
                <div className="relative">
                    <ConfettiButton type="submit" disabled={nextDisabled} onClick={onNext}>
                        {nextText}
                    </ConfettiButton>
                </div>
            ) : (
                <Button type="submit" disabled={nextDisabled} onClick={onNext}>
                    {nextText} <ArrowRight className="size-4" />
                </Button>
            ))}
        </div>
    )
}
