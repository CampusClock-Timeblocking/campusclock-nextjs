"use client";

import { type Table as TableState, flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReactNode } from "react";
import { Skeleton } from "../ui/skeleton";
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    skeleton?: ReactNode;
  }
}

interface DataTableProps<TData> {
  table: TableState<TData>;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  loadingRows?: number;
}

export function DataTable<TData>({
  table,
  onRowClick,
  isLoading = false,
  loadingRows = 10,
}: DataTableProps<TData>) {
  const defaultSkeleton = <Skeleton className="h-4 w-full max-w-[200px]" />;

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`}>
                {table.getVisibleFlatColumns().map((column) => (
                  <TableCell key={column.id}>
                    {column.columnDef.meta?.skeleton ?? defaultSkeleton}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => onRowClick?.(row.original)}
                className="cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={table.getAllColumns().length}
                className="h-24 text-center"
              >
                No data.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
