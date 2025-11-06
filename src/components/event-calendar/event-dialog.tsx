"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RiCalendarLine,
  RiDeleteBinLine,
  RiMapPinLine,
  RiFileTextLine,
} from "@remixicon/react";
import {
  CircleCheck,
  CircleDashed,
  CircleOff,
  Loader,
  Pause,
  RedoDot,
  SkipForward,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";

import type { CalendarEvent } from "@/components/event-calendar/event-calendar";
import type { EventColor } from "@/components/event-calendar/types";
import { useCalendarContext } from "@/components/event-calendar/calendar-context";
import { cn } from "@/lib/utils";
import { CreateEventFormSchema, type CreateEventFormInput } from "@/lib/zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StartHour, EndHour } from "@/components/event-calendar/constants";
import { api } from "@/trpc/react";
import { useUpdateTaskMutation } from "@/hooks/mutations/task";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TaskStatus } from "@prisma/client";
import {
  getStatusBade,
  getStatusIcon,
} from "../datatable/columns/task-columns";

interface EventDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

export function EventDialog({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EventDialogProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  // Preserve event state during closing animation
  const [displayEvent, setDisplayEvent] = useState<CalendarEvent | null>(event);
  // Track visibility of optional fields
  const [showDescription, setShowDescription] = useState(false);
  const [showLocation, setShowLocation] = useState(false);

  // Get calendars from context to check if event is from external calendar
  const { calendars } = useCalendarContext();

  // Fetch task data if event is linked to a task
  const { data: taskData, isLoading: isLoadingTask } =
    api.task.getById.useQuery(
      { id: displayEvent?.taskId ?? "" },
      { enabled: !!displayEvent?.taskId },
    );

  // Update task mutation
  const updateTaskMutation = useUpdateTaskMutation({
    taskId: displayEvent?.taskId ?? "",
  });

  // Find the calendar for this event
  const eventCalendar = calendars?.find(
    (cal) => cal.id === displayEvent?.calendarId,
  );

  // Check if this event is from an external/read-only calendar
  const isExternalCalendar =
    eventCalendar?.type === "EXTERNAL" || eventCalendar?.readOnly === true;

  const form = useForm<CreateEventFormInput>({
    resolver: zodResolver(CreateEventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      start: new Date(),
      end: new Date(),
      allDay: false,
      location: "",
      color: "blue",
      calendarId: "",
    },
  });

  const allDay = form.watch("allDay");
  const startDate = form.watch("start");

  // Helper functions to format and update time
  const formatTimeFromDate = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = Math.floor(date.getMinutes() / 15) * 15;
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const updateDateTime = (date: Date, timeString: string) => {
    const [hours = 0, minutes = 0] = timeString.split(":").map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const isTask = event?.taskId !== undefined && event?.taskId !== null;

  // Handle task status update
  const handleTaskStatusUpdate = async (newStatus: TaskStatus) => {
    if (!updateTaskMutation || !taskData) return;

    try {
      await updateTaskMutation.mutateAsync({ status: newStatus });
      toast.success(`Task status updated`);
    } catch (error) {
      toast.error("Failed to update task status");
    }
  };

  // Update display event and edit mode when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Capture the event state when dialog opens to prevent changes during close animation
      setDisplayEvent(event);
      // New events start in edit mode, existing events start in view mode
      setIsEditMode(!event?.id);
      // Show optional fields if they have values
      setShowDescription(!!event?.description);
      setShowLocation(!!event?.location);
    }
  }, [isOpen, event]);

  useEffect(() => {
    if (event) {
      const start = new Date(event.start);
      const end = new Date(event.end);

      // For new events (no ID), auto-select first local calendar if not already set
      const firstLocalCalendar = calendars?.find((cal) => cal.type === "LOCAL");
      const calendarId = event.calendarId
        ? event.calendarId
        : !event.id
          ? (firstLocalCalendar?.id ?? "")
          : "";

      form.reset({
        title: event.title ?? "",
        description: event.description ?? "",
        start,
        end,
        allDay: event.allDay ?? false,
        location: event.location ?? "",
        color: (event.color as EventColor | undefined) ?? "blue",
        calendarId,
      });
    } else {
      // For null event state, default to first local calendar if available
      const firstLocalCalendar = calendars?.find((cal) => cal.type === "LOCAL");
      form.reset({
        title: "",
        description: "",
        start: new Date(),
        end: new Date(),
        allDay: false,
        location: "",
        color: "blue",
        calendarId: firstLocalCalendar?.id ?? "",
      });
    }
  }, [event, form, calendars]);

  // Memoize time options so they're only calculated once
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = StartHour; hour <= EndHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedHour = hour.toString().padStart(2, "0");
        const formattedMinute = minute.toString().padStart(2, "0");
        const value = `${formattedHour}:${formattedMinute}`;
        // Use a fixed date to avoid unnecessary date object creations
        const date = new Date(2000, 0, 1, hour, minute);
        const label = format(date, "h:mm a");
        options.push({ value, label });
      }
    }
    return options;
  }, []); // Empty dependency array ensures this only runs once

  const onSubmit = (data: CreateEventFormInput) => {
    // Use generic title if empty
    const eventTitle = data.title?.trim() ? data.title : "(no title)";

    onSave({
      id: event?.id ?? "",
      title: eventTitle,
      description: data.description ?? null,
      start: data.start,
      end: data.end,
      allDay: data.allDay ?? false,
      location: data.location ?? null,
      color: data.color ?? "blue",
      calendarId: data.calendarId, // Use selected calendarId from form
      taskId: event?.taskId ?? null,
    });
  };

  const handleDelete = () => {
    if (event?.id) {
      onDelete(event.id);
    }
  };

  // View Mode Summary
  const renderViewMode = () => {
    if (!displayEvent) return null;

    const start = new Date(displayEvent.start);
    const end = new Date(displayEvent.end);
    const formattedDate = displayEvent.allDay
      ? format(start, "PPP")
      : `${format(start, "PPP")} at ${format(start, "p")}`;
    const formattedEndDate = displayEvent.allDay
      ? format(end, "PPP")
      : format(end, "p");

    return (
      <>
        {/* Task Status Banner */}
        {isTask && taskData && (
          <div className="mb-4">
            <div className="bg-muted/50 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs font-medium">
                  Task Status:
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    disabled={
                      isExternalCalendar || updateTaskMutation?.isPending
                    }
                  >
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent"
                      disabled={
                        isExternalCalendar || updateTaskMutation?.isPending
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        {getStatusBade(taskData.status)}
                        <ChevronDown className="text-muted-foreground h-3 w-3" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    {Object.values(TaskStatus).map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => handleTaskStatusUpdate(status)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <span className="text-xs capitalize">
                            {status.toLowerCase().replace("_", " ")}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <RiCalendarLine
              className="text-muted-foreground mt-0.5 shrink-0"
              size={18}
            />
            <div className="flex-1">
              <p className="text-sm">{formattedDate}</p>
              {!displayEvent.allDay && (
                <p className="text-muted-foreground text-sm">
                  Ends at {formattedEndDate}
                </p>
              )}
              {displayEvent.allDay && start.getTime() !== end.getTime() && (
                <p className="text-muted-foreground text-sm">
                  Until {formattedEndDate}
                </p>
              )}
            </div>
          </div>

          {eventCalendar && (
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground flex w-[18px] shrink-0 justify-center">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: eventCalendar.backgroundColor }}
                />
              </div>
              <p className="text-sm">{eventCalendar.name}</p>
            </div>
          )}

          {displayEvent.location && (
            <div className="flex items-start gap-3">
              <div className="text-muted-foreground mt-0.5 w-[18px] shrink-0 text-center">
                📍
              </div>
              <p className="text-sm">{displayEvent.location}</p>
            </div>
          )}

          {displayEvent.description && (
            <div className="flex items-start gap-3">
              <div className="text-muted-foreground mt-0.5 w-[18px] shrink-0 text-center">
                📝
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {displayEvent.description}
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {!displayEvent?.id
              ? "Create Event"
              : isEditMode
                ? "Edit Event"
                : displayEvent.title || "(no title)"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {!displayEvent?.id
              ? "Add a new event to your calendar"
              : isEditMode
                ? "Edit the details of this event"
                : "View event details"}
          </DialogDescription>
        </DialogHeader>

        {!isEditMode && displayEvent?.id ? (
          <>
            {renderViewMode()}
            <DialogFooter className="flex-row sm:justify-between">
              {!isExternalCalendar && (
                <Button
                  variant="link"
                  className="text-destructive"
                  onClick={handleDelete}
                  aria-label="Delete event"
                >
                  Delete
                </Button>
              )}
              <div className="flex flex-1 justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                {!isExternalCalendar && (
                  <Button onClick={() => setIsEditMode(true)}>Edit</Button>
                )}
              </div>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isExternalCalendar} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calendarId"
                render={({ field }) => {
                  const localCalendars =
                    calendars?.filter((cal) => cal.type === "LOCAL") ?? [];
                  const externalCalendars =
                    calendars?.filter((cal) => cal.type === "EXTERNAL") ?? [];
                  const selectedCalendar = calendars?.find(
                    (cal) => cal.id === field.value,
                  );

                  return (
                    <FormItem>
                      <FormLabel>Calendar</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isExternalCalendar}
                      >
                        <FormControl>
                          <SelectTrigger disabled={isExternalCalendar}>
                            <SelectValue placeholder="Select a calendar">
                              {selectedCalendar && (
                                <div className="flex items-center gap-2">
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{
                                      backgroundColor:
                                        selectedCalendar.backgroundColor,
                                    }}
                                  />
                                  <span className="truncate">
                                    {selectedCalendar.name}
                                  </span>
                                </div>
                              )}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {localCalendars.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>Local Calendars</SelectLabel>
                              {localCalendars.map((calendar) => (
                                <SelectItem
                                  key={calendar.id}
                                  value={calendar.id}
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="size-2 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor:
                                          calendar.backgroundColor,
                                      }}
                                    />
                                    <span className="truncate">
                                      {calendar.name}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}

                          {localCalendars.length > 0 &&
                            externalCalendars.length > 0 && (
                              <Separator className="my-2" />
                            )}

                          {externalCalendars.length > 0 && (
                            <SelectGroup>
                              <SelectLabel>
                                External Calendars (Read-only)
                              </SelectLabel>
                              {externalCalendars.map((calendar) => (
                                <SelectItem
                                  key={calendar.id}
                                  value={calendar.id}
                                  disabled
                                >
                                  <div className="flex items-center gap-2 opacity-50">
                                    <span
                                      className="size-2 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor:
                                          calendar.backgroundColor,
                                      }}
                                    />
                                    <span className="truncate">
                                      {calendar.name}
                                      {calendar.provider &&
                                        ` (${calendar.provider})`}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Start Date</FormLabel>
                      <Popover
                        open={!isExternalCalendar && startDateOpen}
                        onOpenChange={setStartDateOpen}
                      >
                        <PopoverTrigger asChild disabled={isExternalCalendar}>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              disabled={isExternalCalendar}
                              className={cn(
                                "group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "truncate",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value
                                  ? format(field.value, "PPP")
                                  : "Pick a date"}
                              </span>
                              <RiCalendarLine
                                size={16}
                                className="text-muted-foreground/80 shrink-0"
                                aria-hidden="true"
                              />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            defaultMonth={field.value}
                            onSelect={(date) => {
                              if (date && field.value) {
                                // Preserve the time when changing the date
                                const currentTime = formatTimeFromDate(
                                  field.value,
                                );
                                const newDateTime = updateDateTime(
                                  date,
                                  currentTime,
                                );
                                field.onChange(newDateTime);
                                // If end date is before the new start date, update it
                                const currentEndDate = form.getValues("end");
                                if (
                                  currentEndDate &&
                                  newDateTime > currentEndDate
                                ) {
                                  form.setValue("end", newDateTime);
                                }
                                setStartDateOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!allDay && (
                  <FormField
                    control={form.control}
                    name="start"
                    render={({ field }) => (
                      <FormItem className="min-w-28">
                        <FormLabel>Start Time</FormLabel>
                        <Select
                          value={
                            field.value
                              ? formatTimeFromDate(field.value)
                              : undefined
                          }
                          onValueChange={(time) => {
                            if (field.value) {
                              const newDateTime = updateDateTime(
                                field.value,
                                time,
                              );
                              field.onChange(newDateTime);
                            }
                          }}
                          disabled={isExternalCalendar}
                        >
                          <FormControl>
                            <SelectTrigger disabled={isExternalCalendar}>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="end"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>End Date</FormLabel>
                      <Popover
                        open={!isExternalCalendar && endDateOpen}
                        onOpenChange={setEndDateOpen}
                      >
                        <PopoverTrigger asChild disabled={isExternalCalendar}>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              disabled={isExternalCalendar}
                              className={cn(
                                "group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              <span
                                className={cn(
                                  "truncate",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value
                                  ? format(field.value, "PPP")
                                  : "Pick a date"}
                              </span>
                              <RiCalendarLine
                                size={16}
                                className="text-muted-foreground/80 shrink-0"
                                aria-hidden="true"
                              />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            defaultMonth={field.value}
                            disabled={
                              startDate ? { before: startDate } : undefined
                            }
                            onSelect={(date) => {
                              if (date && field.value) {
                                // Preserve the time when changing the date
                                const currentTime = formatTimeFromDate(
                                  field.value,
                                );
                                const newDateTime = updateDateTime(
                                  date,
                                  currentTime,
                                );
                                field.onChange(newDateTime);
                                setEndDateOpen(false);
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!allDay && (
                  <FormField
                    control={form.control}
                    name="end"
                    render={({ field }) => (
                      <FormItem className="min-w-28">
                        <FormLabel>End Time</FormLabel>
                        <Select
                          value={
                            field.value
                              ? formatTimeFromDate(field.value)
                              : undefined
                          }
                          onValueChange={(time) => {
                            if (field.value) {
                              const newDateTime = updateDateTime(
                                field.value,
                                time,
                              );
                              field.onChange(newDateTime);
                            }
                          }}
                          disabled={isExternalCalendar}
                        >
                          <FormControl>
                            <SelectTrigger disabled={isExternalCalendar}>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="allDay"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isExternalCalendar}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">All day</FormLabel>
                  </FormItem>
                )}
              />

              {showDescription && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          disabled={isExternalCalendar}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {showLocation && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isExternalCalendar} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {/* Buttons to add optional fields */}
              {(!showDescription || !showLocation) && !isExternalCalendar && (
                <div className="flex flex-col flex-wrap items-start">
                  {!showDescription && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-muted-foreground h-8 px-0 text-xs has-[>svg]:px-0"
                      onClick={() => setShowDescription(true)}
                    >
                      <RiFileTextLine size={10} className="mr-1" />
                      Add description
                    </Button>
                  )}
                  {!showLocation && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-muted-foreground h-8 px-0 text-xs has-[>svg]:px-0"
                      onClick={() => setShowLocation(true)}
                    >
                      <RiMapPinLine size={10} className="mr-1" />
                      Add location
                    </Button>
                  )}
                </div>
              )}
              <DialogFooter className="flex-row sm:justify-between">
                {displayEvent?.id && !isExternalCalendar && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    size="icon"
                    onClick={handleDelete}
                    aria-label="Delete event"
                  >
                    <RiDeleteBinLine size={16} aria-hidden="true" />
                  </Button>
                )}
                <div className="flex flex-1 justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (displayEvent?.id) {
                        // For existing events, go back to view mode
                        setIsEditMode(false);
                      } else {
                        // For new events, close the dialog
                        onClose();
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  {!isExternalCalendar && <Button type="submit">Save</Button>}
                </div>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
