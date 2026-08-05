'use client'
import React, { useState } from 'react'
import Header from './Header'

// Shared shell for the 9 top-level Settings sections (Administration,
// General, Security, Notifications, Integrations, Storage, Localization,
// Audit, About) — each is one sidebar destination whose own items are an
// in-page tab bar, not further sidebar nesting (the sidebar only supports
// two levels: a group and its flat children).
//
// `items` is [{key, label, content}] — `content` is whatever that tab
// should render (a real component, or <SettingsPlaceholder .../>).
export default function SettingsSectionLayout({ title, items }) {
  const [active, setActive] = useState(items[0]?.key)
  const activeItem = items.find((item) => item.key === active) || items[0]

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={title} RightContent={() => null} />

      <div className='flex bg-[#fff] rounded-md overflow-hidden w-full bg-[#fafafa] border-b border-slate-200'>
        {items.map((item) => (
          <button
            key={item.key}
            type='button'
            onClick={() => setActive(item.key)}
            className={`block items-center ${active === item.key ? 'bg-[#ECC032] text-black' : 'bg-transparent text-[#454545]'}`}
          >
            <div className='flex items-center text-center py-3 px-3'>
              <p className='text-[0.8em] font-medium tracking-tight'>{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      <div className='bg-white'>
        {activeItem?.content}
      </div>
    </div>
  )
}
