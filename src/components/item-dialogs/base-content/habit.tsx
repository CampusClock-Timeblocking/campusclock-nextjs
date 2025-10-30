import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Switch } from "../../ui/switch";
import { DialogContentLayout } from "./layout";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createHabitInputSchema,
  rawCreateHabitSchema,
  type CreateHabitInput,
  type FrontendCreateHabitInput,
} from "@/lib/zod";
import type {
  useCreateHabitMutation,
  useUpdateHabitMutation,
} from "@/hooks/mutations/habit";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useShiftEnter } from "@/hooks/kbd";

interface Props {
  hideDialog: () => void;
  autoFocusTitle?: boolean;
  initialValues?: CreateHabitInput;
  mutation:
    | ReturnType<typeof useCreateHabitMutation>
    | ReturnType<typeof useUpdateHabitMutation>;
  submitButtonText: string;
}

const DEFAULT_VALUES: FrontendCreateHabitInput = {
  title: "",
  description: "",
  durationMinutes: "",
  priority: 3,
  active: true,
  recurrenceType: "DAY",
  interval: 1,
  timesPerPeriod: 1,
  byWeekdays: undefined,
  preferredTime: undefined,
};

const WEEKDAY_LABELS = [
  { value: "0", label: "Sun" },
  { value: "1", label: "Mon" },
  { value: "2", label: "Tue" },
  { value: "3", label: "Wed" },
  { value: "4", label: "Thu" },
  { value: "5", label: "Fri" },
  { value: "6", label: "Sat" },
];

export const HabitDialogContent: React.FC<Props> = ({
  hideDialog,
  autoFocusTitle,
  initialValues,
  mutation,
  submitButtonText,
}) => {
  const form = useForm<FrontendCreateHabitInput>({
    resolver: zodResolver(rawCreateHabitSchema),
    defaultValues: initialValues ?? DEFAULT_VALUES,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    clearErrors,
  } = form;

  const title = watch("title");
  const recurrenceType = watch("recurrenceType");

  const handleFormSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: () => {
        hideDialog();
        form.reset();
      },
    });
  });

  useShiftEnter(handleFormSubmit);

  return (
    <DialogContentLayout
      title={title ?? ""}
      titlePlaceholderText="New habit..."
      setTitle={(newTitle) => {
        setValue("title", newTitle);
        if (newTitle.trim() && errors.title) {
          clearErrors("title");
        }
      }}
      initFocusTitle={autoFocusTitle}
      titleError={errors.title?.message}
      mainContent={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Lowest</SelectItem>
                      <SelectItem value="2">2 - Low</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - High</SelectItem>
                      <SelectItem value="5">5 - Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Controller
                control={control}
                name="durationMinutes"
                render={({ field }) => (
                  <Input
                    id="duration"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    placeholder="e.g., 30m, 2h, 2:30h"
                  />
                )}
              />
              {errors.durationMinutes && (
                <p className="text-sm text-red-500">
                  {errors.durationMinutes.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recurrenceType">Recurrence</Label>
              <Controller
                control={control}
                name="recurrenceType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value !== "WEEK") setValue("byWeekdays", undefined);
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger id="recurrenceType">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAY">Daily</SelectItem>
                      <SelectItem value="WEEK">Weekly</SelectItem>
                      <SelectItem value="MONTH">Monthly</SelectItem>
                      <SelectItem value="YEAR">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Every</Label>
              <Controller
                control={control}
                name="interval"
                render={({ field }) => (
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    max="365"
                    value={field.value ?? 1}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                    placeholder="1"
                  />
                )}
              />
              <p className="text-muted-foreground text-xs">
                {recurrenceType === "DAY"
                  ? "day(s)"
                  : recurrenceType === "WEEK"
                    ? "week(s)"
                    : recurrenceType === "MONTH"
                      ? "month(s)"
                      : "year(s)"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timesPerPeriod">Times per period</Label>
            <Controller
              control={control}
              name="timesPerPeriod"
              render={({ field }) => (
                <Input
                  id="timesPerPeriod"
                  type="number"
                  min="1"
                  max="100"
                  value={field.value ?? 1}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  placeholder="1"
                />
              )}
            />
            <p className="text-muted-foreground text-xs">
              How many times you want to complete this habit per period
            </p>
          </div>

          {recurrenceType === "WEEK" && (
            <div className="space-y-2">
              <Label>Weekdays</Label>
              <div className="flex gap-2">
                {WEEKDAY_LABELS.map((day) => {
                  const dayNumber = Number(day.value);
                  const byWeekdays = watch("byWeekdays");
                  const checked = byWeekdays?.includes(dayNumber) ?? false;
                  return (
                    <div key={day.value} className="w-10">
                      <label
                        htmlFor={`weekday-${day.value}`}
                        className={cn(
                          "hover:bg-accent hover:text-accent-foreground flex aspect-square items-center justify-center rounded-full border text-sm font-medium transition-colors hover:cursor-pointer",
                          checked &&
                            "border-primary bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
                        )}
                      >
                        {day.label[0]}
                      </label>
                      <Checkbox
                        id={`weekday-${day.value}`}
                        checked={checked}
                        onCheckedChange={(next) => {
                          const currentValues = watch("byWeekdays") ?? [];
                          setValue(
                            "byWeekdays",
                            next
                              ? [...currentValues, dayNumber]
                              : currentValues.filter((d) => d !== dayNumber),
                          );
                        }}
                        className="sr-only"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="preferredTime">Preferred Time</Label>
            <Controller
              control={control}
              name="preferredTime"
              render={({ field }) => (
                <Input
                  id="preferredTime"
                  type="time"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                />
              )}
            />
            <p className="text-muted-foreground text-xs">
              Suggested time to complete this habit
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Textarea
                  id="description"
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Add a description..."
                  rows={8}
                  className="resize-none"
                />
              )}
            />
          </div>
        </div>
      }
      sideContent={
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="active" className="text-base">
                Active
              </Label>
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Switch
                    id="active"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {watch("active")
                ? "This habit is active and will be tracked"
                : "This habit is paused and won't be tracked"}
            </p>
          </div>

          <div className="mt-auto flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                hideDialog();
                form.reset();
              }}
              disabled={mutation.isPending}
            >
              Cancel
              <Kbd>Esc</Kbd>
            </Button>
            <AsyncButton
              onClick={handleFormSubmit}
              isLoading={mutation.isPending}
            >
              {submitButtonText}{" "}
              <KbdGroup>
                <Kbd className="bg-primary-foreground/10 text-primary-foreground/80">
                  ⇧
                </Kbd>
                <Kbd className="bg-primary-foreground/10 text-primary-foreground/80">
                  ⏎
                </Kbd>
              </KbdGroup>
            </AsyncButton>
          </div>
        </>
      }
    />
  );
};
