import { Button } from "@/components/ui/button";
import { FolderOpen, Loader2 } from "lucide-react";
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
import { Slider } from "../../ui/slider";
import { DialogContentLayout } from "./layout";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateTaskSchema, type CreateTaskInput } from "@/lib/zod";
import { DateTimePicker } from "../../date-time-picker";
import type {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "@/hooks/mutations/task";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import { api } from "@/trpc/react";

interface Props {
  hideDialog: () => void;
  autoFocusTitle?: boolean;
  initialValues?: CreateTaskInput;
  mutation:
    | ReturnType<typeof useCreateTaskMutation>
    | ReturnType<typeof useUpdateTaskMutation>;
  submitButtonText: string;
}

const DEFAULT_VALUES = {
  title: "",
  description: "",
  priority: 3,
  durationMinutes: "30m",
  complexity: 5,
  due: undefined,
  projectId: undefined,
};

export const TaskDialogContent: React.FC<Props> = ({
  hideDialog,
  autoFocusTitle,
  initialValues,
  mutation,
  submitButtonText,
}) => {
  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: initialValues ?? DEFAULT_VALUES,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const title = watch("title");

  const handleFormSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: () => {
        hideDialog();
        form.reset();
      },
    });
  });

  const { data: projects, isLoading } = api.project.getAll.useQuery();

  return (
    <DialogContentLayout
      title={title}
      titlePlaceholderText="New task..."
      setTitle={(newTitle) => setValue("title", newTitle)}
      initFocusTitle={autoFocusTitle}
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

          <Controller
            name="due"
            control={control}
            rules={{
              validate: (value) => {
                if (!value) return "Date is required";
                return true;
              },
            }}
            render={({ field, fieldState }) => (
              <div>
                <DateTimePicker
                  value={field.value}
                  onChange={field.onChange}
                  error={!!fieldState.error}
                />
                {fieldState.error && (
                  <p className="text-destructive mt-1 text-sm">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="complexity">Complexity</Label>
              <Controller
                control={control}
                name="complexity"
                render={({ field }) => (
                  <span className="text-muted-foreground text-sm font-medium">
                    {field.value ?? 5}/10
                  </span>
                )}
              />
            </div>
            <Controller
              control={control}
              name="complexity"
              render={({ field }) => (
                <Slider
                  id="complexity"
                  value={[field.value ?? 5]}
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
            <Label htmlFor="description">Description</Label>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Textarea
                  id="description"
                  {...field}
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
            <div className="space-y-2">
              <Label htmlFor="project" className="flex items-center gap-2">
                <FolderOpen className="size-4" />
                Project
              </Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Select
                      key={field.value}
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger id="project" disabled={isLoading}>
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="size-4 animate-spin" />
                            <span>Loading projects...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Assign project" />
                        )}
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value && (
                      <Button
                        variant="outline"
                        onClick={() => field.onChange(null)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              />
            </div>
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
            </Button>
            <AsyncButton
              onClick={handleFormSubmit}
              disabled={!title?.trim()}
              isLoading={mutation.isPending}
            >
              {submitButtonText}
            </AsyncButton>
          </div>
        </>
      }
    />
  );
};
