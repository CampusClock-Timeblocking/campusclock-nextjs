"use client";
import * as React from "react";
import { DataTable } from "../../../components/datatable/data-table";
import { api } from "@/trpc/react";
import { columns as taskColumns } from "../../../components/datatable/columns/task-columns";
import { columns as projectColumns } from "../../../components/datatable/columns/project-columns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useDialog } from "@/providers/dialog-provider";
import {
  CreateTaskDialog,
  UpdateTaskDialog,
} from "@/components/item-dialogs/dialogs/task";
import {
  CreateProjectDialog,
  UpdateProjectDialog,
} from "@/components/item-dialogs/dialogs/project";
import { useDeleteManyTasks } from "@/hooks/mutations/task";
import { useDelteManyProjectMutation } from "@/hooks/mutations/project";
import { TaskView } from "@/components/datatable/views/task-view";
import { ProjectView } from "@/components/datatable/views/project-view";
import { CreateHabitDialog } from "@/components/item-dialogs/dialogs/habit";
import { HabitView } from "@/components/datatable/views/habit-view";
import { habitColumns } from "@/components/datatable/columns/habit-columns";
import { PageWrapper } from "@/components/basic-components/page-wrapper";
import { SectionHeader } from "@/components/basic-components/section-header";

export default function TasksPage() {
  const { data: tasks = [], refetch: refetchTasks } =
    api.task.getAll.useQuery();
  const { data: projects = [], refetch: refetchProjects } =
    api.project.getAll.useQuery();

  const { data: habits = [] } = api.habit.getAll.useQuery();

  const delteTasksMutation = useDeleteManyTasks();
  const delteProjectsMutation = useDelteManyProjectMutation();

  const { showDialog } = useDialog();

  return (
    <PageWrapper className="space-y-12">
      <SectionHeader
        variant="section"
        title="Tasks"
        description="Manage your tasks and track your progress"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => showDialog(<CreateTaskDialog />)}
          >
            <Plus />
            Add Task
          </Button>
        }
      />

      <TaskView columns={taskColumns} data={tasks} />

      <SectionHeader
        variant="section"
        title="Habits"
        description="Manage your Habits"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => showDialog(<CreateHabitDialog />)}
          >
            <Plus />
            Add Habit
          </Button>
        }
      />
      <HabitView columns={habitColumns} data={habits} />

      <SectionHeader
        variant="section"
        title="Projects"
        description="Manage your Projects"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => showDialog(<CreateProjectDialog />)}
          >
            <Plus />
            Add Project
          </Button>
        }
      />
      <ProjectView columns={projectColumns} data={projects} />
    </PageWrapper>
  );
}
