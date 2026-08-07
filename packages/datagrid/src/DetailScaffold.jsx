'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@cocarr/api-sdk'

// The shared furniture of a detail page: a back link, cards, label/value rows
// and a status pill.
//
// Not a generic "RecordDetail" component driven by the list's field config.
// That was the obvious move and it is the wrong one: a detail page earns its
// place by showing what the LIST cannot — the rows related to this one, the
// actions valid from its current state, the reason an action is unavailable.
// A component fed the same field config can only ever render a read-only copy
// of the edit dialog, which is strictly worse than the dialog. So the layout is
// shared and the content stays hand-written per entity.

export const Row = ({ label, children }) => (
  <div className='flex items-baseline gap-3 py-1.5'>
    <span className='text-[11px] text-[#959595] w-36 shrink-0'>{label}</span>
    <span className='text-sm text-[#252525] min-w-0'>
      {children === null || children === undefined || children === '' ? '—' : children}
    </span>
  </div>
)

export const Card = ({ title, action, children }) => (
  <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
    <div className='flex items-center justify-between gap-3 mb-3'>
      <p className='font-semibold text-sm'>{title}</p>
      {action}
    </div>
    {children}
  </div>
)

export const Pill = ({ tone = 'neutral', children }) => {
  const tones = {
    good: 'bg-green-100 text-green-700',
    warn: 'bg-amber-100 text-amber-700',
    bad: 'bg-red-100 text-red-700',
    info: 'bg-purple-100 text-purple-700',
    neutral: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${tones[tone] || tones.neutral}`}>
      {children}
    </span>
  )
}

export const BackLink = ({ href, children }) => (
  <Link href={href} className='text-[11px] text-[#757575] hover:underline'>← {children}</Link>
)

// A list of related rows, with the three states that matter kept distinct:
// still loading, genuinely empty, and "we could not find out". Collapsing the
// third into the second is the failure this exists to prevent — it reports an
// outage as a fact about the data.
export const RelatedList = ({ items, empty, unavailable = 'Could not load this.', children }) => {
  if (items === null || items === undefined) return <p className='text-xs text-[#959595]'>Loading…</p>
  if (items === 'unavailable') return <p className='text-xs text-amber-700'>{unavailable}</p>
  if (!items.length) return <p className='text-xs text-[#757575]'>{empty}</p>
  return items.map(children)
}

// RESOLVE FOREIGN KEYS TO NAMES.
//
// The workspace CRUD endpoints fetch a single row with `findByPk` and no
// includes, so a detail response carries `departmentId` and no department. A
// page that renders the raw value shows a uuid, which tells the reader nothing
// and looks like a bug — so the referenced collection is fetched once and used
// as a lookup, the same way the edit dialog already resolves its dropdowns.
//
// Returns `(id) => label | null`. Null when the id is unknown OR the lookup has
// not landed yet; callers fall back to their own placeholder rather than
// briefly flashing a uuid.
export function useLookup(api, endpoint, labelKey = 'name') {
  const [map, setMap] = useState({})
  useEffect(() => {
    let live = true
    createClient(api).get(`${endpoint}?limit=500`)
      .then((res) => {
        if (!live) return
        const rows = res.data?.data || res.data || []
        const next = {}
        rows.forEach((r) => { next[r.id] = r[labelKey] })
        setMap(next)
      })
      // A failed lookup means labels stay unresolved, which the callers already
      // render as "—". It must never take the page down.
      .catch(() => {})
    return () => { live = false }
  }, [api, endpoint, labelKey])
  return (id) => (id ? map[id] || null : null)
}

export const errMsg = (e, fallback) => e?.response?.data?.error?.message
  || e?.response?.data?.error
  || e?.message
  || fallback

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : null)
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : null)
export const personName = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ') || p?.email || null
