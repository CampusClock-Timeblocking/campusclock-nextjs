import type { Column } from "@tanstack/react-table";
import { Button } from "../ui/button";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
} from "lucide-react";

interface SortableHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  children: React.ReactNode;
}

export function SortableHeader<TData, TValue>({
  column,
  children,
}: SortableHeaderProps<TData, TValue>) {
  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="hover:bg-accent-nested -ml-2 !h-7 !px-2 !py-1.5 text-sm"
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="ml-1 size-[0.7rem]" />
      ) : sorted === "desc" ? (
        <ArrowDown className="ml-1 size-[0.7rem]" />
      ) : (
        <ChevronsUpDown className="text-muted-foreground ml-1 size-[0.7rem]" />
      )}
    </Button>
  );
}
