'use client'
import React from 'react'
import Header from '@/app/_components/Header'
import ActivityLogViewer from '@/app/_components/ActivityLogViewer'

export default function LiveActivity() {
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Live Activity'} RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3'>
        Recent admin actions across the platform. Booking/payment/approval events will appear here once those endpoints also record to the activity log — today only admin, permission and content changes do.
      </p>
      <ActivityLogViewer />
    </div>
  )
}
