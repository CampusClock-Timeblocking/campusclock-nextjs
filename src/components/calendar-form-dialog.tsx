"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RiCalendar2Line, RiPaletteLine, RiCheckLine } from "@remixicon/react";
import { useDialog } from "@/providers/dialog-provider";
import type { Calendar } from "@prisma/client";

const calendarFormSchema = z.object({
  name: z
    .string()
    .min(1, "Calendar name is required")
    .max(50, "Calendar name must be less than 50 characters"),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color"),
  foregroundColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color"),
});

type CalendarFormData = z.infer<typeof calendarFormSchema>;

const DEFAULT_COLORS = [
  { bg: "#3b82f6", fg: "#ffffff", name: "Blue" }, // Blue
  { bg: "#ef4444", fg: "#ffffff", name: "Red" }, // Red
  { bg: "#10b981", fg: "#ffffff", name: "Green" }, // Green
  { bg: "#f59e0b", fg: "#ffffff", name: "Amber" }, // Amber
  { bg: "#8b5cf6", fg: "#ffffff", name: "Purple" }, // Purple
  { bg: "#ec4899", fg: "#ffffff", name: "Pink" }, // Pink
  { bg: "#06b6d4", fg: "#ffffff", name: "Cyan" }, // Cyan
  { bg: "#84cc16", fg: "#ffffff", name: "Lime" }, // Lime
];

interface CalendarFormDialogContentProps {
  calendar?: Calendar | null;
  onSuccess?: () => void;
}

