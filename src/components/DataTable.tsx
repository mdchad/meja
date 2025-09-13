import { useMemo, useState, memo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
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
import { DataTableFilterCommand } from '@/components/DataTableFilterCommand';
import { useAppStore } from '@/lib/store';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils.ts';

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
    setPageSize,
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
            if (isSorted === 'asc') return <ArrowUp className="size-3.5 stroke-blue-500" />;
            if (isSorted === 'desc') return <ArrowDown className="size-3.5 stroke-blue-500" />;
            return <ArrowUpDown className="size-3.5" />;
          };

          return (
            <Button
              variant="ghost"
              className="h-auto p-2 font-medium hover:bg-transparent w-full cursor-pointer select-none"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              <div className="flex items-center gap-4 w-full select-none">
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
          type: getColumnType(tableData[0]?.[key]),
        },
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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    // getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    enableColumnResizing: true,
    enableColumnFilters: true,
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

  const handleRefresh = async () => {
    await loadTableData(currentPage);
  };

  if (!selectedCollection) {
    return (
      <div className="min-h-[calc(100vh-50vh)] flex items-end justify-center">
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
    <div className="flex flex-col w-full h-full relative p-4">
      <div className="mb-4 flex-shrink-0">
        {/*<div className="flex items-center justify-between mb-4">*/}
        {/*  <div>*/}
        {/*    <h2 className="text-lg font-semibold">{selectedCollection}</h2>*/}
        {/*    <p className="text-sm text-muted-foreground">*/}
        {/*      {totalCount} documents{' '}*/}
        {/*      {isQueryActive && <span className="text-green-600">(filtered)</span>}*/}
        {/*    </p>*/}
        {/*  </div>*/}
        {/*</div>*/}

        {/* Query Input */}
        {/*<div className="mb-4">*/}
        {/*  <QueryInput />*/}
        {/*</div>*/}

        {/* Advanced Filter Command */}
        <div className="mb-4">
          <DataTableFilterCommand table={table} />
        </div>

        {/* Local Search within results */}
        {/*<div className="flex items-center justify-end mb-2">*/}
        {/*  <Input*/}
        {/*    placeholder="Search in results..."*/}
        {/*    value={globalFilter ?? ''}*/}
        {/*    onChange={e => setGlobalFilter(e.target.value)}*/}
        {/*    className="max-w-sm"*/}
        {/*  />*/}
        {/*</div>*/}
      </div>

      {/* Results Counter */}
      {selectedCollection && (
        <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {isQueryActive ? (
              <span className="flex items-center gap-1">
                <Filter className="h-4 w-4 text-green-600" />
                <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
                <span>Documents found</span>
                {totalCount === 0 && <span className="text-orange-600">(no matches)</span>}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>
                <span>documents in {selectedCollection}</span>
              </span>
            )}
          </div>
          <div className="text-xs">
            {currentPage > 1 && (
              <span>Showing page {currentPage} of {Math.ceil(totalCount / pageSize)}</span>
            )}
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            size="sm"
            variant="ghost"
            title="Refresh collection data"
            className="cursor-pointer rounded-none"
          >
            <RotateCcw className="size-4 stroke-[#e56f00]" />
          </Button>
        </div>
      )}
      
      <div
        className={cn(
          "w-full border overflow-hidden relative",
          table.getState().columnSizingInfo.isResizingColumn ? 'select-none' : '',
          isLoading && 'opacity-30'
        )}
      >
        {isLoading ? (
          <div className="absolute flex-1 flex items-center justify-center top-1/2 left-1/2">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin stroke-black" />
              {/*<p className="text-black">Loading collection data...</p>*/}
            </div>
          </div>
        ) : null}
        <div className="max-h-[calc(100vh-275px)] overflow-auto">
          <Table
            className={cn(
              "border-separate border-spacing-0",
              table.getState().columnSizingInfo.isResizingColumn ? 'select-none' : ''
            )}
            style={{
              ...columnSizeVars,
              width: table.getCenterTotalSize(),
              tableLayout: 'fixed',
            }}
          >
            <TableHeader className="[&_tr]:border-b sticky top-0 z-20 bg-tint-300">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead
                      {...{
                        key: header.id,
                        colSpan: header.colSpan,
                        className: 'relative select-none bg-tint-300 border-b border-tint-100',
                        style: {
                          width: `calc(var(--header-${header.id}-size) * 1px)`,
                        },
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      <div
                        {...{
                          onDoubleClick: () => header.column.resetSize(),
                          onMouseDown: header.getResizeHandler(),
                          onTouchStart: header.getResizeHandler(),
                          className: `absolute bottom-2 h-6 cursor-ew-resize right-2 px-2`,
                          style: {
                            transform:
                              columnResizeMode === 'onEnd' && header.column.getIsResizing()
                                ? `translateX(${
                                    table.getState().columnSizingInfo.deltaOffset ?? 0
                                  }px)`
                                : '',
                          },
                        }}
                      >
                        <div className="w-px bg-gray-200/50 h-full shrink-0"></div>
                      </div>
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
        
        {/* Empty Results Indicator */}
        {!isLoading && tableData && tableData.length === 0 && isQueryActive && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium mb-1">No results found</p>
              <p className="text-xs">
                Your filter returned no matching documents. The filter is still active.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between space-x-2 py-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            {totalCount === 0 && isQueryActive ? (
              "No results found"
            ) : (
              `Page ${currentPage} of ${totalPages}`
            )}
          </p>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">Rows per page</p>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
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
function DataTableBody({ table }: { table: TanStackTable<any>; columns: any[] }) {
  return (
    <TableBody>
      {table.getRowModel().rows.map(row => (
        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
          {row.getVisibleCells().map(cell => {
            const cellValue = flexRender(cell.column.columnDef.cell, cell.getContext());
            const originalValue = cell.getValue();

            // Only create tooltip if the content might be truncated
            const shouldShowTooltip =
              typeof originalValue === 'string' && originalValue.length > 100;
            const tooltipContent = shouldShowTooltip ? originalValue : String(cellValue);

            return (
              <TableCell
                key={cell.id}
                className="truncate px-4 border-gray-100 text-neutral-600"
                // title={tooltipContent} // Show full content in tooltip
                style={{
                  width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                }}
              >
                {cellValue}
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </TableBody>
  );
}

// Memoized table body component that only re-renders when data changes
const MemoizedTableBody = memo(
  DataTableBody,
  (prev, next) => prev.table.options.data === next.table.options.data
);
