"use client";

import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  FieldSet,
  Field,
  FieldLegend,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Hourglass, Loader2 } from "lucide-react";
import { WorkingHoursSchema, type WorkingHours, weekdays } from "@/lib/zod";
import { cn } from "@/lib/utils";
import type { WorkingPreferences } from "@prisma/client";

interface WorkingHoursCardProps {
  preferences: WorkingPreferences | null | undefined;
  isLoading: boolean;
  onSave: (values: WorkingHours) => Promise<unknown>;
  isSaving: boolean;
}

/** Format a Prisma `@db.Time()` Date back to "HH:MM". */
function dateToTimeString(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const h = date.getUTCHours().toString().padStart(2, "0");
  const m = date.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function WorkingHoursCard({
  preferences,
  isLoading,
  onSave,
  isSaving,
}: WorkingHoursCardProps) {
  const form = useForm<WorkingHours>({
    resolver: zodResolver(WorkingHoursSchema),
    defaultValues: {
      earliestTime: "09:00",
      latestTime: "17:00",
      workingDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
    },
  });

  const { isDirty } = form.formState;

  // Sync form when server data arrives
  useEffect(() => {
    if (preferences) {
      form.reset({
        earliestTime: dateToTimeString(preferences.earliestTime),
        latestTime: dateToTimeString(preferences.latestTime),
        workingDays: preferences.workingDays,
      });
    }
  }, [preferences, form]);

  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="border-border shrink-0 rounded-sm border"
            style={{ padding: 6 }}
          >
            <Hourglass size={30} />
          </div>
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-semibold">Working Hours</h3>
            <p className="text-muted-foreground text-sm">
              Set when you&apos;re available for focus blocks
            </p>
          </div>
        </div>
        {isDirty && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isSaving}
              onClick={form.handleSubmit((v) => onSave(v))}
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        )}
      </div>
      <Separator />

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : (
        <Form {...form}>
          <form className="space-y-6">
            <WorkingTimeRange form={form} stepSize={15} />
            <WorkingDaysSelector form={form} />
          </form>
        </Form>
      )}
    </div>
  );
}

export function WorkingTimeRange({
  form,
  stepSize = 15,
  className,
}: {
  form: UseFormReturn<WorkingHours>;
  stepSize?: number;
  className?: string;
}) {
  const timeToSliderValue = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const sliderValueToTime = (value: number) => {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };

  const handleRangeChange = (range: number[]) => {
    const [start, end] = range;
    if (start === undefined || end === undefined) return;
    if (end - start < 60) return; // min 60 minutes apart
    form.setValue("earliestTime", sliderValueToTime(start), {
      shouldDirty: true,
    });
    form.setValue("latestTime", sliderValueToTime(end), { shouldDirty: true });
  };

  return (
    <FieldSet className={cn("grid grid-cols-2 gap-3 text-sm", className)}>
      <FieldLegend>Focus window</FieldLegend>
      <FormField
        control={form.control}
        name="earliestTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Start</FormLabel>
            <FormControl>
              <Input type="time" step={stepSize * 60} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="latestTime"
        render={({ field }) => (
          <FormItem>
            <FormLabel>End</FormLabel>
            <FormControl>
              <Input type="time" step={stepSize * 60} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Slider
        value={[
          timeToSliderValue(form.watch("earliestTime")),
          timeToSliderValue(form.watch("latestTime")),
        ]}
        min={0}
        max={24 * 60 - 1}
        step={stepSize}
        onValueChange={handleRangeChange}
        className="col-span-2 mt-2"
      />
    </FieldSet>
  );
}

export function WorkingDaysSelector({
  form,
  idPrefix = "settings",
}: {
  form: UseFormReturn<WorkingHours>;
  idPrefix?: string;
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Work days</FieldLegend>
      <FieldDescription>
        Choose the days you want to schedule focus blocks.
      </FieldDescription>
      <FieldGroup className="flex flex-row gap-3">
        {weekdays.map((day) => {
          const checked = form.watch("workingDays").includes(day);
          return (
            <Field key={day} className="w-10">
              <FieldLabel
                htmlFor={`${idPrefix}-working-days-${day}`}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground aspect-square justify-center rounded-full border text-sm font-medium transition-colors hover:cursor-pointer",
                  checked &&
                    "border-primary bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
                )}
              >
                {day[0]}
              </FieldLabel>
              <Checkbox
                id={`${idPrefix}-working-days-${day}`}
                checked={checked}
                onCheckedChange={(next) => {
                  form.setValue(
                    "workingDays",
                    next.valueOf()
                      ? [...form.watch("workingDays"), day]
                      : form.watch("workingDays").filter((d) => d !== day),
                    { shouldDirty: true },
                  );
                }}
                className="sr-only"
              />
            </Field>
          );
        })}
      </FieldGroup>
    </FieldSet>
  );
}
