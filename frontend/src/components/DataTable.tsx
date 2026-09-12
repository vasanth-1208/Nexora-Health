import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<T extends { _id?: string; id?: string }>({
  columns,
  data,
  searchPlaceholder = 'Search records...',
  searchFilter,
  pageSize = 8,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return data;
    return data.filter((item) => searchFilter(item, searchQuery.toLowerCase()));
  }, [data, searchQuery, searchFilter]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Search & Filter Header */}
      {searchFilter && (
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="relative w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-750 focus:outline-none focus:border-healthcare-500 transition"
            />
          </div>
          <span className="text-[11px] font-bold text-slate-400">
            Total: {filteredData.length} records
          </span>
        </div>
      )}

      {/* Table Body with Responsive Horizontal Scroll */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`py-3 px-4 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 italic">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, rowIdx) => (
                <tr key={row._id || row.id || rowIdx} className="hover:bg-slate-50/60 transition">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`py-3 px-4 align-middle ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : col.accessor
                        ? String(row[col.accessor] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30 font-bold">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex space-x-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
