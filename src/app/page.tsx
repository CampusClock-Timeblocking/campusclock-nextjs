// src/app/(private)/onboarding/page.tsx

"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
    const router = useRouter();

    useEffect(() => {
        router.push("/onboarding/welcome");
    }, [router]);

    return null;
}