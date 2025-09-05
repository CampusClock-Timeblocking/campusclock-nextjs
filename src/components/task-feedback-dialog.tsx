"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import { useSubmitFeedbackMutation } from "@/hooks/mutations/feedback";
import { durationSchema } from "@/lib/zod";
import { parseDuration, formatDuration } from "@/lib/utils";

const feedbackFormSchema = z.object({
  actualDuration: durationSchema,
  userComplexity: z.number().int().min(1).max(10),
  feedbackText: z.string().max(2000).optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

interface TaskFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  estimatedDuration: number | null;
  estimatedComplexity: number | null;
  onComplete: () => void;
}

export function TaskFeedbackDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  estimatedDuration,
  estimatedComplexity,
  onComplete,
}: TaskFeedbackDialogProps) {
  const feedbackMutation = useSubmitFeedbackMutation();

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      actualDuration: estimatedDuration
        ? formatDuration(estimatedDuration)
        : "",
      userComplexity: estimatedComplexity ?? 5,
      feedbackText: "",
    },
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = form;

  const userComplexity = watch("userComplexity");

  const onSubmit = handleSubmit((data) => {
    const parsedDuration = parseDuration(data.actualDuration);
    if (!parsedDuration) return;

    feedbackMutation.mutate(
      {
        taskId,
        actualDurationMinutes: parsedDuration,
        userComplexity: data.userComplexity,
        feedbackText: data.feedbackText ?? undefined,
      },
      {
        onSuccess: () => {
          onComplete();
          onOpenChange(false);
          form.reset();
        },
      },
    );
  });

  const onSkip = () => {
    onComplete();
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>How did it go?</DialogTitle>
          <DialogDescription className="truncate">
            {taskTitle}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="actualDuration">Actual Duration</Label>
            <Controller
              control={control}
              name="actualDuration"
              render={({ field }) => (
                <Input
                  id="actualDuration"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  placeholder="e.g., 30m, 2h, 2:30h"
                />
              )}
            />
            {errors.actualDuration && (
              <p className="text-sm text-red-500">
                {errors.actualDuration.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Complexity</Label>
              <span className="text-muted-foreground text-sm font-medium">
                {userComplexity}/10
              </span>
            </div>
            <Controller
              control={control}
              name="userComplexity"
              render={({ field }) => (
                <Slider
                  value={[field.value]}
                  onValueChange={(value) => field.onChange(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              )}
            />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>Simple</span>
              <span>Complex</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedbackText">Notes (optional)</Label>
            <Controller
              control={control}
              name="feedbackText"
              render={({ field }) => (
                <Textarea
                  id="feedbackText"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="Any observations about this task..."
                  rows={3}
                  className="resize-none"
                />
              )}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              disabled={feedbackMutation.isPending}
            >
              Skip
            </Button>
            <AsyncButton type="submit" isLoading={feedbackMutation.isPending}>
              Submit & Complete
            </AsyncButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
