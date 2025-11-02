import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableSkeleton } from "../data-table-skeleton";

interface Props<T> {
  columns: ColumnDef<T>[];
}

export function ActivityViewSkeleton<T>({ columns }: Props<T>) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-[216px]" />
          <Skeleton className="h-9 w-[116px]" />
        </div>
      </div>
      <DataTableSkeleton columns={columns} />
    </div>
  );
}
