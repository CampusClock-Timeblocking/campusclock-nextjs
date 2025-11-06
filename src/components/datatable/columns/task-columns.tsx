"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CircleCheck,
  CircleDashed,
  CircleOff,
  Loader,
  OctagonAlert,
  Pause,
  RedoDot,
  SkipForward,
  Timer,
} from "lucide-react";
import { type Task, TaskStatus } from "@prisma/client";
import { format } from "date-fns";
import { formatDuration, seededRandom } from "@/lib/utils";
import { SortableHeader } from "../sortable-header-button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "./components";
import { Skeleton } from "@/components/ui/skeleton";

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
    meta: {
      skeleton: () => <Skeleton className="h-4 w-4 rounded" />,
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
    meta: {
      skeleton: (rowIndex) => {
        const random = seededRandom(rowIndex * 9973);
        const width = Math.floor(random() * 60) + 100;
        return <Skeleton className="h-4" style={{ width: `${width}px` }} />;
      },
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <SortableHeader column={column}>
        <CircleDashed className="h-4 w-4" />
      </SortableHeader>
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      return getStatusBade(status);
    },
    meta: {
      skeleton: () => <Skeleton className="h-[22px] w-20 rounded-full" />,
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <SortableHeader column={column}>
        <OctagonAlert />
      </SortableHeader>
    ),
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    meta: {
      skeleton: () => <Skeleton className="h-[22px] w-[22px] rounded-full" />,
    },
  },
  {
    accessorKey: "due",
    header: ({ column }) => (
      <SortableHeader column={column}>Due</SortableHeader>
    ),
    cell: ({ row }) => {
      const due = row.original.due;
      return (
        <div className="text-sm">
          {due ? format(new Date(due), "MMM d, yyyy") : "-"}
        </div>
      );
    },
    meta: {
      skeleton: () => <Skeleton className="h-4 w-24" />,
    },
  },
  {
    id: "project",
    accessorFn: (row) => row.project?.title,
    header: ({ column }) => (
      <SortableHeader column={column}>Project</SortableHeader>
    ),
    cell: ({ row }) => {
      const project = row.original.project?.title;
      return <div className="text-sm">{project || "-"}</div>;
    },
    meta: {
      skeleton: (rowIndex) => {
        const random = seededRandom(rowIndex * 5783);
        const width = Math.floor(random() * 45) + 80;
        return <Skeleton className="h-4" style={{ width: `${width}px` }} />;
      },
    },
  },
  {
    accessorKey: "scheduledTime",
    header: ({ column }) => (
      <SortableHeader column={column}>Scheduled</SortableHeader>
    ),
    cell: ({ row }) => {
      const scheduledTime = row.original.scheduledTime;
      return <div className="text-sm">{scheduledTime || "-"}</div>;
    },
    meta: {
      skeleton: () => <Skeleton className="h-4 w-24" />,
    },
  },
  {
    accessorKey: "durationMinutes",
    header: ({ column }) => (
      <SortableHeader column={column}>
        <Timer className="h-4 w-4" />
      </SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        {row.original.durationMinutes
          ? formatDuration(row.original.durationMinutes)
          : "-"}
      </div>
    ),
    meta: {
      skeleton: () => <Skeleton className="h-4 w-12" />,
    },
  },
];

export function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case TaskStatus.TO_DO:
      return <CircleDashed />;
    case TaskStatus.SNOOZED:
      return <RedoDot />;
    case TaskStatus.SKIPPED:
      return <SkipForward />;
    case TaskStatus.IN_PROGRESS:
      return <Loader />;
    case TaskStatus.PAUSED:
      return <Pause />;
    case TaskStatus.COMPLETED:
      return <CircleCheck />;
    case TaskStatus.CANCELLED:
      return <CircleOff />;
    default:
      return null;
  }
}

export function getStatusBade(status: TaskStatus) {
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground rounded-full px-1.5"
    >
      {getStatusIcon(status)}
      <span className="text-xs capitalize">
        {status.toLowerCase().replace("_", " ")}
      </span>
    </Badge>
  );
}
