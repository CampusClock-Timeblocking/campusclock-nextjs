import { Button } from "@/components/ui/button";
import { FolderOpen, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogContentLayout } from "./layout";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateProjectSchema, type CreateProjectInput } from "@/lib/zod";
import { DateTimePicker } from "@/components/date-time-picker";
import type {
  useCreateProjectMutation,
  useUpdateProjectMutation,
} from "@/hooks/mutations/project";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import type { Project } from "@prisma/client";
import { api } from "@/trpc/react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useShiftEnter } from "@/hooks/kbd";

interface Props {
  hideDialog: () => void;
  autoFocusTitle?: boolean;
  initialValues?: Partial<CreateProjectInput>;
  mutation:
    | ReturnType<typeof useCreateProjectMutation>
    | ReturnType<typeof useUpdateProjectMutation>;
  submitButtonText: string;
  submitCallback?: (result: Project) => void;
}

export const ProjectDialogContent: React.FC<Props> = ({
  hideDialog,
  autoFocusTitle,
  initialValues,
  mutation,
  submitButtonText,
  submitCallback,
}) => {
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(CreateProjectSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      priority: initialValues?.priority ?? 3,
      startDate: initialValues?.startDate,
      deadline: initialValues?.deadline,
      status: initialValues?.status,
      parentId: initialValues?.parentId,
    },
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

  const { data: projects, isLoading } = api.project.getAll.useQuery();

  const handleFormSubmit = handleSubmit((data) => {
    mutation.mutate(data, {
      onSuccess: (result) => {
        hideDialog();
        form.reset();
        submitCallback?.(result);
      },
    });
  });

  useShiftEnter(handleFormSubmit);

  return (
    <DialogContentLayout
      title={title ?? ""}
      titlePlaceholderText="New project..."
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

          <Controller
            name="startDate"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <DateTimePicker
                  dateLabel="Start date"
                  timeLabel="Start time"
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

          <Controller
            name="deadline"
            control={control}
            render={({ field, fieldState }) => (
              <div>
                <DateTimePicker
                  dateLabel="Deadline date"
                  timeLabel="Deadline time"
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
              <Label htmlFor="parent" className="flex items-center gap-2">
                <FolderOpen className="size-4" />
                Parent Project
              </Label>
              <Controller
                control={control}
                name="parentId"
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
              <p className="text-muted-foreground text-xs">
                Nest this project under another project
              </p>
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
