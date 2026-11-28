import React from 'react';

export const Table = ({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  keyField = '_id',
  onRowClick,
  className = '',
}) => {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-xs ${className}`}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px] font-sans">
          <thead>
            <tr className="border-b border-gray-200/80 bg-gray-50/60">
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={col.width ? { width: col.width } : undefined}
                  className={`py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap align-middle ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.headerClassName || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className="py-4 px-6">
                      <div className="h-4 bg-gray-200/70 rounded-md w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 px-6 text-center text-sm text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row[keyField] || rIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  style={{ animationDelay: `${Math.min(rIdx, 10) * 20}ms` }}
                  className={`animate-row-enter h-[68px] transition-colors duration-150 hover:bg-blue-50/40 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.key || cIdx}
                      style={col.width ? { width: col.width } : undefined}
                      className={`py-3.5 px-5 text-[13px] font-normal text-gray-700 align-middle ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.cellClassName || ''}`}
                    >
                      {col.render ? col.render(row, rIdx) : row[col.key]}
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
};

export default Table;

