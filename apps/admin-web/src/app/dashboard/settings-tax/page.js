'use client'
import React from 'react'
import { SettingsGroupPanel } from '@cocarr/ui'
export default function SettingsTax() {
  return <SettingsGroupPanel group='tax' title='Tax Configuration' note={'Stored, but not yet read by the booking/pricing code — changing these does not alter live behaviour.'} />
}
