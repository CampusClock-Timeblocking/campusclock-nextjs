"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { type Habit, PeriodUnit } from "@prisma/client";
import { format } from "date-fns";

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
    accessorKey: "active",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Active
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const active = row.getValue("active") as boolean;
      return (
        <div className="text-sm">
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              active
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      );
    },
  },
  {
    id: "recurrence",
    accessorFn: (row) => `${row.interval} ${row.recurrenceType}`,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Recurrence
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
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
  },
  {
    accessorKey: "timesPerPeriod",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Times/Period
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const times = row.getValue("timesPerPeriod") as number;
      return <div className="text-sm">{times}x</div>;
    },
  },
  {
    accessorKey: "byWeekdays",
    header: "Weekdays",
    cell: ({ row }) => {
      const weekdays = row.getValue("byWeekdays") as number[];
      if (!weekdays || weekdays.length === 0)
        return <div className="text-sm">-</div>;

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const sortedDays = [...weekdays].sort((a, b) => a - b);
      const dayLabels = sortedDays.map((day) => dayNames[day]);

      return <div className="text-sm">{dayLabels.join(", ")}</div>;
    },
  },
  {
    accessorKey: "preferredTime",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Preferred Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const preferredTime = row.getValue("preferredTime") as Date | null;
      return (
        <div className="text-sm">
          {preferredTime ? format(new Date(preferredTime), "HH:mm") : "-"}
        </div>
      );
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
];
