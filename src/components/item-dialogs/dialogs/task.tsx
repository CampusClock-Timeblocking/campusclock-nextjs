"use client";

import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "@/hooks/mutations/task";
import type { Task } from "@prisma/client";
import { TaskDialogContent } from "../base-content/task";
import { useDialog } from "../../../providers/dialog-provider";
import { formatDuration } from "@/lib/utils";

export function CreateTaskDialog() {
  const { hideDialog } = useDialog();
  const createTaskMutation = useCreateTaskMutation();

  return (
    <TaskDialogContent
      hideDialog={hideDialog}
      submitButtonText="Create"
      mutation={createTaskMutation}
      autoFocusTitle
    />
  );
}

interface EditProps {
  task: Task;
}

export function UpdateTaskDialog({ task }: EditProps) {
  const { hideDialog } = useDialog();
  const editTaskMutation = useUpdateTaskMutation({ taskId: task.id });

  const initialValues = {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority ?? 3,
    durationMinutes: task.durationMinutes
      ? formatDuration(task.durationMinutes)
      : "30m",
    complexity: task.complexity ?? 5,
    due: task.due ?? undefined,
    projectId: task.projectId ?? undefined,
    status: task.status,
    scheduledTime: task.scheduledTime ?? undefined,
    habitId: task.habitId ?? undefined,
  };

  return (
    <TaskDialogContent
      hideDialog={hideDialog}
      mutation={editTaskMutation}
      submitButtonText="Update task"
      initialValues={initialValues}
    />
  );
}
