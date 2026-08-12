'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { getValidDateFormat } from '@cocarr/shared-utils'
import {
  EmptyState, Explainer, ListState, Pill, SectionCard, Stat, StatRow,
} from '@/app/_components/ui'

// Host › Payouts — what this host is owed, and what has already been paid.
//
// THIS TAB USED TO BE A BOOKING SCREEN. It called `GET /booking/{id}` with the
// HOST's id in the booking slot, so it could only ever fail — a payment screen
// for a booking that does not exist. It is rebuilt against the two endpoints
// that answer the question the tab actually asks:
//
//   GET /payout/host/:hostId/pending   unsettled ledger rows, one per booking
//   GET /admin/settlements?hostId=…    the weekly batches, and their gateway state
//
// Both are needed because they are one story at two grains: a ledger row is one
// finished booking's share, a settlement is the Monday–Sunday batch that pays a
// group of them in a single transfer. With only one of them on screen, "why has
// this host not been paid?" is unanswerable — the money is either not batched
// yet or batched and stuck at the gateway, and those go to different people.
//
// Money renders in whole rupees to match Finance › Settlements. If that
// convention is ever wrong it is wrong in both places, which is the point of
// copying it rather than deciding again here.

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`

const SETTLEMENT_TONE = {
  pending: 'neutral',
  submitted: 'info',
  paid: 'good',
  failed: 'bad',
  on_hold: 'warn',
  cancelled: 'neutral',
}

export default function HostPayouts() {
  const { id } = useParams()

  const [pending, setPending] = useState([])
  const [settlements, setSettlements] = useState([])
  const [totals, setTotals] = useState({ netPayable: 0, paid: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    // allSettled, not all: these are two different services, and one being
    // unavailable must not blank out the other. Only a total failure is an
    // error — a partial one still leaves a usable screen.
    const [p, s] = await Promise.allSettled([
      coreApi().get(`/payout/host/${id}/pending`),
      coreApi().get('/admin/settlements', { params: { hostId: id, limit: 20 } }),
    ])

    if (p.status === 'fulfilled') {
      setPending(Array.isArray(p.value.data) ? p.value.data : (p.value.data?.data || []))
    }
    if (s.status === 'fulfilled') {
      setSettlements(s.value.data?.data || [])
      setTotals(s.value.data?.totals || { netPayable: 0, paid: 0 })
    }

    setError(p.status === 'rejected' && s.status === 'rejected'
      ? apiErrorMessage(p.reason, 'Could not load payouts for this host.')
      : '')
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const pendingTotal = pending.reduce((sum, row) => sum + Number(row.hostPayableAmount || 0), 0)

  return (
    <ListState loading={loading} error={error} onRetry={load} isEmpty={false}>
      <StatRow cols={3}>
        <Stat label='Awaiting settlement' value={money(pendingTotal)}
          hint={`${pending.length} booking${pending.length === 1 ? '' : 's'} not yet batched`} />
        <Stat label='Net payable (batched)' value={money(totals.netPayable)}
          hint='Across every settlement on record' />
        <Stat label='Paid out' value={money(totals.paid)}
          hint='Confirmed by the gateway' />
      </StatRow>

      <SectionCard
        title='Awaiting settlement'
        description='Finished bookings whose share has been calculated but not yet included in a weekly batch.'
      >
        {pending.length === 0 ? (
          <p className='text-sm text-[#757575]'>
            Nothing outstanding. A ledger row appears here when a booking finishes and is cleared for payout.
          </p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
                  <th className='px-3 py-2 font-semibold'>Booking</th>
                  <th className='px-3 py-2 font-semibold'>Gross</th>
                  <th className='px-3 py-2 font-semibold'>Commission</th>
                  <th className='px-3 py-2 font-semibold'>GST</th>
                  <th className='px-3 py-2 font-semibold'>Host payable</th>
                  <th className='px-3 py-2 font-semibold'>Calculated</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id} className='border-b border-gray-50'>
                    <td className='px-3 py-2'>
                      {row.bookingId ? (
                        <Link href={`/dashboard/rides/${row.bookingId}`}
                          className='font-mono text-xs text-[#454545] hover:text-[#151515] underline'>
                          {String(row.bookingId).slice(0, 8)}…
                        </Link>
                      ) : <span className='text-[#b5b5b5]'>—</span>}
                    </td>
                    <td className='px-3 py-2'>{money(row.totalGrossAmount)}</td>
                    <td className='px-3 py-2 text-[#757575]'>
                      −{money(row.commissionAmount)}
                      <span className='text-[11px] text-[#959595] ml-1'>({row.commissionPercentage}%)</span>
                    </td>
                    <td className='px-3 py-2 text-[#757575]'>−{money(row.gstAmount)}</td>
                    <td className='px-3 py-2 font-semibold'>{money(row.hostPayableAmount)}</td>
                    <td className='px-3 py-2 text-xs text-[#959595]'>{getValidDateFormat(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className='mt-4'>
          <Explainer>
            Commission is the rate in force when the booking finished, not the host&apos;s current rate — which is
            why an older row can show a percentage that no longer matches the Overview tab.
          </Explainer>
        </div>
      </SectionCard>

      <SectionCard
        title='Settlement history'
        description='One batch per week. A batch is a single transfer covering every eligible booking in its period.'
      >
        {settlements.length === 0 ? (
          <EmptyState
            title='No settlements yet'
            message='Batches are built by the weekly settlement run. Until one covers this host, everything stays in Awaiting settlement above.'
          />
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
                  <th className='px-3 py-2 font-semibold'>Period</th>
                  <th className='px-3 py-2 font-semibold'>Bookings</th>
                  <th className='px-3 py-2 font-semibold'>Net payable</th>
                  <th className='px-3 py-2 font-semibold'>Status</th>
                  <th className='px-3 py-2 font-semibold'>Paid</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className='border-b border-gray-50'>
                    <td className='px-3 py-2 text-xs'>
                      {getValidDateFormat(s.periodStart)} – {getValidDateFormat(s.periodEnd)}
                    </td>
                    <td className='px-3 py-2'>
                      {s.bookingCount}
                      {/* Held bookings are not lost — they roll into a later run
                          once the dispute or damage claim closes. Saying so
                          stops a short batch reading as missing money. */}
                      {s.heldBookingCount > 0 && (
                        <span className='text-[11px] text-amber-700 ml-1'>+{s.heldBookingCount} held</span>
                      )}
                    </td>
                    <td className='px-3 py-2 font-semibold'>{money(s.netPayable)}</td>
                    <td className='px-3 py-2'>
                      <Pill tone={SETTLEMENT_TONE[s.status] || 'neutral'}>
                        {String(s.status || '').replace('_', ' ')}
                      </Pill>
                      {s.failureReason && <p className='text-[11px] text-red-600 mt-1'>{s.failureReason}</p>}
                    </td>
                    <td className='px-3 py-2 text-xs text-[#959595]'>
                      {s.paidAt ? getValidDateFormat(s.paidAt) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </ListState>
  )
}
