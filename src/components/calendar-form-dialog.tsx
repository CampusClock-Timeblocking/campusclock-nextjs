"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RiCalendar2Line, RiPaletteLine } from "@remixicon/react";

// Calendar type from your database
type Calendar = {
  id: string;
  name: string;
  backgroundColor: string;
  foregroundColor: string;
};

const calendarFormSchema = z.object({
  name: z
    .string()
    .min(1, "Calendar name is required")
    .max(50, "Calendar name must be less than 50 characters"),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color"),
  foregroundColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Please enter a valid hex color"),
});

type CalendarFormData = z.infer<typeof calendarFormSchema>;

const DEFAULT_COLORS = [
  { bg: "#3b82f6", fg: "#ffffff" }, // Blue
  { bg: "#ef4444", fg: "#ffffff" }, // Red
  { bg: "#10b981", fg: "#ffffff" }, // Green
  { bg: "#f59e0b", fg: "#000000" }, // Yellow
  { bg: "#8b5cf6", fg: "#ffffff" }, // Purple
  { bg: "#ec4899", fg: "#ffffff" }, // Pink
  { bg: "#06b6d4", fg: "#ffffff" }, // Cyan
  { bg: "#84cc16", fg: "#000000" }, // Lime
];

interface CalendarFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar?: Calendar | null;
  onSuccess?: () => void;
}

export function CalendarFormDialog({
  open,
  onOpenChange,
  calendar,
  onSuccess,
}: CalendarFormDialogProps) {
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(
    null,
  );
  
  const utils = api.useUtils();
  const isEditing = !!calendar;

  const { mutateAsync: createCalendar, isPending: isCreating } =
    api.calendar.create.useMutation({
      onSuccess: async () => {
        await utils.calendar.invalidate();
        onSuccess?.();
      },
    });

  const { mutateAsync: updateCalendar, isPending: isUpdating } =
    api.calendar.update.useMutation({
      onSuccess: async () => {
        await utils.calendar.invalidate();
        onSuccess?.();
      },
    });

  const form = useForm<CalendarFormData>({
    resolver: zodResolver(calendarFormSchema),
    defaultValues: {
      name: calendar?.name ?? "",
      description: "",
      backgroundColor: calendar?.backgroundColor ?? "#3b82f6",
      foregroundColor: calendar?.foregroundColor ?? "#ffffff",
    },
  });

  // Reset form when calendar changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (calendar) {
        form.reset({
          name: calendar.name,
          description: "",
          backgroundColor: calendar.backgroundColor,
          foregroundColor: calendar.foregroundColor,
        });
        // Find matching color preset
        const matchingColorIndex = DEFAULT_COLORS.findIndex(
          (color) =>
            color.bg === calendar.backgroundColor &&
            color.fg === calendar.foregroundColor,
        );
        setSelectedColorIndex(matchingColorIndex >= 0 ? matchingColorIndex : null);
      } else {
        form.reset({
          name: "",
          description: "",
          backgroundColor: "#3b82f6",
          foregroundColor: "#ffffff",
        });
        setSelectedColorIndex(0);
      }
    }
  }, [open, calendar, form]);

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
        const promise = createCalendar({
          name: data.name,
          backgroundColor: data.backgroundColor,
          foregroundColor: data.foregroundColor,
        });
        
        toast.promise(promise, {
          loading: "Creating calendar...",
          success: "Calendar created successfully!",
          error: "Failed to create calendar",
        });
        
        await promise;
      }
      onOpenChange(false);
    } catch (error) {
      // Error is handled by toast.promise
      console.error("Calendar operation failed:", error);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedColorIndex(null);
    onOpenChange(false);
  };

  const backgroundColor = form.watch("backgroundColor");
  const foregroundColor = form.watch("foregroundColor");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiCalendar2Line className="h-5 w-5" />
            {isEditing ? "Edit Calendar" : "Create New Calendar"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your calendar details and colors."
              : "Create a new calendar to organize your events."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Calendar Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Calendar"
                      {...field}
                      disabled={isCreating || isUpdating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description (optional) */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{" "}
                    <span className="text-muted-foreground text-sm">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Calendar description..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={isCreating || isUpdating}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <RiPaletteLine className="h-4 w-4" />
                <FormLabel>Calendar Color</FormLabel>
              </div>

              {/* Color Presets */}
              <div className="grid grid-cols-4 gap-3">
                {DEFAULT_COLORS.map((color, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleColorSelect(index)}
                    className={`h-12 w-full rounded-lg border-2 transition-all hover:scale-105 ${
                      selectedColorIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                    style={{ backgroundColor: color.bg }}
                    disabled={isCreating || isUpdating}
                  >
                    <div
                      className="mx-auto h-2 w-8 rounded-full"
                      style={{ backgroundColor: color.fg }}
                    />
                  </button>
                ))}
              </div>

              {/* Custom Color Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="backgroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Background</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            {...field}
                            disabled={isCreating || isUpdating}
                            placeholder="#3b82f6"
                          />
                          <div
                            className="h-10 w-12 shrink-0 rounded border"
                            style={{ backgroundColor: field.value }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="foregroundColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Text</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            {...field}
                            disabled={isCreating || isUpdating}
                            placeholder="#ffffff"
                          />
                          <div
                            className="h-10 w-12 shrink-0 rounded border"
                            style={{ backgroundColor: field.value }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Color Preview */}
              <div className="rounded-lg border p-4">
                <div
                  className="rounded px-3 py-2 text-center text-sm font-medium"
                  style={{
                    backgroundColor,
                    color: foregroundColor,
                  }}
                >
                  Preview: {form.watch("name") || "Calendar Name"}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="gap-2"
              >
                {isCreating || isUpdating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <RiCalendar2Line className="h-4 w-4" />
                    {isEditing ? "Update Calendar" : "Create Calendar"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}