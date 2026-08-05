import React from 'react'

// Honest "not built yet" state for Settings items that don't have real
// functionality behind them yet (no backend model/endpoint exists) — used
// across Administration/General/Security/Notifications/Integrations/
// Storage/Localization/Audit/About until each is actually implemented.
export default function SettingsPlaceholder({ title, description }) {
  return (
    <div className='flex flex-col items-center justify-center text-center py-16 px-6'>
      <p className='text-sm font-semibold tracking-tight mb-1'>{title}</p>
      <p className='text-xs text-[#757575] max-w-sm'>
        {description || 'This setting isn\'t built yet — no backend support exists for it today.'}
      </p>
    </div>
  )
}
