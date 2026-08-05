'use client'
import React from 'react'
import { Header } from '@cocarr/ui'
import ActivityLogViewer from '@/app/_components/ActivityLogViewer'

export default function AdminActivityLogs() {
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Admin Activity Logs'} RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3'>
        Changes made to admin accounts and permissions. The wider Audit Logs page shows every logged entity.
      </p>
      <ActivityLogViewer entityType='Admin' />
    </div>
  )
}
