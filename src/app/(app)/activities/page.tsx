"use client";
import { api } from "@/trpc/react";
import { columns as taskColumns } from "../../../components/datatable/columns/task-columns";
import { columns as projectColumns } from "../../../components/datatable/columns/project-columns";
import { Button } from "@/components/ui/button";
import { Boxes, CalendarSync, List, Plus } from "lucide-react";
import { useDialog } from "@/providers/dialog-provider";
import { CreateTaskDialog } from "@/components/item-dialogs/dialogs/task";
import { CreateProjectDialog } from "@/components/item-dialogs/dialogs/project";
import { TaskView } from "@/components/datatable/views/task-view";
import { ProjectView } from "@/components/datatable/views/project-view";
import { CreateHabitDialog } from "@/components/item-dialogs/dialogs/habit";
import { HabitView } from "@/components/datatable/views/habit-view";
import { habitColumns } from "@/components/datatable/columns/habit-columns";
import { TitlePage } from "@/components/basic-components/page-layout";
import { useState, useMemo, useCallback } from "react";
import type { TabOption } from "@/components/basic-components/tabs-row";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useCommandN } from "@/hooks/kbd";

export default function TasksPage() {
  const { data: tasks = [], isLoading: tasksLoading } =
    api.task.getAll.useQuery();
  const { data: projects = [], isLoading: projectsLoading } =
    api.project.getAll.useQuery();

  const { data: habits = [], isLoading: habitsLoading } =
    api.habit.getAll.useQuery();

  const { showDialog } = useDialog();

  const createTask = useCallback(
    () => showDialog(<CreateTaskDialog />),
    [showDialog],
  );
  const createProject = useCallback(
    () => showDialog(<CreateProjectDialog />),
    [showDialog],
  );
  const createHabit = useCallback(
    () => showDialog(<CreateHabitDialog />),
    [showDialog],
  );

  const tabs: TabOption[] = useMemo(
    () => [
      {
        label: "Tasks",
        icon: List,
        badge: tasksLoading ? null : tasks.length,
        action: {
          actionButtonText: "New Task",
          action: createTask,
        },
      },
      {
        label: "Projects",
        icon: Boxes,
        badge: projectsLoading ? null : projects.length,
        action: {
          actionButtonText: "New Project",
          action: createProject,
        },
      },
      {
        label: "Habits",
        icon: CalendarSync,
        badge: habitsLoading ? null : habits.length,
        action: {
          actionButtonText: "New Habit",
          action: createHabit,
        },
      },
    ],
    [
      tasksLoading,
      tasks.length,
      projectsLoading,
      projects.length,
      habitsLoading,
      habits.length,
      createTask,
      createProject,
      createHabit,
    ],
  );

  const [activeTab, setActiveTab] = useState(tabs[0]!);

  const handleCommandN = useCallback(() => {
    activeTab.action?.action();
  }, [activeTab]);

  useCommandN(handleCommandN);

  return (
    <TitlePage
      title="Activities"
      description="Manage your tasks, projects & habits."
      tabModule={{ tabs, activeTab: activeTab.label, setActiveTab }}
      actionButton={
        activeTab.action && (
          <Button onClick={activeTab.action.action} variant="outline">
            <Plus />
            {activeTab.action.actionButtonText}
            <KbdGroup>
              <Kbd>⌘</Kbd>
              <Kbd>N</Kbd>
            </KbdGroup>
          </Button>
        )
      }
    >
      {activeTab.label === "Tasks" && (
        <TaskView columns={taskColumns} data={tasks} />
      )}
      {activeTab.label === "Projects" && (
        <ProjectView columns={projectColumns} data={projects} />
      )}
      {activeTab.label === "Habits" && (
        <HabitView columns={habitColumns} data={habits} />
      )}
    </TitlePage>
  );
}
