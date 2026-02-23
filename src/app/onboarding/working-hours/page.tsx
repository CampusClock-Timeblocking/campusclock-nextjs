"use client";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { steps } from "../steps";
import { useForm } from "react-hook-form";
import { WorkingHoursSchema, type WorkingHours } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { OnboardingNavigation } from "../OnboardingNavigation";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  WorkingTimeRange,
  WorkingDaysSelector,
} from "@/components/settings/profile/working-hours";

export default function WorkingHoursPage() {
  const [loading, setLoading] = useState(false);
  const currentStep = steps[1];
  const router = useRouter();
  const saveWorkingHours = api.onboarding.saveWorkingHours.useMutation({
    onMutate: () => setLoading(true),
    onSuccess: () => router.push("/onboarding/preferences"),
    onError: (error) => toast.error(error.message),
  });

  const form = useForm<WorkingHours>({
    resolver: zodResolver(WorkingHoursSchema),
    defaultValues: {
      earliestTime: "09:00",
      latestTime: "17:00",
      workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    },
  });

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
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) =>
              saveWorkingHours.mutateAsync(values),
            )}
            className="space-y-12"
          >
            <WorkingTimeRange
              form={form}
              stepSize={15}
              className="text-gray-700 dark:text-gray-100"
            />
            <WorkingDaysSelector form={form} idPrefix="onboarding" />
            <OnboardingNavigation
              className="mt-12"
              nextDisabled={loading}
              nextText={loading ? "Saving..." : "Continue"}
            />
          </form>
        </Form>
      </motion.div>
    </>
  );
}
