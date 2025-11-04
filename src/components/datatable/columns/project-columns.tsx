"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { type Project, ProjectStatus } from "@prisma/client";
import { format } from "date-fns";
import { SortableHeader } from "../sortable-header-button";
import {
  CircleCheck,
  CircleDashed,
  CircleOff,
  Loader,
  OctagonAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "./components";
import { Skeleton } from "@/components/ui/skeleton";
import { seededRandom } from "@/lib/utils";

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
        <CircleDashed />
      </SortableHeader>
    ),
    cell: ({ row }) => {
      const status = row.original.status;
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
    accessorKey: "startDate",
    header: ({ column }) => (
      <SortableHeader column={column}>Start Date</SortableHeader>
    ),
    cell: ({ row }) => {
      const startDate = row.original.startDate;
      return (
        <div className="text-sm">
          {startDate ? format(new Date(startDate), "MMM d, yyyy") : "-"}
        </div>
      );
    },
    meta: {
      skeleton: () => <Skeleton className="h-4 w-24" />,
    },
  },
  {
    accessorKey: "deadline",
    header: ({ column }) => (
      <SortableHeader column={column}>Deadline</SortableHeader>
    ),
    cell: ({ row }) => {
      const deadline = row.original.deadline;
      return (
        <div className="text-sm">
          {deadline ? format(new Date(deadline), "MMM d, yyyy") : "-"}
        </div>
      );
    },
    meta: {
      skeleton: () => <Skeleton className="h-4 w-24" />,
    },
  },
  {
    id: "parent",
    accessorFn: (row) => row.parent?.title,
    header: ({ column }) => (
      <SortableHeader column={column}>Parent</SortableHeader>
    ),
    cell: ({ row }) => {
      const parent = row.original.parent?.title;
      return <div className="text-sm">{parent || "-"}</div>;
    },
    meta: {
      skeleton: (rowIndex) => {
        const random = seededRandom(rowIndex * 6348);
        const width = Math.floor(random() * 30) + 90;
        return <Skeleton className="h-4" style={{ width: `${width}px` }} />;
      },
    },
  },
];

function getStatusIcon(status: ProjectStatus) {
  switch (status) {
    case ProjectStatus.NOT_STARTED:
      return <CircleDashed />;
    case ProjectStatus.IN_PROGRESS:
      return <Loader />;
    case ProjectStatus.COMPLETED:
      return <CircleCheck />;
    case ProjectStatus.CANCELLED:
      return <CircleOff />;
    default:
      return null;
  }
}
