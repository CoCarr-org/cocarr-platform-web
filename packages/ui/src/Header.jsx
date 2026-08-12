'use client'
import React from 'react'
import { IoSearch } from 'react-icons/io5'
import Pagination from './Pagination'
import useBreadcrumb from './useBreadcrumb'

export default function Header({
  title,
  RightContent,
  parent = '',
  search = false,
  pagination = false,
  count,
  offset,
  setOffset,
  searchText,
  setSearchText,
  searchPlaceholder = 'Search',
}) {
  const hasSubheader = search || pagination
  const crumbs = useBreadcrumb(parent)

  return (
    <div className='sticky top-0 z-20 w-full min-w-0 border-b border-gray-100 bg-[#F5F5F5]/95 backdrop-blur-sm'>
      <div className='flex items-start justify-between gap-4 flex-wrap pt-3 pb-3'>
        <div className='min-w-0'>
          {crumbs.length > 0 && (
            <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-[11px] text-[#959595] mb-1'>
              {crumbs.map((crumb, i) => (
                <React.Fragment key={`${crumb}-${i}`}>
                  {i > 0 && <span className='text-gray-300'>/</span>}
                  <span className={i === crumbs.length - 1 ? 'text-[#757575] font-medium' : ''}>{crumb}</span>
                </React.Fragment>
              ))}
            </nav>
          )}
          {title ? (
            <h1 className='text-xl font-bold text-[#1a1a1a] leading-tight capitalize m-0'>{title}</h1>
          ) : null}
        </div>
        {RightContent ? (
          <div className='flex items-center gap-2 shrink-0'>
            <RightContent />
          </div>
        ) : null}
      </div>

      {hasSubheader && (
        <div className='flex items-center gap-3 flex-wrap border-t border-gray-100 bg-[#fafafa] px-3 py-2.5 rounded-t-md'>
          {search && (
            <div className='relative flex-1 min-w-[200px] max-w-sm'>
              <IoSearch className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#959595]' />
              <input
                value={searchText || ''}
                onChange={(e) => setSearchText && setSearchText(e.target.value)}
                placeholder={searchPlaceholder}
                className='w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm bg-white outline-none focus:border-[#ECC032]'
              />
            </div>
          )}
          {pagination && (
            <div className='ml-auto'>
              <Pagination count={count} offset={offset} setOffset={setOffset} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
