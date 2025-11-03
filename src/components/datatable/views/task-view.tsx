import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { TaskWithProject } from "../columns/task-columns";
import { Input } from "@/components/ui/input";
import { Boxes, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, getSelectedIdsFromState } from "../data-table";
import SelectCreate from "@/components/select-create";
import { api } from "@/trpc/react";
import { useDialog } from "@/providers/dialog-provider";
import {
  CreateProjectDialog,
  UpdateProjectDialog,
} from "@/components/item-dialogs/dialogs/project";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ButtonGroup } from "@/components/ui/button-group";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import {
  useDeleteManyTasks,
  useUpdateManyTasksMutation,
} from "@/hooks/mutations/task";
import { UpdateTaskDialog } from "@/components/item-dialogs/dialogs/task";
import { ColumnVisibility } from "../column-visibility";

interface Props {
  columns: ColumnDef<TaskWithProject>[];
  data: TaskWithProject[];
  isLoading?: boolean;
}

export function TaskView({ columns, data, isLoading }: Props) {
  const { data: projects } = api.project.getAll.useQuery();
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

  const updateManyTaskMutation = useUpdateManyTasksMutation();
  const delteMutation = useDeleteManyTasks();

  const selectedIds = getSelectedIdsFromState(table.getState().rowSelection);

  const getCommonProject = (selectedRows: Row<TaskWithProject>[]) => {
    if (selectedRows.length === 0) return null;
    const first = selectedRows[0]?.original.projectId;
    if (!first) return null;
    const allSame = selectedRows.every((r) => r.original.projectId === first);
    return allSame ? first : null;
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
            <Popover modal>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Boxes />
                  Project
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <SelectCreate
                  value={getCommonProject(table.getSelectedRowModel().rows)}
                  multi={false}
                  options={
                    projects?.map((p) => ({
                      label: p.title,
                      value: p.id,
                    })) ?? []
                  }
                  onChange={(change) =>
                    updateManyTaskMutation.mutate({
                      ids: selectedIds,
                      data: { projectId: change },
                    })
                  }
                  onMore={(option) => {
                    const clicked = projects?.find(
                      (p) => p.id === option.value,
                    );
                    if (clicked)
                      showDialog(<UpdateProjectDialog project={clicked} />);
                  }}
                  onCreate={(input) =>
                    showDialog(
                      <CreateProjectDialog
                        initialValues={{ title: input }}
                        createCallback={(newProject) =>
                          updateManyTaskMutation.mutate({
                            ids: selectedIds,
                            data: { projectId: newProject.id },
                          })
                        }
                      />,
                    )
                  }
                />
              </PopoverContent>
            </Popover>
            <AsyncButton
              size="sm"
              variant="outline"
              onClick={() => delteMutation.mutate({ ids: selectedIds })}
              isLoading={delteMutation.isPending}
            >
              <Trash2 className="text-destructive hover:text-destructive" />
            </AsyncButton>
          </ButtonGroup>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Input
            placeholder="Filter tasks..."
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
        onRowClick={(task) => showDialog(<UpdateTaskDialog task={task} />)}
        isLoading={isLoading}
        skeletonRows={25}
      />
    </div>
  );
}
