import { api } from "@/trpc/react";
import { toast } from "sonner";

/**
 * Hook to infer task fields using AI
 */
export function useInferTaskFields() {
  const inferFieldsMutation = api.task.inferFields.useMutation({
    onError: (error) => {
      toast.error("Failed to infer task fields", {
        description: error.message,
      });
    },
  });

  const inferFields = async (input: {
    title: string;
    description?: string | null;
    projectId?: string | null;
  }) => {
    try {
      const result = await inferFieldsMutation.mutateAsync(input);
      return result;
    } catch (error) {
      console.error("Error inferring fields:", error);
      return null;
    }
  };

  return {
    inferFields,
    isLoading: inferFieldsMutation.isPending,
    error: inferFieldsMutation.error,
  };
}

/**
 * Hook to infer missing fields for an existing task
 */
export function useInferMissingTaskFields() {
  const inferMissingMutation = api.task.inferMissingFields.useMutation({
    onSuccess: (data) => {
      if (data.updated) {
        toast.success("Task fields inferred successfully", {
          description: "AI has filled in the missing fields",
        });
      } else {
        toast.info("All fields already present");
      }
    },
    onError: (error) => {
      toast.error("Failed to infer missing fields", {
        description: error.message,
      });
    },
  });

  const inferMissingFields = async (taskId: string) => {
    try {
      const result = await inferMissingMutation.mutateAsync({ id: taskId });
      return result;
    } catch (error) {
      console.error("Error inferring missing fields:", error);
      return null;
    }
  };

  return {
    inferMissingFields,
    isLoading: inferMissingMutation.isPending,
    error: inferMissingMutation.error,
  };
}
