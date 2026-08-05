'use client'
import React from 'react'
import { SettingsGroupPanel } from '@cocarr/ui'
export default function SettingsMaps() {
  return <SettingsGroupPanel group='maps' title='Maps Configuration' note={'Stored, but not yet read by the booking/pricing code — changing these does not alter live behaviour.'} />
}
