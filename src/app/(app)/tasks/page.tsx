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
    <div className="container mx-auto space-y-12 px-14 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and track your progress
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => showDialog(<CreateTaskDialog />)}
        >
          <Plus />
          Add Task
        </Button>
      </div>

      <TaskView columns={taskColumns} data={tasks} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
          <p className="text-muted-foreground">Manage your Habits</p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => showDialog(<CreateHabitDialog />)}
        >
          <Plus />
          Add Habit
        </Button>
      </div>
      <HabitView columns={habitColumns} data={habits} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your Projects </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => showDialog(<CreateProjectDialog />)}
        >
          <Plus />
          Add Project
        </Button>
      </div>
      <ProjectView columns={projectColumns} data={projects} />
    </div>
  );
}
