'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { LIMIT, getDateTimeFormat } from '@cocarr/shared-utils'
import { PageLayout, Pagination } from '@cocarr/ui'
import ScheduleTimeline, {
  STATE_LABEL, STATE_TONE, TimelineLegend, scheduleState,
} from './_components/ScheduleTimeline'
import {
  EmptyState, Explainer, ListState, Pill, SearchBox, useDebounced,
} from '@/app/_components/ui'

// Scheduling — the availability windows hosts have opened, and what is carved
// out of them.
//
// WHAT THIS SCREEN WAS. Titled "Vehicles", with an "Add Vehicle" button on it,
// rendering a hand-rolled unstyled `<table>` of two dates and the NUMBER of
// schedule blocks. Its error handler read `error.response.data.error.message`,
// which throws inside the catch on any network failure. A row said a car was
// available from one date to another and that three blocks existed somewhere
// inside — which does not answer the only question anyone opens this screen
// with, namely whether a given car is free at a given time.
//
// So the row is a timeline. See ScheduleTimeline for why blocks are clamped
// rather than dropped.
//
// PER-ROW STATE IS DERIVED; THE FILTERS ARE NOT.
//
// "Open now / Upcoming / Finished" is computed from each schedule's own dates,
// which is honest — it is a fact about that row. Offering the same thing as a
// FILTER would not be: the endpoint paginates server-side and has no date
// filter, so the chip would silently mean "…among the 25 rows on this page".
// That is the same class of lie as the vehicles list's search box, which was
// bound to nothing. `status` is filtered server-side because it is a real
// column, and search goes to the server for the same reason.

export default function Scheduling() {
  const [searchText, setSearchText] = useState('')
  const search = useDebounced(searchText)
  const [offset, setOffset] = useState(0)

  const [schedules, setSchedules] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/schedule', {
        params: { populate: true, offset, limit: LIMIT, searchTerm: search || undefined },
      })
      setSchedules(res.data?.schedules || [])
      setCount(res.data?.count || 0)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load schedules.'))
    } finally {
      setLoading(false)
    }
  }, [offset, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setOffset(0) }, [search])

  return (
    <PageLayout
      title='Scheduling'
      subtitle='Availability windows hosts have opened, and the bookings and blocks inside them.'
      breadcrumb={['Operations', 'Vehicles', 'Scheduling']}
      filters={(
        <>
          <SearchBox value={searchText} onChange={setSearchText} placeholder='Search by vehicle name or number' />
          <span className='text-xs text-[#959595]'>
            {loading ? 'Loading…' : `${count} window${count === 1 ? '' : 's'}`}
          </span>
          <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
        </>
      )}
    >
      <ListState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={schedules.length === 0}
        empty={(
          <EmptyState
            title={search ? 'No schedules match that search' : 'No availability windows yet'}
            message='A window is created when a host opens their car for a period. Until one exists the car cannot be booked, however it is approved.'
          />
        )}
      >
        <div className='mb-3'><TimelineLegend /></div>

        <div className='space-y-3'>
          {schedules.map((s) => {
            const state = scheduleState(s)
            const blocks = Array.isArray(s.scheduleBlocks) ? s.scheduleBlocks : []
            const booked = blocks.filter((b) => b.status === 'booked').length
            return (
              <div key={s.id} className='bg-white border border-gray-100 rounded-lg p-4'>
                <div className='flex items-start justify-between gap-4 flex-wrap mb-3'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <p className='text-sm font-semibold text-[#1a1a1a]'>
                        {s.vehicle?.vehicleName || 'Unknown vehicle'}
                      </p>
                      <span className='text-xs text-[#959595] font-mono'>{s.vehicle?.vehicleNumber || '—'}</span>
                      <Pill tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Pill>
                    </div>
                    <p className='text-[11px] text-[#757575] mt-1'>
                      {getDateTimeFormat(s.startTime)} → {getDateTimeFormat(s.endTime)}
                    </p>
                  </div>

                  <div className='flex items-center gap-4 shrink-0'>
                    <div className='text-right'>
                      <p className='text-sm font-semibold text-[#1a1a1a]'>{blocks.length}</p>
                      <p className='text-[10px] text-[#959595]'>
                        block{blocks.length === 1 ? '' : 's'}{booked > 0 ? ` · ${booked} booked` : ''}
                      </p>
                    </div>
                    <Link href={`/dashboard/availability-schedule/${s.id}`}
                      className='text-xs font-semibold text-[#454545] hover:text-[#151515]'>
                      Open →
                    </Link>
                  </div>
                </div>

                <ScheduleTimeline schedule={s} />
              </div>
            )
          })}
        </div>

        <div className='mt-4'>
          <Explainer>
            A window is availability, not approval. A car with an open window still takes no bookings unless it
            is approved and the host has it switched on — both shown on the Vehicles list.
          </Explainer>
        </div>
      </ListState>
    </PageLayout>
  )
}