function CalendarFormDialogContent({
  calendar,
  onSuccess,
}: CalendarFormDialogContentProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const { hideDialog } = useDialog();

  const utils = api.useUtils();
  const isEditing = !!calendar;

  // Get the CampusClock calendar account
  const { data: calendarAccounts } = api.calendarAccount.getAll.useQuery();
  const campusClockAccount = calendarAccounts?.find(
    (account) => account.provider === "campusclock",
  );

  const { mutateAsync: createCalendar, isPending: isCreating } =
    api.calendar.create.useMutation({
      onSuccess: async () => {
        await utils.calendar.invalidate();
        await utils.calendarAccount.invalidate();
        onSuccess?.();
      },
    });

  const { mutateAsync: updateCalendar, isPending: isUpdating } =
    api.calendar.update.useMutation({
      onSuccess: async () => {
        await utils.calendar.invalidate();
        await utils.calendarAccount.invalidate();
        onSuccess?.();
      },
    });

  const form = useForm<CalendarFormData>({
    resolver: zodResolver(calendarFormSchema),
    defaultValues: {
      name: calendar?.name ?? "",
      backgroundColor: calendar?.backgroundColor ?? "#3b82f6",
      foregroundColor: calendar?.foregroundColor ?? "#ffffff",
    },
  });

  // Set initial color index
  useEffect(() => {
    if (calendar) {
      const matchingColorIndex = DEFAULT_COLORS.findIndex(
        (color) =>
          color.bg === calendar.backgroundColor &&
          color.fg === calendar.foregroundColor,
      );
      setSelectedColorIndex(matchingColorIndex >= 0 ? matchingColorIndex : 0);
    }
  }, [calendar]);

  const handleColorSelect = (colorIndex: number) => {
    const color = DEFAULT_COLORS[colorIndex];
    if (color) {
      setSelectedColorIndex(colorIndex);
      form.setValue("backgroundColor", color.bg);
      form.setValue("foregroundColor", color.fg);
    }
  };

  const onSubmit = async (data: CalendarFormData) => {
    try {
      if (isEditing && calendar) {
        const promise = updateCalendar({
          id: calendar.id,
          name: data.name,
          backgroundColor: data.backgroundColor,
          foregroundColor: data.foregroundColor,
        });

        toast.promise(promise, {
          loading: "Updating calendar...",
          success: "Calendar updated successfully!",
          error: "Failed to update calendar",
        });

        await promise;
      } else {
        if (!campusClockAccount) {
          toast.error("CampusClock account not found. Please try again.");
          return;
        }

        const promise = createCalendar({
          name: data.name,
          backgroundColor: data.backgroundColor,
          foregroundColor: data.foregroundColor,
          calendarAccountId: campusClockAccount.id,
        });

        toast.promise(promise, {
          loading: "Creating calendar...",
          success: "Calendar created successfully!",
          error: "Failed to create calendar",
        });

        await promise;
      }
      hideDialog();
    } catch (error) {
      // Error is handled by toast.promise
      console.error("Calendar operation failed:", error);
    }
  };

  const backgroundColor = form.watch("backgroundColor");
  const foregroundColor = form.watch("foregroundColor");
  const calendarName = form.watch("name");

  const isPending = isCreating || isUpdating;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          <RiCalendar2Line className="h-5 w-5" />
          {isEditing ? "Edit Calendar" : "Create New Calendar"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Update your calendar name and color."
            : "Create a new calendar to organize your events and tasks."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FieldSet>
          <FieldGroup>
            {/* Calendar Name */}
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="name">Calendar Name</FieldLabel>
              <Input
                id="name"
                placeholder="e.g., Work, Personal, Study"
                {...form.register("name")}
                disabled={isPending}
                aria-invalid={!!form.formState.errors.name}
                className="text-base"
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            {/* Color Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RiPaletteLine className="text-muted-foreground h-4 w-4" />
                <FieldLabel className="mb-0">Calendar Color</FieldLabel>
              </div>

              {/* Color Presets - Enhanced Grid */}
              <div className="grid grid-cols-4 gap-3">
                {DEFAULT_COLORS.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleColorSelect(index)}
                    className={`group relative h-14 w-full rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      selectedColorIndex === index
                        ? "ring-primary border-primary ring-2 ring-offset-2"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    style={{ backgroundColor: color.bg }}
                    disabled={isPending}
                    title={color.name}
                  >
                    {/* Checkmark for selected color */}
                    {selectedColorIndex === index && (
                      <div className="bg-background absolute top-1 right-1 rounded-full p-0.5 shadow-sm">
                        <RiCheckLine
                          className="h-3.5 w-3.5"
                          style={{ color: color.bg }}
                        />
                      </div>
                    )}

                    {/* Text color preview stripe */}
                    <div
                      className="absolute bottom-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full opacity-80"
                      style={{ backgroundColor: color.fg }}
                    />
                  </button>
                ))}
              </div>

              {/* Custom Color Inputs */}
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground mb-3 text-sm font-medium">
                  Custom Colors
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Field data-invalid={!!form.formState.errors.backgroundColor}>
                    <FieldLabel htmlFor="backgroundColor" className="text-sm">
                      Background
                    </FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="backgroundColor"
                        {...form.register("backgroundColor")}
                        disabled={isPending}
                        placeholder="#3b82f6"
                        className="font-mono text-sm"
                        aria-invalid={!!form.formState.errors.backgroundColor}
                      />
                      <div
                        className="h-10 w-12 shrink-0 rounded-md border-2"
                        style={{ backgroundColor }}
                      />
                    </div>
                    <FieldError>
                      {form.formState.errors.backgroundColor?.message}
                    </FieldError>
                  </Field>

                  <Field data-invalid={!!form.formState.errors.foregroundColor}>
                    <FieldLabel htmlFor="foregroundColor" className="text-sm">
                      Text
                    </FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="foregroundColor"
                        {...form.register("foregroundColor")}
                        disabled={isPending}
                        placeholder="#ffffff"
                        className="font-mono text-sm"
                        aria-invalid={!!form.formState.errors.foregroundColor}
                      />
                      <div
                        className="h-10 w-12 shrink-0 rounded-md border-2"
                        style={{ backgroundColor: foregroundColor }}
                      />
                    </div>
                    <FieldError>
                      {form.formState.errors.foregroundColor?.message}
                    </FieldError>
                  </Field>
                </div>
              </div>
            </div>

            {/* Enhanced Preview */}
            <div className="space-y-2">
              <FieldLabel className="text-sm">Preview</FieldLabel>
              <div className="bg-muted/30 rounded-lg border p-4">
                <div
                  className="rounded-lg px-4 py-3 text-center font-medium shadow-sm transition-all"
                  style={{
                    backgroundColor,
                    color: foregroundColor,
                  }}
                >
                  <RiCalendar2Line
                    className="mb-1 inline-block"
                    style={{ color: foregroundColor }}
                  />
                  <div className="text-sm">
                    {calendarName || "Calendar Name"}
                  </div>
                </div>
              </div>
            </div>
          </FieldGroup>
        </FieldSet>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={hideDialog}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {isEditing ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{isEditing ? "Update Calendar" : "Create Calendar"}</>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// Wrapper components for use with showDialog
export function CreateCalendarDialog() {
  return <CalendarFormDialogContent />;
}

interface EditCalendarDialogProps {
  calendar: Calendar;
}

export function EditCalendarDialog({ calendar }: EditCalendarDialogProps) {
  return <CalendarFormDialogContent calendar={calendar} />;
}
