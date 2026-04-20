"use client";

import { api } from "@/trpc/react";
import { toast } from "sonner";

export function useSubmitFeedbackMutation() {
  const utils = api.useUtils();
  return api.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("Feedback submitted!");
      void utils.task.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error submitting feedback!");
    },
  });
}
