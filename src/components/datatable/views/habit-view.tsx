import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { Habit } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "../data-table";
import { useDialog } from "@/providers/dialog-provider";
import { ButtonGroup } from "@/components/ui/button-group";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import {
  useDeleteManyHabits,
  useUpdateManyHabitsMutations,
} from "@/hooks/mutations/habit";
import { UpdateHabitDialog } from "@/components/item-dialogs/dialogs/habit";
import { ActivityViewSkeleton } from "./activities-skeleton";
import { ColumnVisibility } from "../column-visibility";

interface Props {
  columns: ColumnDef<Habit>[];
  data: Habit[];
  isLoading?: boolean;
}

interface ViewProps {
  columns: ColumnDef<Habit>[];
  data: Habit[] | undefined;
  isLoading?: boolean;
}

export function HabitView({ columns, data, isLoading }: ViewProps) {
  if (isLoading || !data) {
    return <ActivityViewSkeleton columns={columns} />;
  }

  return <View data={data} columns={columns} />;
}

function View({ columns, data }: Props) {
  const { showDialog } = useDialog();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedIds = selectedRows.map((row) => row.original.id);

  const deleteMutation = useDeleteManyHabits();

  const updateManyActiveStatus = useUpdateManyHabitsMutations();
  const getCommonActiveStatus = () => {
    if (selectedRows.length === 0) return null;
    const first = selectedRows[0]?.original.active;
    const allSame = selectedRows.every((r) => r.original.active === first);
    return allSame ? first : null;
  };

  const toggleActiveStatus = () => {
    const commonStatus = getCommonActiveStatus();
    const newStatus = commonStatus === null ? true : !commonStatus;

    updateManyActiveStatus.mutate({
      id: selectedIds,
      data: { active: newStatus },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        {selectedIds.length > 0 && (
          <ButtonGroup>
            <Button
              size="sm"
              variant="outline"
              className="text-blue-500 hover:text-blue-500"
              onClick={() => setRowSelection({})}
            >
              {selectedIds.length} selected
            </Button>
            <Button size="sm" variant="outline" onClick={toggleActiveStatus}>
              <Power />
              {getCommonActiveStatus() === true ? "Deactivate" : "Activate"}
            </Button>
            <AsyncButton
              size="sm"
              variant="outline"
              onClick={() => deleteMutation.mutate({ ids: selectedIds })}
              isLoading={deleteMutation.isPending}
            >
              <Trash2 className="text-destructive hover:text-destructive" />
            </AsyncButton>
          </ButtonGroup>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Input
            placeholder="Filter habits..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <ColumnVisibility table={table} />
        </div>
      </div>
      <DataTable
        table={table}
        onRowClick={(habit) => showDialog(<UpdateHabitDialog habit={habit} />)}
      />
    </div>
  );
}
