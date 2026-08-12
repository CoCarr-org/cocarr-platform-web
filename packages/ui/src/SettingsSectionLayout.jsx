'use client'
import React, { useState } from 'react'
import PageLayout from './PageLayout'

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
    // The section's own tab bar goes in PageLayout's `tabs` band, so it sits
    // exactly where a list's filters do and stays put while the panel scrolls.
    // It used to scroll away with the title, which on a long settings panel
    // meant scrolling back up to switch tab.
    <PageLayout
      title={title}
      tabs={(
        <div className='flex w-full overflow-x-auto'>
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
      )}
    >
      <div className='bg-white rounded-md'>
        {activeItem?.content}
      </div>
    </PageLayout>
  )
}
