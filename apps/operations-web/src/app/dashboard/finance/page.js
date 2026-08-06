'use client'
import React from 'react'
import { SectionLanding } from '@cocarr/layouts'

// Index for the '/dashboard/finance' grouping segment. It had no page, so the URL 404'd —
// see SectionLanding for why that matters and why the list comes from the
// server-filtered nav rather than a hardcoded one here.
export default function Page() {
  return (
    <SectionLanding
      title='Finance'
      description='Payments, settlements, refunds, invoices and bank accounts.'
    />
  )
}
