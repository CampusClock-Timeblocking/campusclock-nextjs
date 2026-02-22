"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
  Info,
  Send,
} from "lucide-react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Types
// ============================================================================

type SchedulingResult = {
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
};

type FeedbackMessage = {
  role: "user" | "ai";
  text: string;
};

// ============================================================================
// Component
// ============================================================================

export function ScheduleButton() {
  const [showPreview, setShowPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<SchedulingResult | null>(null);

  // Feedback loop state
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackMessage[]>([]);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explanationsLoading, setExplanationsLoading] = useState(false);

  const feedbackEndRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();

  // Reset feedback state when dialog closes
  const handleDialogChange = (open: boolean) => {
    setShowPreview(open);
    if (!open) {
      setFeedbackHistory([]);
      setFeedbackInput("");
      setExplanations({});
    }
  };

  // Auto-scroll feedback thread to bottom
  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedbackHistory]);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: stats } = api.scheduler.getSchedulingStats.useQuery();
  const { data: health } = api.scheduler.checkSolverHealth.useQuery();
  const { data: calendars } = api.calendar.getAll.useQuery();

  // Explanation query (lazy — enabled only when dialog is open and we have scheduled tasks)
  const scheduledTasksForExplain = previewResult?.events.map((e) => ({
    id: e.taskId,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
  })) ?? [];

  const { data: explainData, isFetching: explainFetching } =
    api.scheduler.explainSchedule.useQuery(
      { scheduledTasks: scheduledTasksForExplain },
      {
        enabled:
          showPreview &&
          scheduledTasksForExplain.length > 0 &&
          Object.keys(explanations).length === 0,
        retry: false,
      },
    );

  useEffect(() => {
    if (explainData?.explanations) {
      setExplanations(explainData.explanations);
    }
  }, [explainData]);

  useEffect(() => {
    setExplanationsLoading(explainFetching);
  }, [explainFetching]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const previewMutation = api.scheduler.scheduleTasks.useMutation({
    onSuccess: (result) => {
      setPreviewResult(result);
      setFeedbackHistory([]);
      setExplanations({});
      setShowPreview(true);
    },
    onError: (error) => {
      toast.error("Vorschau fehlgeschlagen", {
        description: error.message,
        position: "bottom-left",
      });
    },
  });

  const scheduleMutation = api.scheduler.scheduleAndSave.useMutation({
    onSuccess: (result) => {
      if (result.meta.status === "optimal" || result.meta.status === "feasible") {
        toast.success("Aufgaben erfolgreich eingeplant!", {
          description: `${result.scheduledTaskIds.length} Aufgabe${result.scheduledTaskIds.length !== 1 ? "n" : ""} in ${(result.meta.wallTimeMs / 1000).toFixed(1)}s`,
          position: "bottom-left",
        });
        void utils.calendar.getAllCalendarsWithUnifiedEvents.invalidate();
        void utils.calendar.getAllUnifiedEvents.invalidate();
        void utils.scheduler.getSchedulingStats.invalidate();
        handleDialogChange(false);
        setPreviewResult(null);
      } else if (result.meta.status === "impossible") {
        toast.error("Nicht alle Aufgaben konnten eingeplant werden", {
          description: `Nur ${result.scheduledTaskIds.length} von ${result.scheduledTaskIds.length + result.unscheduledTaskIds.length} Aufgaben eingeplant`,
          position: "bottom-left",
        });
      } else {
        toast.error("Einplanung fehlgeschlagen", { position: "bottom-left" });
      }
    },
    onError: (error) => {
      toast.error("Fehler beim Einplanen", {
        description: error.message,
        position: "bottom-left",
      });
    },
  });

  const feedbackMutation = api.scheduler.applyFeedbackAndPreview.useMutation({
    onSuccess: (result) => {
      setFeedbackHistory((prev) => [
        ...prev,
        { role: "ai", text: result.aiReply },
      ]);

      if (result.newSchedule && !result.clarificationNeeded) {
        setPreviewResult(result.newSchedule);
        setExplanations({});
      }
    },
    onError: (error) => {
      setFeedbackHistory((prev) => [
        ...prev,
        { role: "ai", text: `Fehler: ${error.message}` },
      ]);
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const writableCalendar =
    calendars?.find(
      (cal) => cal.calendarAccount.provider === "campusclock" && !cal.readOnly,
    ) ?? calendars?.find((cal) => !cal.readOnly);

  const handlePreviewSchedule = () => {
    previewMutation.mutate({ timeHorizon: 7 });
  };

  const handleScheduleAndSave = () => {
    if (!writableCalendar) {
      toast.error("Kein beschreibbarer Kalender gefunden");
      return;
    }
    scheduleMutation.mutate({ calendarId: writableCalendar.id, timeHorizon: 7 });
  };

  const handleConfirmSchedule = () => {
    if (!writableCalendar) {
      toast.error("Kein beschreibbarer Kalender gefunden");
      return;
    }
    scheduleMutation.mutate({ calendarId: writableCalendar.id, timeHorizon: 7 });
  };

  const handleSendFeedback = () => {
    const msg = feedbackInput.trim();
    if (!msg || feedbackMutation.isPending) return;

    setFeedbackHistory((prev) => [...prev, { role: "user", text: msg }]);
    setFeedbackInput("");

    feedbackMutation.mutate({
      message: msg,
      currentSchedule: previewResult?.events.map((e) => ({
        id: e.taskId,
        start: e.start.toISOString(),
        end: e.end.toISOString(),
      })),
    });
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "optimal":
        return <Badge className="bg-green-500">Optimal</Badge>;
      case "feasible":
        return <Badge className="bg-blue-500">Machbar</Badge>;
      case "impossible":
        return <Badge variant="destructive">Nicht möglich</Badge>;
      default:
        return <Badge variant="secondary">Fehler</Badge>;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!health?.available) {
    return (
      <Alert variant="destructive" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Planer offline: {health?.error ?? "Unbekannter Fehler"}
        </AlertDescription>
      </Alert>
    );
  }

  const hasTasksToSchedule = (stats?.unscheduledTasks ?? 0) > 0;

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="text-sm font-medium">
            {stats?.unscheduledTasks ?? 0} Aufgabe
            {stats?.unscheduledTasks !== 1 ? "n" : ""} wartend
          </div>
          {stats && stats.scheduledTasks > 0 && (
            <div className="text-muted-foreground text-xs">
              {stats.scheduledTasks} bereits eingeplant
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
                Berechne...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Vorschau
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
                Speichern...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Jetzt einplanen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preview + Feedback Dialog */}
      <Dialog open={showPreview} onOpenChange={handleDialogChange}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Stundenplan Vorschau</DialogTitle>
            <DialogDescription>
              Überprüfe den vorgeschlagenen Plan, bevor er gespeichert wird.
            </DialogDescription>
          </DialogHeader>

          {previewResult && (
            <div className="flex flex-1 flex-col gap-4 overflow-hidden">
              {/* Status Summary */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(previewResult.meta.status)}
                    <span className="text-sm font-medium">
                      {previewResult.scheduledTaskIds.length} von{" "}
                      {previewResult.scheduledTaskIds.length +
                        previewResult.unscheduledTaskIds.length}{" "}
                      Aufgaben eingeplant
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Erfolgsrate:{" "}
                    {(previewResult.meta.successRate * 100).toFixed(0)}% ·
                    Berechnet in{" "}
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
                    {previewResult.unscheduledTaskIds.length} Aufgabe
                    {previewResult.unscheduledTaskIds.length !== 1 ? "n" : ""}{" "}
                    konnten nicht eingeplant werden. Versuche die Arbeitszeiten oder
                    Deadlines anzupassen.
                  </AlertDescription>
                </Alert>
              )}

              {/* Scheduled Events with optional explanation icons */}
              {previewResult.events.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Eingeplante Aufgaben</h4>
                  <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {previewResult.events.map((event, index) => {
                      const explanation = explanations[event.taskId];
                      return (
                        <div
                          key={index}
                          className="flex items-start justify-between rounded-md border p-3 text-sm"
                        >
                          <div className="flex flex-1 items-start gap-2">
                            <div className="flex-1">
                              <div className="font-medium">{event.title}</div>
                              <div className="text-muted-foreground text-xs">
                                {formatDate(event.start)} →{" "}
                                {formatDate(event.end)}
                              </div>
                            </div>
                            {/* Info icon — shown when AI explanation is available or loading */}
                            {(explanation ?? explanationsLoading) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 transition-colors"
                                    aria-label="Erklärung anzeigen"
                                  >
                                    <Info className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-64 text-left">
                                  {explanation ?? "Lade Erklärung…"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="text-muted-foreground ml-2 shrink-0 text-xs">
                            {Math.round(
                              (event.end.getTime() - event.start.getTime()) /
                                1000 /
                                60,
                            )}
                            min
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── AI Feedback Section ── */}
              <Separator />

              {/* Feedback thread (AI replies) */}
              {feedbackHistory.length > 0 && (
                <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-3">
                  {feedbackHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={
                        msg.role === "user"
                          ? "text-foreground text-sm font-medium"
                          : "text-muted-foreground text-sm"
                      }
                    >
                      {msg.role === "user" ? "Du: " : "KI: "}
                      {msg.text}
                    </div>
                  ))}
                  <div ref={feedbackEndRef} />
                </div>
              )}

              {/* Feedback input */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  Passt das so? Gib Feedback auf Deutsch (z.B. "Physik lieber nachmittags"):
                </p>
                <div className="flex gap-2">
                  <Textarea
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendFeedback();
                      }
                    }}
                    placeholder="Dein Feedback…"
                    className="min-h-[2.5rem] resize-none"
                    rows={1}
                    disabled={feedbackMutation.isPending}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleSendFeedback}
                    disabled={
                      !feedbackInput.trim() || feedbackMutation.isPending
                    }
                    aria-label="Feedback senden"
                  >
                    {feedbackMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
                  disabled={scheduleMutation.isPending}
                >
                  Abbrechen
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
                      Speichern...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Ja, speichern
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
