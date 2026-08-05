'use client'
import React, { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table'

export default function DataTable({ 
  columns, 
  data, 
  frozenColumns = [], // Array of column IDs to freeze (e.g., ['name', 'id'])
  enableSorting = true,
  enableFiltering = false,
  className = '',
  headerClassName = '',
  rowClassName = '',
  onRowClick = null,
}) {
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    enableSorting,
    enableColumnResizing: false,
    columnResizeMode: 'onChange',
  })

  // Check if a column should be frozen
  const isColumnFrozen = (column) => {
    return frozenColumns.includes(column.id) || 
           frozenColumns.includes(column.columnDef.accessorKey) ||
           column.columnDef.sticky === 'left'
  }

  // Get frozen column styles
  const getFrozenStyles = useMemo(() => {
    const headerGroups = table.getHeaderGroups()
    if (headerGroups.length === 0) return {}
    
    const stylesMap = {}
    let cumulativeLeft = 0
    
    headerGroups[0].headers.forEach((header, index) => {
      const columnDef = header.column.columnDef
      const shouldFreeze = frozenColumns.includes(header.id) || 
                           frozenColumns.includes(columnDef.accessorKey) ||
                           columnDef.sticky === 'left'
      
      if (shouldFreeze) {
        stylesMap[header.id] = {
          position: 'sticky',
          left: `${cumulativeLeft}px`,
          zIndex: cumulativeLeft === 0 ? 40 : 30, // Higher z-index for headers
          backgroundColor: '#ffffff',
        }
        // Add shadow for all except the first frozen column
        if (cumulativeLeft > 0) {
          stylesMap[header.id].boxShadow = '2px 0 4px rgba(0,0,0,0.1)'
        }
        cumulativeLeft += header.getSize() || columnDef.size || 150
      }
    })
    
    return stylesMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozenColumns, data?.length, columns?.length])

  const getColumnStyles = (columnId) => {
    return getFrozenStyles[columnId] || {}
  }

  // Enhanced frozen column styles with sticky header support
  const getHeaderCellStyles = (header) => {
    const baseStyles = getColumnStyles(header.id)
    // If column is frozen, ensure it stays above other elements
    if (baseStyles.position === 'sticky') {
      return {
        ...baseStyles,
        top: '0',
      }
    }
    return baseStyles
  }

  return (
    <div className={`w-full h-full flex flex-col border border-gray-200 rounded-md overflow-hidden ${className}`}>
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-white border-b border-gray-200">
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      minWidth: header.getSize(),
                      ...getHeaderCellStyles(header),
                    }}
                    className={`px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-white ${headerClassName}`}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-2 ${
                          enableSorting && header.column.getCanSort()
                            ? 'cursor-pointer select-none hover:text-gray-900'
                            : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {enableSorting && header.column.getCanSort() && (
                          <span className="ml-1">
                            {{
                              asc: ' ▲',
                              desc: ' ▼',
                            }[header.column.getIsSorted()] ?? ' ⇅'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-gray-500 bg-white"
                >
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={`border-b border-gray-100 transition-colors ${
                    rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${rowClassName}`}
                >
                  {row.getVisibleCells().map((cell, index) => {
                    const cellStyles = getColumnStyles(cell.column.id)
                    // Adjust z-index for body cells (should be lower than header cells)
                    const adjustedStyles = cellStyles.position === 'sticky' 
                      ? { ...cellStyles, zIndex: cellStyles.zIndex ? cellStyles.zIndex - 10 : 10 }
                      : cellStyles
                    return (
                      <td
                        key={cell.id}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          ...adjustedStyles,
                        }}
                        className="px-4 py-2 text-sm text-gray-900 whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

