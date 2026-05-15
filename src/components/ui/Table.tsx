'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  headerClassName?: string;
  cellClassName?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  dense?: boolean;
  compactRows?: boolean;
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  onSort,
  sortKey,
  sortOrder,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  dense = false,
  compactRows = false,
}: TableProps<T>) {
  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const headerPadding = dense ? 'px-2 py-1.5' : 'px-6 py-3';
  const cellPadding = dense
    ? 'px-2 py-1.5'
    : compactRows
      ? 'px-6 py-2'
      : 'px-6 py-4';

  if (loading) {
    return (
      <div className="w-full overflow-hidden rounded-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="bg-gray-100 h-12 w-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-50 h-16 w-full border-t border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-gray-200">
      <div className="w-full">
        <table className="w-full divide-y divide-gray-200 table-auto">
          <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  headerPadding,
                  'text-xs font-medium text-gray-500 uppercase tracking-wider',
                  alignClasses[column.align || 'left'],
                  column.sortable && 'cursor-pointer hover:bg-gray-100 select-none',
                  column.headerClassName
                )}
                style={{ width: column.width }}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className={cn(
                  'flex items-center gap-1',
                  column.align === 'right' && 'justify-end',
                  column.align === 'center' && 'justify-center',
                  column.sortable && !column.align && 'justify-between'
                )}>
                  <span>{column.header}</span>
                  {column.sortable && getSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-12 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  'hover:bg-gray-50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      cellPadding,
                      'whitespace-nowrap text-sm text-gray-900 truncate',
                      alignClasses[column.align || 'left'],
                      column.cellClassName
                    )}
                  >
                    {column.render
                      ? column.render(row)
                      : row[column.key] ?? '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
