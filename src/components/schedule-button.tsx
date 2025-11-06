"use client";

import { useState } from "react";
import {
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarType } from "@prisma/client";

export function ScheduleButton() {
  const [showPreview, setShowPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    scheduledTaskIds: string[];
    unscheduledTaskIds: string[];
    events: Array<{
      taskId: string;
      start: Date;
      end: Date;
      title: string;
    }>;
    meta: {
      status: "optimal" | "feasible" | "impossible" | "error";
      successRate: number;
      wallTimeMs: number;
    };
  } | null>(null);

  const utils = api.useUtils();

  // Get scheduling stats
  const { data: stats } = api.scheduler.getSchedulingStats.useQuery();

  // Get solver health
  const { data: health } = api.scheduler.checkSolverHealth.useQuery();

  // Get user's calendars to find a writable one
  const { data: calendars } = api.calendar.getAll.useQuery();

  // Preview mutation
  const previewMutation = api.scheduler.scheduleTasks.useMutation({
    onSuccess: (result) => {
      setPreviewResult(result);
      setShowPreview(true);
    },
    onError: (error) => {
      toast.error("Failed to preview schedule", {
        description: error.message,
        position: "bottom-left",
      });
    },
  });

  // Schedule and save mutation
  const scheduleMutation = api.scheduler.scheduleAndSave.useMutation({
    onSuccess: (result) => {
      if (
        result.meta.status === "optimal" ||
        result.meta.status === "feasible"
      ) {
        toast.success("Tasks scheduled successfully!", {
          description: `Scheduled ${result.scheduledTaskIds.length} task${result.scheduledTaskIds.length !== 1 ? "s" : ""} in ${(result.meta.wallTimeMs / 1000).toFixed(1)}s`,
          position: "bottom-left",
        });
        // Invalidate calendar queries to refresh the calendar view
        void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
        void utils.calendar.getAllUnifiedEvents.invalidate();
        void utils.scheduler.getSchedulingStats.invalidate();
        setShowPreview(false);
        setPreviewResult(null);
      } else if (result.meta.status === "impossible") {
        toast.error("Could not schedule all tasks", {
          description: `Only ${result.scheduledTaskIds.length} of ${result.scheduledTaskIds.length + result.unscheduledTaskIds.length} tasks could be scheduled`,
          position: "bottom-left",
        });
      } else {
        toast.error("Scheduling failed", {
          description: "An error occurred while scheduling tasks",
          position: "bottom-left",
        });
      }
    },
    onError: (error) => {
      toast.error("Failed to schedule tasks", {
        description: error.message,
        position: "bottom-left",
      });
    },
  });

  // Find a writable calendar (prefer local, non-read-only)
  const writableCalendar =
    calendars?.find(
      (cal) => cal.type === CalendarType.LOCAL && !cal.readOnly,
    ) ?? calendars?.find((cal) => !cal.readOnly);

  const handlePreviewSchedule = () => {
    previewMutation.mutate({
      timeHorizon: 7,
    });
  };

  const handleScheduleAndSave = () => {
    if (!writableCalendar) {
      toast.error("No writable calendar found");
      return;
    }

    scheduleMutation.mutate({
      calendarId: writableCalendar.id,
      timeHorizon: 7,
    });
  };

  const handleConfirmSchedule = () => {
    if (!writableCalendar) {
      toast.error("No writable calendar found");
      return;
    }

    scheduleMutation.mutate({
      calendarId: writableCalendar.id,
      timeHorizon: 7,
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "optimal":
        return <Badge className="bg-green-500">Optimal</Badge>;
      case "feasible":
        return <Badge className="bg-blue-500">Feasible</Badge>;
      case "impossible":
        return <Badge variant="destructive">Impossible</Badge>;
      default:
        return <Badge variant="secondary">Error</Badge>;
    }
  };

  // Check if solver is available
  if (!health?.available) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Scheduler offline: {health?.error ?? "Unknown error"}
        </AlertDescription>
      </Alert>
    );
  }

  // Check if there are tasks to schedule
  const hasTasksToSchedule = (stats?.unscheduledTasks ?? 0) > 0;

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="text-sm font-medium">
            {stats?.unscheduledTasks ?? 0} task
            {stats?.unscheduledTasks !== 1 ? "s" : ""} waiting
          </div>
          {stats && stats.scheduledTasks > 0 && (
            <div className="text-muted-foreground text-xs">
              {stats.scheduledTasks} already scheduled
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePreviewSchedule}
            disabled={!hasTasksToSchedule || previewMutation.isPending}
            variant="outline"
            size="sm"
          >
            {previewMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Previewing...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Preview Schedule
              </>
            )}
          </Button>
          <Button
            onClick={handleScheduleAndSave}
            disabled={!hasTasksToSchedule || scheduleMutation.isPending}
            size="sm"
          >
            {scheduleMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Schedule Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Preview</DialogTitle>
            <DialogDescription>
              Review the proposed schedule before saving to your calendar
            </DialogDescription>
          </DialogHeader>

          {previewResult && (
            <div className="space-y-4">
              {/* Status Summary */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(previewResult.meta.status)}
                    <span className="text-sm font-medium">
                      {previewResult.scheduledTaskIds.length} of{" "}
                      {previewResult.scheduledTaskIds.length +
                        previewResult.unscheduledTaskIds.length}{" "}
                      tasks scheduled
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Success rate:{" "}
                    {(previewResult.meta.successRate * 100).toFixed(0)}% •
                    Computed in{" "}
                    {(previewResult.meta.wallTimeMs / 1000).toFixed(2)}s
                  </div>
                </div>
                {previewResult.meta.status === "optimal" && (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                )}
              </div>

              {/* Warning if not all tasks scheduled */}
              {previewResult.unscheduledTaskIds.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {previewResult.unscheduledTaskIds.length} task
                    {previewResult.unscheduledTaskIds.length !== 1
                      ? "s"
                      : ""}{" "}
                    could not be scheduled. Try extending your working hours or
                    deadline dates.
                  </AlertDescription>
                </Alert>
              )}

              {/* Scheduled Events */}
              {previewResult.events.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Scheduled Tasks</h4>
                  <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {previewResult.events.map((event, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between rounded-md border p-3 text-sm"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-muted-foreground text-xs">
                            {formatDate(event.start)} → {formatDate(event.end)}
                          </div>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {Math.round(
                            (event.end.getTime() - event.start.getTime()) /
                              1000 /
                              60,
                          )}
                          min
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  disabled={scheduleMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSchedule}
                  disabled={
                    scheduleMutation.isPending ||
                    previewResult.scheduledTaskIds.length === 0
                  }
                >
                  {scheduleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm & Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

