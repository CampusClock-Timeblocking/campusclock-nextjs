"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { type Task, TaskStatus } from "@prisma/client";
import { format } from "date-fns";

export type TaskWithProject = Task & {
  project?: {
    title: string;
  } | null;
};

export const columns: ColumnDef<TaskWithProject>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("title")}</div>
    ),
  },
  {
    id: "project",
    accessorFn: (row) => row.project?.title,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Project
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const project = row.original.project?.title;
      return <div className="text-sm">{project || "-"}</div>;
    },
  },
  {
    accessorKey: "due",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const due = row.getValue("due") as Date | null;
      return (
        <div className="text-sm">
          {due ? format(new Date(due), "MMM d, yyyy") : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const priority = row.getValue("priority") as number | null;
      return <div className="text-sm">{priority ?? "-"}</div>;
    },
  },
  {
    accessorKey: "scheduledTime",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Scheduled Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const scheduledTime = row.getValue("scheduledTime") as string | null;
      return <div className="text-sm">{scheduledTime || "-"}</div>;
    },
  },
  {
    accessorKey: "durationMinutes",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Duration
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const duration = row.getValue("durationMinutes") as number | null;
      if (!duration) return <div className="text-sm">-</div>;

      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;

      if (hours > 0 && minutes > 0) {
        return (
          <div className="text-sm">
            {hours}h {minutes}m
          </div>
        );
      } else if (hours > 0) {
        return <div className="text-sm">{hours}h</div>;
      } else {
        return <div className="text-sm">{minutes}m</div>;
      }
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as TaskStatus;
      return (
        <div className="text-sm capitalize">
          {status.toLowerCase().replace("_", " ")}
        </div>
      );
    },
  },
];
