import { useMemo, useState, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnResizeMode,
  ColumnResizeDirection,
  Table as TanStackTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryInput } from '@/components/QueryInput';
import { useAppStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

function getColumnType(value: any): string {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  if (typeof value === 'object') return 'object';
  return 'text';
}

export function DataTable() {
  const {
    tableData,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    selectedCollection,
    isQueryActive,
    loadTableData,
    setPageSize
  } = useAppStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnResizeMode, setColumnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] = useState<ColumnResizeDirection>('ltr');

  // Generate columns based on data
  const columns = useMemo(() => {
    if (!tableData || tableData.length === 0) return [];

    // Get all unique keys from all documents
    const allKeys = new Set<string>();
    tableData.forEach(doc => {
      Object.keys(doc).forEach(key => allKeys.add(key));
    });

    const columnHelper = createColumnHelper<any>();

    return Array.from(allKeys).map(key => 
      columnHelper.accessor(key, {
        id: key,
        enableResizing: true,
        size: 180,
        minSize: 80,
        maxSize: 400,
        header: ({ column }) => {
          const getSortIcon = () => {
            const isSorted = column.getIsSorted();
            if (isSorted === 'asc') return <ArrowUp className="h-4 w-4 stroke-blue-500" />;
            if (isSorted === 'desc') return <ArrowDown className="h-4 w-4 stroke-blue-500" />;
            return <ArrowUpDown className="h-4 w-4" />;
          };

          return (
            <Button
              variant="ghost"
              className="h-auto p-0 font-medium hover:bg-transparent w-full cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              <div className="flex items-center justify-between w-full select-none">
                <span className="truncate">{key}</span>
                {getSortIcon()}
              </div>
            </Button>
          );
        },
        cell: ({ getValue }) => {
          const value = getValue();
          // Truncate display for performance while keeping full data intact
          if (typeof value === 'string' && value.length > 100) {
            return value.substring(0, 97) + '...';
          }
          return value;
        },
        meta: {
          type: getColumnType(tableData[0]?.[key])
        }
      })
    );
  }, [tableData]);

  const table = useReactTable({
    data: tableData || [],
    columns,
    columnResizeMode,
    columnResizeDirection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    enableColumnResizing: true,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  // Memoize column sizes to avoid expensive getSize() calls on every render
  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = async (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      await loadTableData(newPage);
    }
  };

  if (!selectedCollection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select a collection to view its data</p>
        </div>
      </div>
    );
  }

  // if (isLoading) {
  //   return (
  //     <div className="flex-1 flex items-center justify-center">
  //       <div className="text-center">
  //         <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
  //         <p className="text-muted-foreground">Loading collection data...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex-1 flex flex-col p-4 w-full">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{selectedCollection}</h2>
            <p className="text-sm text-muted-foreground">
              {totalCount} documents {isQueryActive && <span className="text-green-600">(filtered)</span>}
            </p>
          </div>
        </div>
        
        {/* Query Input */}
        <div className="mb-4">
          <QueryInput />
        </div>
        
        {/* Local Search within results */}
        <div className="flex items-center justify-end mb-2">
          <Input
            placeholder="Search in results..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </div>

      {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p className="text-muted-foreground">Loading collection data...</p>
              </div>
            </div>
          ) : (
            <div className={`w-full overflow-x-scroll flex-1 border rounded-md ${table.getState().columnSizingInfo.isResizingColumn ? 'select-none' : ''}`}>
              <div className="max-h-[calc(100vh-300px)]">
                <Table className={`${table.getState().columnSizingInfo.isResizingColumn ? 'select-none' : ''}`} style={{
                    ...columnSizeVars,
                    width: table.getCenterTotalSize(),
                    tableLayout: 'fixed',
                  }}>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          {...{
                            key: header.id,
                            colSpan: header.colSpan,
                            className: "relative select-none",
                            style: {
                              width: `calc(var(--header-${header.id}-size) * 1px)`,
                            },
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            <div
                              {...{
                                onDoubleClick: () => header.column.resetSize(),
                                onMouseDown: header.getResizeHandler(),
                                onTouchStart: header.getResizeHandler(),
                                className: `absolute top-0 h-full w-[5px] bg-black/50 cursor-col-resize select-none touch-none bg-gray-200 right-0 ${
                                  header.column.getIsResizing() ? '!bg-blue-500 !opacity-100' : ''
                                }`,
                                style: {
                                  transform:
                                    columnResizeMode === 'onEnd' &&
                                    header.column.getIsResizing()
                                      ? `translateX(${(table.getState().columnSizingInfo
                                        .deltaOffset ?? 0)
                                      }px)`
                                      : '',
                                },
                              }}
                            />
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                {/* Render memoized table body when resizing for better performance */}
                {table.getState().columnSizingInfo.isResizingColumn ? (
                  <MemoizedTableBody table={table} columns={columns} />
                ) : (
                  <DataTableBody table={table} columns={columns} />
                )}
                </Table>
              </div>
            </div>
          )
      }


      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">Rows per page</p>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 w-16 rounded border border-input bg-background px-2 text-sm"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Separate table body component for better memoization
function DataTableBody({ table, columns }: { table: TanStackTable<any>, columns: any[] }) {
  return (
    <TableBody>
      {(
        table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.getIsSelected() && "selected"}
          >
            {row.getVisibleCells().map((cell) => {
              const cellValue = flexRender(cell.column.columnDef.cell, cell.getContext());
              const originalValue = cell.getValue();
              
              // Only create tooltip if the content might be truncated
              const shouldShowTooltip = typeof originalValue === 'string' && originalValue.length > 100;
              const tooltipContent = shouldShowTooltip ? originalValue : String(cellValue);
              
              return (
                <TableCell
                  key={cell.id}
                  className="truncate"
                  title={tooltipContent} // Show full content in tooltip
                  style={{
                    width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                  }}
                >
                  {cellValue}
                </TableCell>
              );
            })}
          </TableRow>
        ))
      )}
    </TableBody>
  );
}

// Memoized table body component that only re-renders when data changes
const MemoizedTableBody = memo(
  DataTableBody,
  (prev, next) => prev.table.options.data === next.table.options.data
);