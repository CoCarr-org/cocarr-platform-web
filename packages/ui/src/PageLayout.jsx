'use client'
import React from 'react'

// Reusable page scaffold so every screen reads as one system instead of a
// different layout per page:
//
//   ┌ navigation header — breadcrumb, title, subtitle, primary actions ┐
//   ├ sub-header (optional) — search / filters / actions for the data  ┤
//   └ content — the page body                                          ┘
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
  children,
  maxWidth = 'max-w-7xl',
  contentClassName = '',
}) {
  return (
    <div className='min-h-full'>
      <div className='sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100'>
        <div className={`${maxWidth} mx-auto px-6 pt-5 pb-4`}>
          <div className='flex items-start justify-between gap-4 flex-wrap'>
            <div className='min-w-0'>
              {Array.isArray(breadcrumb) && breadcrumb.length > 0 && (
                <nav className='flex items-center gap-1.5 text-[11px] text-[#959595] mb-1'>
                  {breadcrumb.map((crumb, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <span className='text-gray-300'>/</span>}
                      <span className={i === breadcrumb.length - 1 ? 'text-[#757575] font-medium' : ''}>
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

        {filters && (
          <div className='border-t border-gray-50 bg-[#fafafa]'>
            <div className={`${maxWidth} mx-auto px-6 py-3`}>
              <div className='flex items-center gap-3 flex-wrap'>{filters}</div>
            </div>
          </div>
        )}
      </div>

      <div className={`${maxWidth} mx-auto px-6 py-6 ${contentClassName}`}>{children}</div>
    </div>
  )
}
