'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { LIMIT, getDateTimeFormat } from '@cocarr/shared-utils'
import { Pagination } from '@cocarr/ui'
import ScheduleTimeline, {
  STATE_LABEL, STATE_TONE, TimelineLegend, scheduleState,
} from '../../../availability-schedule/_components/ScheduleTimeline'
import { EmptyState, Explainer, ListState, Pill } from '@/app/_components/ui'

// Vehicle › Availability — this car's windows.
//
// IT USED TO SHOW EVERY OTHER CAR'S. The fetch was
// `GET /admin/schedule?populate=true&offset=…&limit=…` with no `vehicleId`, so
// on a vehicle detail page it listed the whole platform's schedules under a
// heading that said "Vehicles". Anyone checking whether THIS car was free read
// somebody else's calendar. `vehicleId` is a real server-side filter and is
// sent now.
//
// It also carried a full Add/Edit Vehicle popup — a vehicle editor inside an
// availability tab — whose submit handler posted to `/vehicle` and, on failure,
// indexed into `error.response.data.error[<first key>]`, which throws inside
// the catch. Editing a vehicle belongs on the vehicle, not here.

export default function VehicleAvailability() {
  const { id } = useParams()
  const [schedules, setSchedules] = useState([])
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/schedule', {
        params: { populate: true, offset, limit: LIMIT, vehicleId: id },
      })
      setSchedules(res.data?.schedules || [])
      setCount(res.data?.count || 0)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load this vehicle's availability."))
    } finally {
      setLoading(false)
    }
  }, [id, offset])

  useEffect(() => { load() }, [load])

  return (
    <div className='w-full'>
      <div className='flex items-center gap-3 flex-wrap mb-4'>
        <span className='text-xs text-[#959595]'>
          {loading ? 'Loading…' : `${count} window${count === 1 ? '' : 's'}`}
        </span>
        <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
      </div>

      <ListState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={schedules.length === 0}
        empty={(
          <EmptyState
            title='No availability windows'
            message='This car cannot be booked until the host opens a window for it, however it is approved.'
          />
        )}
      >
        <div className='mb-3'><TimelineLegend /></div>

        <div className='space-y-3'>
          {schedules.map((s) => {
            const state = scheduleState(s)
            const blocks = Array.isArray(s.scheduleBlocks) ? s.scheduleBlocks : []
            return (
              <div key={s.id} className='bg-white border border-gray-100 rounded-lg p-4'>
                <div className='flex items-start justify-between gap-4 flex-wrap mb-3'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <p className='text-sm font-medium text-[#1a1a1a]'>
                        {getDateTimeFormat(s.startTime)} → {getDateTimeFormat(s.endTime)}
                      </p>
                      <Pill tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Pill>
                    </div>
                    <p className='text-[11px] text-[#959595] mt-0.5'>
                      {blocks.length} block{blocks.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Link href={`/dashboard/availability-schedule/${s.id}`}
                    className='text-xs font-semibold text-[#454545] hover:text-[#151515] shrink-0'>
                    Open →
                  </Link>
                </div>
                <ScheduleTimeline schedule={s} />
              </div>
            )
          })}
        </div>

        <div className='mt-4'>
          <Explainer>
            Windows are the host&apos;s availability. Approval and the host&apos;s on/off switch are separate
            gates — all three must line up before a rider can book.
          </Explainer>
        </div>
      </ListState>
    </div>
  )
}
