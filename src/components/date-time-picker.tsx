"use client";
import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface DateTimeValue {
  date?: Date;
  time?: string;
}

interface DateTimePickerProps {
  value?: Date | null;
  onChange?: (value: Date | undefined | null) => void;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  dateLabel?: string;
  timeLabel?: string;
}

export const DateTimePicker = React.forwardRef<
  HTMLButtonElement,
  DateTimePickerProps
>(
  (
    {
      value,
      onChange,
      error,
      disabled,
      required,
      dateLabel = "Due date",
      timeLabel = "Time",
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [showTimeInput, setShowTimeInput] = React.useState(false);
    const [shouldFocusTime, setShouldFocusTime] = React.useState(false);
    const timeInputRef = React.useRef<HTMLInputElement>(null);

    // Check if the date has a time component (not midnight or has non-zero time)
    const hasTime =
      value && (value.getHours() !== 0 || value.getMinutes() !== 0);
    const shouldShowTime = showTimeInput || hasTime;

    // Get time string from date
    const timeString = value
      ? `${String(value.getHours()).padStart(2, "0")}:${String(
          value.getMinutes(),
        ).padStart(2, "0")}`
      : "";

    React.useEffect(() => {
      if (showTimeInput && shouldFocusTime && timeInputRef.current) {
        timeInputRef.current.focus();
        setShouldFocusTime(false);
      }
    }, [showTimeInput, shouldFocusTime]);

    const handleAddTime = () => {
      setShowTimeInput(true);
      setShouldFocusTime(true);
    };

    const handleClearDate = () => {
      handleRemoveTime();
      onChange?.(null);
    };

    const handleDateChange = (newDate: Date | undefined) => {
      setOpen(false);
      if (!newDate) {
        onChange?.(null);
        return;
      }

      // If we have an existing value with time, preserve it
      if (value && hasTime) {
        const combined = new Date(newDate);
        combined.setHours(value.getHours());
        combined.setMinutes(value.getMinutes());
        combined.setSeconds(0);
        combined.setMilliseconds(0);
        onChange?.(combined);
      } else {
        // Set to midnight
        const combined = new Date(newDate);
        combined.setHours(0, 0, 0, 0);
        onChange?.(combined);
      }
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const timeValue = e.target.value;
      if (!timeValue) return;

      const [hours, minutes] = timeValue.split(":").map(Number);

      // Create new date with the time
      const newDate = value ? new Date(value) : new Date();
      newDate.setHours(hours ?? 0);
      newDate.setMinutes(minutes ?? 0);
      newDate.setSeconds(0);
      newDate.setMilliseconds(0);

      onChange?.(newDate);
    };

    const handleRemoveTime = () => {
      setShowTimeInput(false);
      if (value) {
        const newDate = new Date(value);
        newDate.setHours(0, 0, 0, 0);
        onChange?.(newDate);
      }
    };

    return (
      <div className="flex w-full flex-wrap gap-4">
        <div className="flex min-w-[200px] flex-1 flex-col gap-3">
          <Label htmlFor="date-picker" className="px-1">
            {dateLabel}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={ref}
                  variant="outline"
                  id="date-picker"
                  disabled={disabled}
                  className={cn(
                    "flex-1 font-normal",
                    value ? "justify-start" : "border-dashed",
                    error &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                >
                  {value ? (
                    format(value, "PPP")
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {dateLabel}
                    </>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="center"
              >
                <Calendar
                  mode="single"
                  selected={value ?? undefined}
                  captionLayout="dropdown"
                  fromYear={new Date().getFullYear()}
                  toYear={2050}
                  onSelect={handleDateChange}
                  disabled={disabled}
                />
              </PopoverContent>
            </Popover>
            {value && (
              <Button
                variant="outline"
                onClick={handleClearDate}
                className="size-9 !px-2"
              >
                <X />
              </Button>
            )}
          </div>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-3">
          <Label htmlFor="time-picker" className="px-1">
            {timeLabel}
          </Label>
          {!shouldShowTime ? (
            <Button
              variant="outline"
              onClick={handleAddTime}
              disabled={disabled}
              className="w-full border-dashed"
            >
              <Plus className="h-4 w-4" />
              {timeLabel}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                ref={timeInputRef}
                type="time"
                id="time-picker"
                value={timeString}
                onChange={handleTimeChange}
                disabled={disabled}
                className={cn(
                  "bg-background flex-1 appearance-none pr-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
                  error && "border-destructive focus-visible:ring-destructive",
                )}
              />
              <Button
                variant="outline"
                onClick={handleRemoveTime}
                className="size-9 !px-2"
              >
                <X />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  },
);

DateTimePicker.displayName = "DateTimePicker";
