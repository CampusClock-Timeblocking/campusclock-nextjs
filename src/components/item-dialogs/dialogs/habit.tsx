"use client";
import {
  useCreateHabitMutation,
  useUpdateHabitMutation,
} from "@/hooks/mutations/habit";
import type { Habit } from "@prisma/client";
import { HabitDialogContent } from "../base-content/habit";
import { useDialog } from "../../../providers/dialog-provider";
import { formatDuration } from "@/lib/utils";

export function CreateHabitDialog() {
  const { hideDialog } = useDialog();
  const createHabitMutation = useCreateHabitMutation();

  return (
    <HabitDialogContent
      hideDialog={hideDialog}
      submitButtonText="Create"
      mutation={createHabitMutation}
      autoFocusTitle
    />
  );
}

interface EditProps {
  habit: Habit;
}

export function UpdateHabitDialog({ habit }: EditProps) {
  const { hideDialog } = useDialog();
  const editHabitMutation = useUpdateHabitMutation({ habitId: habit.id });

  const initialValues = {
    title: habit.title,
    description: habit.description ?? undefined,
    durationMinutes: habit.durationMinutes
      ? formatDuration(habit.durationMinutes)
      : "30m",
    priority: habit.priority ?? 3,
    active: habit.active,
    recurrenceType: habit.recurrenceType,
    interval: habit.interval,
    timesPerPeriod: habit.timesPerPeriod,
    byWeekdays: habit.byWeekdays,
    preferredTime: habit.preferredTime
      ? new Date(habit.preferredTime).toISOString().slice(11, 16)
      : undefined,
    customRule:
      habit.customRule && typeof habit.customRule === "object"
        ? (habit.customRule as Record<string, unknown>)
        : undefined,
  };

  return (
    <HabitDialogContent
      hideDialog={hideDialog}
      mutation={editHabitMutation}
      submitButtonText="Update"
      initialValues={initialValues}
    />
  );
}
