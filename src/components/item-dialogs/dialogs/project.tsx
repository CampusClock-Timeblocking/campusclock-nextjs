"use client";

import type { Project } from "@prisma/client";
import { useDialog } from "../../../providers/dialog-provider";
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
} from "@/hooks/mutations/project";
import { ProjectDialogContent } from "../base-content/project";
import type { CreateProjectInput } from "@/lib/zod";

interface Props {
  initialValues?: Partial<CreateProjectInput>;
  autoFocusTitle?: boolean;
  createCallback?: (result: Project) => void;
}

export function CreateProjectDialog({
  initialValues,
  autoFocusTitle = true,
  createCallback,
}: Props) {
  const { hideDialog } = useDialog();
  const createProjectMutation = useCreateProjectMutation();

  return (
    <ProjectDialogContent
      hideDialog={hideDialog}
      submitButtonText="Create"
      mutation={createProjectMutation}
      initialValues={initialValues}
      autoFocusTitle={autoFocusTitle}
      submitCallback={createCallback}
    />
  );
}

interface EditProps {
  project: Project;
}

export function UpdateProjectDialog({ project }: EditProps) {
  const { hideDialog } = useDialog();
  const updateProjectMutation = useUpdateProjectMutation({
    projectId: project.id,
  });

  const initialValues = projectToInitalValues(project);

  return (
    <ProjectDialogContent
      hideDialog={hideDialog}
      mutation={updateProjectMutation}
      submitButtonText="Update"
      initialValues={initialValues}
    />
  );
}

export function projectToInitalValues(project: Project) {
  return {
    title: project.title,
    description: project.description ?? undefined,
    priority: project.priority ?? undefined,
    startDate: project.startDate ?? undefined,
    deadline: project.deadline ?? undefined,
    status: project.status ?? undefined,
    parentId: project.parentId ?? undefined,
  };
}
