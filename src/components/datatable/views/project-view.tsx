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
import { Input } from "@/components/ui/input";
import { Boxes, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, getSelectedIdsFromState } from "../data-table";
import SelectCreate from "@/components/select-create";
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
  useDelteManyProjectMutation,
  useUpdateManyProjectsMutation,
} from "@/hooks/mutations/project";
import type { ProjectWithParent } from "../columns/project-columns";
import { ColumnVisibility } from "../column-visibility";

interface Props {
  columns: ColumnDef<ProjectWithParent>[];
  data: ProjectWithParent[];
  isLoading?: boolean;
}

export function ProjectView({ columns, data, isLoading }: Props) {
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

  const selectedIds = getSelectedIdsFromState(table.getState().rowSelection);

  const delteMutation = useDelteManyProjectMutation();
  const updateMany = useUpdateManyProjectsMutation();

  const getCommonProject = (selectedRows: Row<ProjectWithParent>[]) => {
    if (selectedRows.length === 0) return null;
    const first = selectedRows[0]?.original.parentId;
    if (!first) return null;
    const allSame = selectedRows.every((r) => r.original.parentId === first);
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
                  Parent project
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <SelectCreate
                  value={getCommonProject(table.getSelectedRowModel().rows)}
                  multi={false}
                  options={data.map((p) => ({
                    label: p.title,
                    value: p.id,
                  }))}
                  onChange={(change) =>
                    updateMany.mutate({
                      ids: selectedIds,
                      data: { parentId: change },
                    })
                  }
                  onMore={(option) => {
                    const clicked = data.find((p) => p.id === option.value);
                    if (clicked)
                      showDialog(<UpdateProjectDialog project={clicked} />);
                  }}
                  onCreate={(input) =>
                    showDialog(
                      <CreateProjectDialog
                        initialValues={{ title: input }}
                        createCallback={(newProject) =>
                          updateMany.mutate({
                            ids: selectedIds,
                            data: { parentId: newProject.id },
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
            placeholder="Filter projects..."
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
        onRowClick={(project) =>
          showDialog(<UpdateProjectDialog project={project} />)
        }
        isLoading={isLoading}
        skeletonRows={10}
      />
    </div>
  );
}
