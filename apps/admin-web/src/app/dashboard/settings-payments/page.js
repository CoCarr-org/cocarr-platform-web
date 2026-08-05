'use client'
import React from 'react'
import { SettingsGroupPanel } from '@cocarr/ui'
export default function SettingsPayments() {
  return <SettingsGroupPanel group='payments' title='Payments' note={'Gateway credentials live in environment variables and are never editable here — see Settings › Integrations for their status.'} />
}
