"use client";

import type { UpdateTaskInput } from "@/lib/zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function useUpdateTaskMutation({ taskId }: { taskId: string }) {
  const utils = api.useUtils();
  const mutation = api.task.update.useMutation({
    onSuccess: () => {
      toast.success("Task updated!");
      void utils.task.getAll.invalidate();
      void utils.task.getById.invalidate({ id: taskId });
    },
    onError: () => {
      toast.error("Error when updating task!");
    },
  });

  return {
    ...mutation,
    mutate: (
      update: UpdateTaskInput,
      options?: Parameters<typeof mutation.mutate>[1],
    ) => mutation.mutate({ id: taskId, data: update }, options),
    mutateAsync: (
      update: UpdateTaskInput,
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => mutation.mutateAsync({ id: taskId, data: update }, options),
  };
}

export function useCreateTaskMutation() {
  const utils = api.useUtils();
  return api.task.create.useMutation({
    onSuccess: () => {
      toast.success("Task created!");
      void utils.task.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when creating task!");
    },
  });
}

export function useDeleteManyTasks() {
  const utils = api.useUtils();
  return api.task.bulkDelete.useMutation({
    onSuccess: () => {
      toast.success("Deleted!");
      void utils.task.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when deleting!");
    },
  });
}

export function useUpdateManyTasksMutation() {
  const utils = api.useUtils();
  return api.task.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Updated!");
      void utils.task.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when updating!");
    },
  });
}
