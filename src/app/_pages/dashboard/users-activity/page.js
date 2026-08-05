'use client'
import React from 'react'
import Header from '@/app/_components/Header'
import ResourceManager from '@/app/_components/ResourceManager'

export default function UsersActivity() {
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Activity & Login History'} RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3'>
        Sign-in records. <strong>Nothing writes to this table yet</strong> — the auth middleware would need to record sessions. Firebase itself holds the authoritative sign-in history in the meantime.
      </p>
      <ResourceManager
        endpoint='/admin/login-history'
        readOnly
        searchPlaceholder='Search by admin, email or IP'
        emptyText='No sign-ins recorded yet.'
        columns={[
          { key: 'adminName', label: 'Admin' },
          { key: 'adminEmail', label: 'Email' },
          { key: 'ipAddress', label: 'IP' },
          { key: 'success', label: 'Success' },
          { key: 'createdAt', label: 'When' },
        ]}
        fields={[]}
      />
    </div>
  )
}
