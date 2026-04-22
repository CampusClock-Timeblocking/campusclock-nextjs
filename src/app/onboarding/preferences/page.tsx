"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OnboardingNavigation } from "../OnboardingNavigation";
import { steps } from "../steps";

export default function PreferencesPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const savePreferences = api.onboarding.savePreferences.useMutation({
    onMutate: () => setLoading(true),
    onSuccess: () => router.push("/dashboard"),
    onError: (error) => toast.error(error.message),
  });

  const currentStep = steps[2];

  return (
    <>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-2 text-3xl font-semibold text-gray-700 sm:text-4xl dark:text-gray-100"
      >
        {currentStep.title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="text-muted-foreground mb-10"
      >
        {currentStep.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
      >
        <form onSubmit={(e) => { e.preventDefault(); savePreferences.mutate(); }} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
          >
            <OnboardingNavigation
              nextText={
                loading
                  ? "Creating your plan..."
                  : "Create optimized schedule"
              }
              nextDisabled={loading}
              className="mt-12"
              isLastStep={true}
            />
          </motion.div>
        </form>
      </motion.div>
    </>
  );
}
