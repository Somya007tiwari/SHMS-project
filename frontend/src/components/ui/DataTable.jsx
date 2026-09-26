import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DataTable = ({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  emptyMessage = 'No records found',
  emptyIcon: EmptyIcon
}) => {
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-14 skeleton rounded-xl`} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className={`rounded-xl overflow-hidden border
        ${isDark ? 'border-gray-700' : 'border-slate-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr className={isDark ? 'bg-gray-800' : 'bg-slate-50'}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider
                      ${isDark ? 'text-gray-400' : 'text-slate-500'}`}
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-slate-50'}`}>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      {EmptyIcon && <EmptyIcon size={40} className="text-slate-300" />}
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>
                        {emptyMessage}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={row.id || i}
                    className={`transition-colors
                      ${isDark ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-blue-50/40'}`}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                        {col.render ? col.render(row[col.key], row) : row[col.key] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className={`p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all
                ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                    ${pagination.page === page
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className={`p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all
                ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
