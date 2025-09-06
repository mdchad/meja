import { useMemo, useState } from 'react';
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

function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (value instanceof Date) return value.toISOString();
    
    // Check if it's a MongoDB ObjectId in { "$oid": "..." } format
    if (value && typeof value === 'object' && value.$oid && typeof value.$oid === 'string') {
      return `ObjectId("${value.$oid}")`;
    }
    
    return JSON.stringify(value);
  }
  
  return String(value);
}

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
              className="h-auto p-0 font-medium hover:bg-transparent w-full cursor-pointer"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              <div className="w-[180px] flex items-center justify-between">
                <span className="truncate">{key}</span>
                {getSortIcon()}
              </div>
            </Button>
          );
        },
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="w-[180px] truncate" title={formatValue(value)}>
              {formatValue(value)}
            </div>
          );
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
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

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
            <div className="w-full overflow-x-scroll flex-1 border rounded-md">
              <div className="max-h-[calc(100vh-300px)]">
                <Table className="">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="w-[180px] bg-tint-300">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="w-[180px]">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No documents found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
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