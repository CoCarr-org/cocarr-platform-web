'use client'
import React from 'react'

// An availability window, drawn.
//
// A schedule is a range the host has opened, with BLOCKS carved out of it —
// bookings, or time the host has taken back. As two dates and a count ("3
// schedule blocks") that is unreadable: the question ops actually has is
// "is this car free next Tuesday?", and no amount of reading a block count
// answers it. As a bar it is answerable at a glance.
//
// Blocks are CLAMPED to the window rather than dropped. A block that starts
// before the window or ends after it is a real and interesting state — usually
// a booking that outlived the availability it was made against — and silently
// not drawing it would hide exactly the case worth seeing. It is drawn at the
// edge with a marker instead.

const BLOCK_TONE = {
  booked: 'bg-[#ECC032]',
  blocked: 'bg-[#454545]',
  unavailable: 'bg-[#454545]',
  cancelled: 'bg-gray-300',
}

const pct = (n) => `${Math.max(0, Math.min(100, n))}%`

export function scheduleState(schedule) {
  if (schedule?.deleted) return 'deleted'
  const now = Date.now()
  const start = new Date(schedule?.startTime).getTime()
  const end = new Date(schedule?.endTime).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 'unknown'
  if (end < now) return 'completed'
  if (start > now) return 'upcoming'
  return 'active'
}

export const STATE_TONE = {
  active: 'good',
  upcoming: 'info',
  completed: 'neutral',
  deleted: 'bad',
  unknown: 'neutral',
}

export const STATE_LABEL = {
  active: 'Open now',
  upcoming: 'Upcoming',
  completed: 'Finished',
  deleted: 'Withdrawn',
  unknown: 'Unknown dates',
}

export default function ScheduleTimeline({ schedule, height = 'h-7', showNow = true }) {
  const start = new Date(schedule?.startTime).getTime()
  const end = new Date(schedule?.endTime).getTime()
  const span = end - start

  if (!Number.isFinite(span) || span <= 0) {
    return (
      <div className={`${height} rounded bg-gray-100 flex items-center px-2`}>
        <span className='text-[10px] text-[#959595]'>No usable window on this schedule</span>
      </div>
    )
  }

  const blocks = Array.isArray(schedule?.scheduleBlocks) ? schedule.scheduleBlocks : []
  const now = Date.now()
  const nowPct = ((now - start) / span) * 100

  return (
    <div className={`relative ${height} rounded bg-[#eef7f0] overflow-hidden border border-gray-100`}>
      {blocks.map((b, i) => {
        const bs = new Date(b.startTime).getTime()
        const be = new Date(b.endTime).getTime()
        if (!Number.isFinite(bs) || !Number.isFinite(be) || be <= bs) return null

        const left = ((bs - start) / span) * 100
        const width = ((be - bs) / span) * 100
        const overflowsStart = left < 0
        const overflowsEnd = left + width > 100

        return (
          <div
            key={i}
            title={`${b.status || 'blocked'} · ${new Date(bs).toLocaleString()} → ${new Date(be).toLocaleString()}`}
            className={`absolute top-0 bottom-0 ${BLOCK_TONE[b.status] || BLOCK_TONE.blocked} ${
              overflowsStart ? 'border-l-2 border-l-red-500' : ''
            } ${overflowsEnd ? 'border-r-2 border-r-red-500' : ''}`}
            style={{ left: pct(left), width: pct(Math.min(width, 100 - Math.max(0, left))) }}
          />
        )
      })}

      {/* Where "now" falls in the window. Without it an open window and a
          finished one look identical. */}
      {showNow && nowPct >= 0 && nowPct <= 100 && (
        <div className='absolute top-0 bottom-0 w-px bg-red-500' style={{ left: pct(nowPct) }} title='Now' />
      )}
    </div>
  )
}

export function TimelineLegend() {
  return (
    <div className='flex items-center gap-3 flex-wrap text-[10px] text-[#757575]'>
      <span className='flex items-center gap-1'>
        <i className='inline-block w-3 h-3 rounded-sm bg-[#eef7f0] border border-gray-200' /> Available
      </span>
      <span className='flex items-center gap-1'>
        <i className='inline-block w-3 h-3 rounded-sm bg-[#ECC032]' /> Booked
      </span>
      <span className='flex items-center gap-1'>
        <i className='inline-block w-3 h-3 rounded-sm bg-[#454545]' /> Blocked by host
      </span>
      <span className='flex items-center gap-1'>
        <i className='inline-block w-px h-3 bg-red-500' /> Now
      </span>
      <span className='flex items-center gap-1'>
        <i className='inline-block w-3 h-3 rounded-sm border-l-2 border-l-red-500 bg-gray-200' /> Extends past the window
      </span>
    </div>
  )
}
