'use client'
import React from 'react'
import { SettingsPlaceholder, SettingsSectionLayout } from '@cocarr/ui'
import AdminUsersManager from '@/app/_components/AdminUsersManager'
import ActivityLogViewer from '@/app/_components/ActivityLogViewer'

export default function SettingsAdminAccounts() {
  return (
    <SettingsSectionLayout
      title='Admin Accounts'
      items={[
        { key: 'admin-users', label: 'Admin Users', content: <AdminUsersManager /> },
        { key: 'activity', label: 'Account Activity', content: <ActivityLogViewer entityType='Admin' /> },
        { key: 'login-history', label: 'Login History', content: <SettingsPlaceholder title='Login History' description='No login-history table exists yet — Firebase Auth keeps sign-in records, but nothing here surfaces them.' /> },
      ]}
    />
  )
}
