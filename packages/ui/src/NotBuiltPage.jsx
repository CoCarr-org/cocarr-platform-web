'use client'
import React from 'react'
import Header from './Header'

// The spec's standard page shell, rendered for pages the specification lists
// but which have no backend behind them yet. Deliberately explicit about that
// rather than showing an empty table that looks like "no data" — those are
// very different things to whoever is looking at it.
export default function NotBuiltPage({ title, moduleLabel, does, needs }) {
  return (
    <div className='max-w-7xl mx-auto'>
      {moduleLabel && (
        <p className='text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-1 pt-2'>{moduleLabel}</p>
      )}
      <Header title={title} RightContent={() => null} />
      <div className='bg-white border border-gray-100 rounded-md mt-4 px-8 py-14 text-center'>
        <p className='text-sm font-semibold tracking-tight mb-1'>{title}</p>
        {does && <p className='text-xs text-[#757575] max-w-md mx-auto mb-3'>{does}</p>}
        <p className='text-xs text-[#b06a00] bg-amber-50 border border-amber-200 rounded px-3 py-2 inline-block'>
          Not built yet — {needs || 'no backend data source exists for this page.'}
        </p>
      </div>
    </div>
  )
}
