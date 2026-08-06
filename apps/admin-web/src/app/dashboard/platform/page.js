'use client'
import React from 'react'
import { SectionLanding } from '@cocarr/layouts'

// Index for the '/dashboard/platform' grouping segment. It had no page, so the URL 404'd —
// see SectionLanding for why that matters and why the list comes from the
// server-filtered nav rather than a hardcoded one here.
export default function Page() {
  return (
    <SectionLanding
      title='Platform'
      description='Identity and access management for the whole platform.'
    />
  )
}
