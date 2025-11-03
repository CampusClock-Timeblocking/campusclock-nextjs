"use client";

import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { DataTable } from "./data-table";

interface Props<T> {
  columns: ColumnDef<T>[];
  skeletonRows?: number;
}
export function DataTableSkeleton<T>({ columns, skeletonRows = 10 }: Props<T>) {
  const table = useReactTable({
    data: [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <DataTable table={table} isLoading={true} skeletonRows={skeletonRows} />
  );
}
