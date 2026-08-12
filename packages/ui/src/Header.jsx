'use client'
import React from 'react'
import { IoSearch } from 'react-icons/io5'
import Pagination from './Pagination'

// Shared page header. Rewritten to match the PageLayout template so every page
// that still uses <Header/> inherits the same clean look without being touched:
//
//   ┌ title (+ optional parent breadcrumb)                    · actions ┐
//   ├ sub-header: search on the left, pagination on the right          ┤ (only when search/pagination)
//
// It is STICKY, like PageLayout's. The navigation header tells you where you
// are and the filter header changes what you are looking at — both are useless
// once scrolled past, and on a long list the fix was to scroll back to the top
// to change a filter. Fixing it here rather than per page is the point of the
// component: 22 screens get the behaviour without being touched.
//
// It stays width-fluid so it composes inside whatever container the page
// already provides, and paints an opaque background so rows pass UNDER it
// rather than showing through. New pages should prefer PageLayout directly.
//
// ⚠ Sticky needs this to be a normal block child of the scrolling column. A
// page that wraps it in `flex justify-between` makes it a flex item and the
// stickiness silently does nothing — two pages did exactly that and were
// unwrapped rather than left looking arbitrarily different.
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

  return (
    <div className='sticky top-0 z-20 w-full min-w-0 border-b border-gray-100 bg-[#F5F5F5]/95 backdrop-blur-sm'>
      <div className='flex items-start justify-between gap-4 flex-wrap pt-3 pb-3'>
        <div className='min-w-0'>
          {parent ? <p className='text-[11px] text-[#959595] mb-0.5'>{parent}</p> : null}
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
