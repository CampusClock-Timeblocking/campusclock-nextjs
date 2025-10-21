"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { steps } from "../steps"
import { motion } from "framer-motion"
import { Iphone } from "@/components/ui/iphone"

export default function OnboardingWelcomePage() {
  const currentStep = steps[0]

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-48 mb-6"
      >
        <Iphone src="/app-dashboard.png" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-3 text-3xl font-semibold text-gray-900 sm:text-4xl text-balance"
      >
        {currentStep.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="text-gray-600"
      >
        {currentStep.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
      >
        <Button size="lg" asChild className="mt-8">
          <Link href="/onboarding/working-hours">Set up profile</Link>
        </Button>
      </motion.div>
    </>
  )
}
