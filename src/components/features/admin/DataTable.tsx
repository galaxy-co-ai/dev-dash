'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnSizingState,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  Columns3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: string[];
  editable?: boolean;
  hiddenColumns?: string[];
  readOnlyColumns?: string[];
  onEdit?: (record: T) => void;
  onSave?: (record: T) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  pageSize?: number;
}

// Format column names to be more readable
function formatColumnName(col: string): string {
  // Handle camelCase and snake_case
  return col
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatCellValue(value: unknown, column: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  
  // Format dates nicely
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  
  // Format date strings
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  
  // Format objects
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > 40 ? str.slice(0, 40) + '…' : str;
  }
  
  // Format long strings
  if (typeof value === 'string' && value.length > 60) {
    return value.slice(0, 60) + '…';
  }
  
  // Format numbers with commas
  if (typeof value === 'number' && !Number.isNaN(value)) {
    // Check if it's a currency-like column
    if (column.toLowerCase().includes('price') || 
        column.toLowerCase().includes('amount') || 
        column.toLowerCase().includes('cost') ||
        column.toLowerCase().includes('total')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  }
  
  return String(value);
}

function formatId(id: string): string {
  if (!id || id.length < 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  editable = false,
  hiddenColumns = ['rawResponse', 'pricingData', 'metadata'],
  readOnlyColumns = ['id', 'createdAt', 'updatedAt'],
  onEdit,
  onSave,
  onDelete,
  pageSize = 25,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const visibility: VisibilityState = {};
    hiddenColumns.forEach((col) => {
      visibility[col] = false;
    });
    return visibility;
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenColumns.includes(col)),
    [columns, hiddenColumns]
  );

  const columnHelper = createColumnHelper<T>();

  const tableColumns = useMemo(() => {
    const cols: ColumnDef<T, unknown>[] = visibleColumns.map((col) =>
      columnHelper.accessor((row) => row[col], {
        id: col,
        size: 150, // Default size
        minSize: 80,
        maxSize: 500,
        header: ({ column }) => (
          <button
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors text-xs font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            <span>{formatColumnName(col)}</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-primary" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3.5 w-3.5 text-primary" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-30" />
            )}
          </button>
        ),
        cell: ({ row, getValue }) => {
          const value = getValue();
          const isEditing = editingId === (row.original.id as string);
          const isReadOnly = readOnlyColumns.includes(col);

          if (isEditing && !isReadOnly) {
            return (
              <Input
                type="text"
                className="h-8 text-[13px] bg-background"
                value={String(editingData[col] ?? '')}
                onChange={(e) =>
                  setEditingData((prev) => ({ ...prev, [col]: e.target.value }))
                }
              />
            );
          }

          // ID columns - monospace, muted, truncated (handles id, leadId, userId, etc.)
          if (col === 'id' || col.toLowerCase().endsWith('id')) {
            const strValue = String(value ?? '');
            // Only format if it looks like a UUID or long ID
            if (strValue.length > 12) {
              return (
                <code 
                  className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded" 
                  title={strValue}
                >
                  {formatId(strValue)}
                </code>
              );
            }
            return (
              <span className="text-foreground">
                {formatCellValue(value, col)}
              </span>
            );
          }

          // Email column
          if (col.toLowerCase().includes('email')) {
            return (
              <span className="text-foreground" title={String(value)}>
                {formatCellValue(value, col)}
              </span>
            );
          }

          // Status-like columns
          if (col.toLowerCase().includes('status')) {
            const statusValue = String(value).toLowerCase();
            const statusColors: Record<string, string> = {
              // Success states
              active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              selected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              // Warning/pending states
              pending: 'bg-amber-50 text-amber-700 border-amber-200',
              preliminary: 'bg-slate-50 text-slate-600 border-slate-200',
              draft: 'bg-slate-50 text-slate-600 border-slate-200',
              // Info/processing states
              processing: 'bg-blue-50 text-blue-700 border-blue-200',
              'in progress': 'bg-blue-50 text-blue-700 border-blue-200',
              inprogress: 'bg-blue-50 text-blue-700 border-blue-200',
              // Error states
              failed: 'bg-red-50 text-red-700 border-red-200',
              error: 'bg-red-50 text-red-700 border-red-200',
              rejected: 'bg-red-50 text-red-700 border-red-200',
              // Neutral states
              cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
              inactive: 'bg-gray-50 text-gray-600 border-gray-200',
            };
            const colorClass = statusColors[statusValue] || 'bg-slate-50 text-slate-600 border-slate-200';
            
            return (
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                colorClass
              )}>
                {formatCellValue(value, col)}
              </span>
            );
          }

          // Date columns
          if (col.toLowerCase().includes('date') || 
              col.toLowerCase().includes('created') || 
              col.toLowerCase().includes('updated')) {
            return (
              <span className="text-muted-foreground tabular-nums">
                {formatCellValue(value, col)}
              </span>
            );
          }

          // Default cell
          return (
            <span className="text-foreground" title={String(value)}>
              {formatCellValue(value, col)}
            </span>
          );
        },
      })
    );

    if (editable) {
      cols.push(
        columnHelper.display({
          id: 'actions',
          size: 100,
          minSize: 80,
          maxSize: 120,
          enableResizing: false,
          header: () => null,
          cell: ({ row }) => {
            const record = row.original;
            const recordId = record.id as string;
            const isEditing = editingId === recordId;

            const handleSave = async () => {
              if (!onSave) return;
              setSaving(true);
              try {
                await onSave(editingData as T);
                setEditingId(null);
                setEditingData({});
              } finally {
                setSaving(false);
              }
            };

            const handleDelete = async () => {
              if (!onDelete) return;
              if (!confirm('Delete this record?')) return;
              setDeleting(recordId);
              try {
                await onDelete(recordId);
              } finally {
                setDeleting(null);
              }
            };

            const handleEdit = () => {
              setEditingId(recordId);
              setEditingData({ ...record });
              onEdit?.(record);
            };

            const handleCancel = () => {
              setEditingId(null);
              setEditingData({});
            };

            return (
              <div className="flex items-center justify-end gap-1">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={handleEdit}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={handleDelete}
                      disabled={deleting === recordId}
                    >
                      {deleting === recordId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            );
          },
        })
      );
    }

    return cols;
  }, [
    visibleColumns,
    columnHelper,
    editable,
    editingId,
    editingData,
    readOnlyColumns,
    saving,
    deleting,
    onEdit,
    onSave,
    onDelete,
  ]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnSizing,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Columns3 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {visibleColumns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={columnVisibility[col] !== false}
                  onCheckedChange={(checked) =>
                    setColumnVisibility((prev) => ({ ...prev, [col]: checked }))
                  }
                  className="text-sm"
                >
                  {formatColumnName(col)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full caption-bottom text-[13px]"
            style={{ width: table.getCenterTotalSize() }}
          >
            <thead className="bg-muted/30 [&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border/50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-11 px-3 text-left align-middle text-xs font-medium text-muted-foreground whitespace-nowrap relative group"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      
                      {/* Resize Handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                            "opacity-0 group-hover:opacity-100 hover:bg-primary/50 transition-opacity",
                            header.column.getIsResizing() && "opacity-100 bg-primary"
                          )}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 transition-colors hover:bg-muted/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-3 py-3 align-middle text-foreground"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={table.getAllColumns().length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} rows
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
