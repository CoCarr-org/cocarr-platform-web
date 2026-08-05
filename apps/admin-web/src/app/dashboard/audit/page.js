'use client'
import React from 'react'
import { SettingsPlaceholder, SettingsSectionLayout } from '@cocarr/ui'
import ActivityLogViewer from '@/app/_components/ActivityLogViewer'

export default function Audit() {
  return (
    <SettingsSectionLayout
      title='Audit'
      items={[
        // Unfiltered — every logged action, vs. Administration's copy of
        // this same feed which only shows Admin-entity actions. Right now
        // Admin create/update/delete are the only actions actually logged;
        // extending logActivity() to other admin mutations (vehicles,
        // bookings, offers, etc.) would show up here automatically.
        { key: 'activity-logs', label: 'Activity Logs', content: <ActivityLogViewer /> },
        { key: 'system-logs', label: 'System Logs', content: <SettingsPlaceholder title='System Logs' description='Server logs currently only go to Railway’s own console output — nothing is persisted or surfaced here.' /> },
        { key: 'error-logs', label: 'Error Logs', content: <SettingsPlaceholder title='Error Logs' /> },
      ]}
    />
  )
}
