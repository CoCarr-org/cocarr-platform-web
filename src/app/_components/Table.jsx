import React, { useMemo } from 'react';
import { useTable, useFilters, useSortBy, usePagination, useGlobalFilter, useReactTable } from '@tanstack/react-table';

// Define your table component
function Table({ columns, data }) {
  // Initialize table instance
  const tableInstance = useReactTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0 }, // Initial page index
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  // Destructure table instance
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    state: { pageIndex, pageSize, globalFilter },
    setGlobalFilter,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    pageCount,
    gotoPage,
  } = tableInstance;

  // Memoize the table columns and render only when they change
  const renderColumns = useMemo(() => {
    return headerGroups.map(headerGroup => (
      <tr {...headerGroup.getHeaderGroupProps()}>
        {headerGroup.headers.map(column => (
          <th {...column.getHeaderProps(column.getSortByToggleProps())}>
            {column.render('Header')}
            {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
            {/* Add a filtering UI */}
            <div>{column.canFilter ? column.render('Filter') : null}</div>
          </th>
        ))}
      </tr>
    ));
  }, [headerGroups]);

  // Render the table
  return (
    <>
      {/* Global filter */}
      <div>
        <input
          value={globalFilter || ''}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Search..."
        />
      </div>
      {/* Table */}
      <table {...getTableProps()}>
        <thead>{renderColumns}</thead>
        <tbody {...getTableBodyProps()}>
          {page.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Pagination */}
      <div>
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>{' '}
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>{' '}
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>{' '}
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>{' '}
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <span>
          | Go to page:{' '}
          <input
            type="number"
            defaultValue={pageIndex + 1}
            onChange={e => {
              const pageNumber = e.target.value ? Number(e.target.value) - 1 : 0;
              gotoPage(pageNumber);
            }}
            style={{ width: '50px' }}
          />
        </span>{' '}
      </div>
    </>
  );
}

export default Table;
