'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { getDateTimeFormat, getValidDateFormat } from '@cocarr/shared-utils'
import ScheduleTimeline, {
  STATE_LABEL, STATE_TONE, TimelineLegend, scheduleState,
} from '../_components/ScheduleTimeline'
import {
  DetailHeader, ErrorState, Explainer, Field, FieldGrid, LoadingBlock, Pill, SectionCard, Stat, StatRow,
} from '@/app/_components/ui'

// One availability window, and every block inside it.
//
// THIS SCREEN DID NOT EXIST. `[id]/page.js` rendered an empty `<div>` inside a
// commented-out grid, so the route resolved and displayed nothing at all — and
// the `[id]/layout.js` wrapped around it was a copy of the VEHICLE detail
// layout: it fetched `/admin/vehicle/{scheduleId}` and its tab bar linked to
// `/dashboard/vehicles/{scheduleId}`, feeding a schedule id into vehicle
// routes. The layout and its two cloned Rides/Reviews tabs are deleted rather
// than restyled; a schedule has neither.
//
// NEEDS cocarr-core-api's `getScheduleById` FIX. That query includes `Vehicle`
// with no alias while the association is declared `as: 'vehicle'`, so Sequelize
// throws before returning — the endpoint 500s for every id. This screen reports
// that failure honestly instead of rendering blank, which is what the old one
// did on the same error.

const BLOCK_TONE = {
  booked: 'brand',
  blocked: 'neutral',
  unavailable: 'neutral',
  cancelled: 'bad',
}

const duration = (from, to) => {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return '—'
  const hours = Math.round(ms / 3600000)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return `${days} day${days === 1 ? '' : 's'}${rest ? ` ${rest}h` : ''}`
}

export default function ScheduleDetail() {
  const { id } = useParams()
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await coreApi().get(`/admin/schedule/${id}`)
      setSchedule(res.data || null)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this schedule.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <div className='max-w-7xl mx-auto px-6 py-6'><LoadingBlock label='Loading schedule…' /></div>
  if (error) {
    return (
      <div className='max-w-7xl mx-auto px-6 py-6'>
        <ErrorState message={error} onRetry={load} />
      </div>
    )
  }
  if (!schedule) return null

  const vehicle = schedule.vehicle || schedule.Vehicle || null
  const state = scheduleState(schedule)
  const blocks = [...(Array.isArray(schedule.scheduleBlocks) ? schedule.scheduleBlocks : [])]
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  const booked = blocks.filter((b) => b.status === 'booked')

  return (
    <div className='max-w-7xl mx-auto px-6'>
      <DetailHeader
        backHref='/dashboard/availability-schedule'
        backLabel='All schedules'
        title={vehicle?.vehicleName || 'Availability window'}
        subtitle={`${getDateTimeFormat(schedule.startTime)} → ${getDateTimeFormat(schedule.endTime)}`}
        pills={<Pill tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Pill>}
        meta={[
          { label: 'Vehicle', value: vehicle?.vehicleNumber },
          { label: 'Window', value: duration(schedule.startTime, schedule.endTime) },
          { label: 'Schedule id', value: schedule.id },
        ]}
        actions={schedule.vehicleId ? (
          <Link href={`/dashboard/vehicles/${schedule.vehicleId}`} className='btn-md'>Open vehicle</Link>
        ) : null}
      />

      <div className='py-6'>
        <StatRow cols={4}>
          <Stat label='Blocks' value={blocks.length} hint='Bookings and host holds' />
          <Stat label='Booked' value={booked.length} />
          <Stat label='Window length' value={duration(schedule.startTime, schedule.endTime)} />
          <Stat label='Listing status' value={schedule.status || 'available'} />
        </StatRow>

        <SectionCard
          title='The window'
          description='Green is open time. Everything drawn on it is time already committed.'
        >
          <ScheduleTimeline schedule={schedule} height='h-10' />
          <div className='mt-3'><TimelineLegend /></div>

          <div className='mt-5'>
            <FieldGrid cols={4}>
              <Field label='Opens' value={getDateTimeFormat(schedule.startTime)} capitalize={false} />
              <Field label='Closes' value={getDateTimeFormat(schedule.endTime)} capitalize={false} />
              <Field label='Created' value={getValidDateFormat(schedule.createdAt)} />
              <Field label='Withdrawn' value={schedule.deleted ? 'Yes' : 'No'} />
            </FieldGrid>
          </div>

          {schedule.deleted && (
            <div className='mt-4'>
              <Explainer tone='warn'>
                This window was withdrawn by the host. Bookings already made inside it are unaffected — they
                are on the blocks below and still need to be honoured.
              </Explainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title='Blocks'
          description='Every period carved out of the window, in the order they occur.'
        >
          {blocks.length === 0 ? (
            <p className='text-sm text-[#757575]'>
              Nothing booked or blocked. The whole window is open.
            </p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
                    <th className='px-3 py-2 font-semibold'>From</th>
                    <th className='px-3 py-2 font-semibold'>To</th>
                    <th className='px-3 py-2 font-semibold'>Length</th>
                    <th className='px-3 py-2 font-semibold'>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b, i) => {
                    // A block reaching outside the window is usually a booking
                    // that outlived the availability it was made against —
                    // worth flagging on the row, not just at the bar's edge.
                    const outside = new Date(b.startTime) < new Date(schedule.startTime)
                      || new Date(b.endTime) > new Date(schedule.endTime)
                    return (
                      <tr key={i} className='border-b border-gray-50'>
                        <td className='px-3 py-2 text-xs'>{getDateTimeFormat(b.startTime)}</td>
                        <td className='px-3 py-2 text-xs'>{getDateTimeFormat(b.endTime)}</td>
                        <td className='px-3 py-2 text-xs text-[#757575]'>{duration(b.startTime, b.endTime)}</td>
                        <td className='px-3 py-2'>
                          <Pill tone={BLOCK_TONE[b.status] || 'neutral'}>{b.status || 'blocked'}</Pill>
                          {outside && (
                            <span className='text-[11px] text-red-600 ml-2'>extends past the window</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
