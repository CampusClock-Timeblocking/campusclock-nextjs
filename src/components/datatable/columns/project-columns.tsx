"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { type Project, ProjectStatus } from "@prisma/client";
import { format } from "date-fns";

export type ProjectWithParent = Project & {
  parent?: {
    title: string;
  } | null;
};

export const columns: ColumnDef<ProjectWithParent>[] = [
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
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as ProjectStatus | null;
      if (!status) return <div className="text-sm">-</div>;

      const statusMap: Record<ProjectStatus, string> = {
        NOT_STARTED: "Not started",
        IN_PROGRESS: "In progress",
        COMPLETED: "Completed",
        CANCELLED: "Cancelled",
      };

      return <div className="text-sm">{statusMap[status] || status}</div>;
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
      return <div className="text-sm">{priority}</div>;
    },
  },
  {
    accessorKey: "startDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Start Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const startDate = row.getValue("startDate") as Date | null;
      return (
        <div className="text-sm">
          {startDate ? format(new Date(startDate), "MMM d, yyyy") : "-"}
        </div>
      );
    },
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Deadline
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const deadline = row.getValue("deadline") as Date | null;
      return (
        <div className="text-sm">
          {deadline ? format(new Date(deadline), "MMM d, yyyy") : "-"}
        </div>
      );
    },
  },
  {
    id: "parent",
    accessorFn: (row) => row.parent?.title,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Parent Project
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const parent = row.original.parent?.title;
      return <div className="text-sm">{parent || "-"}</div>;
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string | null;
      if (!description)
        return <div className="text-muted-foreground text-sm">-</div>;

      // Truncate long descriptions
      const truncated =
        description.length > 50
          ? `${description.substring(0, 50)}...`
          : description;

      return (
        <div className="text-muted-foreground max-w-xs text-sm">
          {truncated}
        </div>
      );
    },
  },
];
