"use client";

import { api } from "@/trpc/react";
import { toast } from "sonner";

export function useUpdateWorkingHoursMutation() {
  const utils = api.useUtils();
  return api.preferences.updateWorkingHours.useMutation({
    onSuccess: () => {
      toast.success("Working hours updated!");
      void utils.preferences.get.invalidate();
    },
    onError: () => {
      toast.error("Failed to update working hours.");
    },
  });
}


