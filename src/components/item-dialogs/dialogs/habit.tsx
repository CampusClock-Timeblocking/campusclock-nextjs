"use client";
import {
  useCreateHabitMutation,
  useUpdateHabitMutation,
} from "@/hooks/mutations/habit";
import type { Habit } from "@prisma/client";
import { HabitDialogContent } from "../base-content/habit";
import { useDialog } from "../../../providers/dialog-provider";

export function CreateHabitDialog() {
  const { hideDialog } = useDialog();
  const createHabitMutation = useCreateHabitMutation();

  return (
    <HabitDialogContent
      hideDialog={hideDialog}
      submitButtonText="Create habit"
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
    durationMinutes: habit.durationMinutes ?? undefined,
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
        ? (habit.customRule as Record<string, any>)
        : undefined,
  };

  return (
    <HabitDialogContent
      hideDialog={hideDialog}
      mutation={editHabitMutation}
      submitButtonText="Update habit"
      initialValues={initialValues}
    />
  );
}
