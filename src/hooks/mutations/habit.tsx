"use client";
import type { UpdateHabitInput } from "@/lib/zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function useUpdateHabitMutation({ habitId }: { habitId: string }) {
  const utils = api.useUtils();
  const mutation = api.habit.update.useMutation({
    onSuccess: () => {
      toast.success("Habit updated!");
      void utils.habit.getAll.invalidate();
      void utils.habit.getById.invalidate({ id: habitId });
    },
    onError: () => {
      toast.error("Error when updating habit!");
    },
  });

  return {
    ...mutation,
    mutate: (
      update: UpdateHabitInput,
      options?: Parameters<typeof mutation.mutate>[1],
    ) => mutation.mutate({ id: habitId, data: update }, options),
    mutateAsync: (
      update: UpdateHabitInput,
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => mutation.mutateAsync({ id: habitId, data: update }, options),
  };
}

export function useCreateHabitMutation() {
  const utils = api.useUtils();
  return api.habit.create.useMutation({
    onSuccess: () => {
      toast.success("Habit created!");
      void utils.habit.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when creating habit!");
    },
  });
}

export function useDeleteManyHabits() {
  const utils = api.useUtils();
  return api.habit.deleteMany.useMutation({
    onSuccess: () => {
      toast.success("Deleted!");
      void utils.habit.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when deleting!");
    },
  });
}

export function useUpdateManyHabitsMutations() {
  const utils = api.useUtils();
  return api.habit.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Updated!");
      void utils.habit.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when updating!");
    },
  });
}
