"use client";

import type { UpdateProjectInput } from "@/lib/zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export function useUpdateProjectMutation({ projectId }: { projectId: string }) {
  const utils = api.useUtils();
  const mutation = api.project.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated!");
      void utils.project.getAll.invalidate();
      // void utils.project.getById.invalidate({ id: projectId });
    },
    onError: () => {
      toast.error("Error when updating project!");
    },
  });

  return {
    ...mutation,
    mutate: (
      update: UpdateProjectInput,
      options?: Parameters<typeof mutation.mutate>[1],
    ) => mutation.mutate({ id: projectId, data: update }, options),
    mutateAsync: (
      update: UpdateProjectInput,
      options?: Parameters<typeof mutation.mutateAsync>[1],
    ) => mutation.mutateAsync({ id: projectId, data: update }, options),
  };
}

export function useCreateProjectMutation() {
  const utils = api.useUtils();
  return api.project.create.useMutation({
    onSuccess: () => {
      toast.success("Project created!");
      void utils.project.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when creating project!");
    },
  });
}

export function useDelteManyProjectMutation() {
  const utils = api.useUtils();
  return api.project.bulkDelete.useMutation({
    onSuccess: () => {
      toast.success("Deleted!");
      void utils.project.getAll.invalidate();
    },
    onError: () => {
      toast.error("Error when deleting!");
    },
  });
}

export function useUpdateManyProjectsMutation() {
  const utils = api.useUtils();

  return api.project.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Updated!");
      void utils.project.getAll.invalidate();
      // void utils.project.getById.invalidate({ id: projectId });
    },
    onError: () => {
      toast.error("Error when updating!");
    },
  });
}
