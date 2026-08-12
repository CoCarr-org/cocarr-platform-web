'use client'
import React from 'react'
import useBreadcrumb from './useBreadcrumb'

// Reusable page scaffold so every screen reads as one system instead of a
// different layout per page:
//
//   ┌ navigation header — breadcrumb, title, subtitle, primary actions ┐
//   ├ tabs (optional)     — sections WITHIN this record                 ┤
//   ├ filter header (opt) — search / filters / actions for the data     ┤
//   └ content             — the actual data UI                          ┘
//
// All three bands above the content are ONE sticky block, so the thing that
// tells you where you are and the controls that change what you are looking at
// both stay put while the data scrolls under them. A filter bar that scrolls
// away is a filter bar you have to scroll back up to change.
//
// Detail screens use the same scaffold via `tabs`, so a record's sections sit
// exactly where a list's filters do rather than being a second layout.
//
// Adopt this on a page by wrapping its body:
//
//   <PageLayout title='Customers' subtitle='…' breadcrumb={['User Management','Customers']}
//     actions={<button className='btn-md'>Add</button>}
//     filters={<><SearchBox/><StatusChips/></>}>
//     {table}
//   </PageLayout>
//
// The filters row is where searches/filters/actions that belong to the data
// below live — keeping them out of the header keeps the header clean.
export default function PageLayout({
  title,
  subtitle,
  breadcrumb,
  actions,
  filters,
  tabs,
  children,
  maxWidth = 'max-w-7xl',
  contentClassName = '',
}) {
  // An explicit `breadcrumb` wins; otherwise it is resolved from the nav, so a
  // page gets the right trail without every caller repeating it — and cannot
  // disagree with the sidebar when a label changes.
  const derived = useBreadcrumb()
  const crumbs = Array.isArray(breadcrumb) && breadcrumb.length > 0 ? breadcrumb : derived

  return (
    // `min-w-0` so a wide child (a table, a long unbroken id) cannot stretch
    // this box and push the page past the viewport — the content's own
    // scroll containers handle the overflow instead.
    <div className='min-h-full min-w-0'>
      <div className='sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100'>
        <div className={`${maxWidth} mx-auto px-6 pt-5 pb-4`}>
          <div className='flex items-start justify-between gap-4 flex-wrap'>
            <div className='min-w-0'>
              {crumbs.length > 0 && (
                <nav className='flex items-center gap-1.5 text-[11px] text-[#959595] mb-1'>
                  {crumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className='text-gray-300'>/</span>}
                      <span className={i === crumbs.length - 1 ? 'text-[#757575] font-medium' : ''}>
                        {crumb}
                      </span>
                    </React.Fragment>
                  ))}
                </nav>
              )}
              <h1 className='text-xl font-bold text-[#1a1a1a] leading-tight capitalize'>{title}</h1>
              {subtitle && <p className='text-sm text-[#757575] mt-0.5'>{subtitle}</p>}
            </div>
            {actions && <div className='flex items-center gap-2 shrink-0'>{actions}</div>}
          </div>
        </div>

        {tabs && (
          <div className='border-t border-gray-50'>
            <div className={`${maxWidth} mx-auto px-6`}>{tabs}</div>
          </div>
        )}

        {filters && (
          <div className='border-t border-gray-50 bg-[#fafafa]'>
            <div className={`${maxWidth} mx-auto px-6 py-3`}>
              {/* flex-wrap, not nowrap: on a narrow window the controls stack
                  instead of running off the side of the screen. */}
              <div className='flex items-center gap-3 flex-wrap'>{filters}</div>
            </div>
          </div>
        )}
      </div>

      <div className={`${maxWidth} mx-auto min-w-0 px-6 py-6 ${contentClassName}`}>{children}</div>
    </div>
  )
}
