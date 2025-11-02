"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { type Habit, PeriodUnit } from "@prisma/client";
import { format } from "date-fns";
import { SortableHeader } from "../sortable-header-button";
import {
  AlertOctagon,
  CalendarSync,
  Moon,
  Power,
  Repeat,
  Sun,
  Timer,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { B, P } from "node_modules/@upstash/redis/zmscore-Cq_Bzgy4.mjs";
import { PriorityBadge } from "./components";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const habitColumns: ColumnDef<Habit>[] = [
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
      skeleton: <Skeleton className="h-4 w-4 rounded" />,
    },
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <SortableHeader column={column}>Name</SortableHeader>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("title")}</div>
    ),
    meta: {
      skeleton: <Skeleton className="h-4 w-full max-w-[200px]" />,
    },
  },
  {
    accessorKey: "active",
    header: ({ column }) => (
      <SortableHeader column={column}>
        <Power />
      </SortableHeader>
    ),
    cell: ({ row }) => {
      const active = row.original.active;
      return (
        <Badge variant="outline" className={cn("rounded-full text-xs")}>
          {active ? (
            <span className="text-green-400">Active</span>
          ) : (
            <span className="text-muted-foreground">Inactive</span>
          )}
        </Badge>
      );
    },
    meta: {
      skeleton: <Skeleton className="h-6 w-16 rounded-full" />,
    },
  },
  {
    id: "recurrence",
    accessorFn: (row) => `${row.interval} ${row.recurrenceType}`,
    header: ({ column }) => (
      <SortableHeader column={column}>
        <Repeat />
      </SortableHeader>
    ),
    cell: ({ row }) => {
      const interval = row.original.interval;
      const recurrenceType = row.original.recurrenceType as PeriodUnit;
      const unit = recurrenceType.toLowerCase();
      return (
        <div className="text-sm">
          {interval === 1
            ? unit === "day"
              ? "Daily"
              : unit === "week"
                ? "Weekly"
                : unit === "month"
                  ? "Monthly"
                  : unit === "year"
                    ? "Yearly"
                    : `Every ${unit}`
            : `Every ${interval} ${unit}s`}
        </div>
      );
    },
    meta: {
      skeleton: <Skeleton className="h-4 w-14" />,
    },
  },
  {
    accessorKey: "timesPerPeriod",
    header: ({ column }) => (
      <SortableHeader column={column}>Times/Period</SortableHeader>
    ),
    cell: ({ row }) => {
      const times = row.getValue("timesPerPeriod") as number;
      return <div className="text-sm">{times}x</div>;
    },
    meta: {
      skeleton: <Skeleton className="h-4 w-8" />,
    },
  },
  {
    accessorKey: "byWeekdays",
    header: "Weekdays",
    cell: ({ row }) => {
      const weekdays = row.getValue("byWeekdays") as number[];
      if (!weekdays || weekdays.length === 0)
        return <div className="text-sm">-</div>;

      const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
      const sortedDays = [...weekdays].sort((a, b) => a - b);
      const dayLabels = sortedDays.map((day) => dayNames[day]);

      return (
        <div className="flex gap-1">
          {dayLabels.map((d) => (
            <Badge key={d} variant="outline" className="rounded-full text-xs">
              {d}
            </Badge>
          ))}
        </div>
      );
    },
    meta: {
      skeleton: (
        <div className="flex gap-1">
          <Skeleton className="h-[22px] w-8 rounded-full" />
          <Skeleton className="h-[22px] w-8 rounded-full" />
          <Skeleton className="h-[22px] w-8 rounded-full" />
        </div>
      ),
    },
  },
  {
    accessorKey: "preferredTime",
    header: ({ column }) => (
      <SortableHeader column={column}>Preferred Time</SortableHeader>
    ),
    cell: ({ row }) => {
      const preferredTime = row.getValue("preferredTime") as Date | null;
      return (
        <div className="text-sm">
          {preferredTime ? format(new Date(preferredTime), "HH:mm") : "-"}
        </div>
      );
    },
    meta: {
      skeleton: <Skeleton className="h-4 w-12" />,
    },
  },
  {
    accessorKey: "durationMinutes",
    header: ({ column }) => (
      <SortableHeader column={column}>
        <Timer />
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
      skeleton: <Skeleton className="h-4 w-12" />,
    },
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <SortableHeader column={column}>
        <AlertOctagon />
      </SortableHeader>
    ),
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
    meta: {
      skeleton: <Skeleton className="h-[22px] w-[22px] rounded-full" />,
    },
  },
];
