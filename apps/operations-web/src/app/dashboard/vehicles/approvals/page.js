'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast, apiErrorMessage } from '@cocarr/notifications'
import { getValidDateFormat } from '@cocarr/shared-utils'
import { PageLayout, Modal } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'
import { DOC_PILL, DOC_LABEL } from '@/app/_helpers/vehicleStatus'
import {
  EmptyState, Explainer, ListState, Pill, Thumb,
} from '@/app/_components/ui'

// Vehicle approvals — the front door of the car-hosting flow.
//
// `?approved=false` resolves server-side to `approvalStatus: 'pending'` AND
// `isDraft: false`, so this is submissions awaiting a decision: a rejected
// vehicle is a different queue, and a draft was never submitted at all.
//
// THERE IS NO APPROVE BUTTON HERE, AND THAT IS DELIBERATE.
//
// Approve is gated on the RC, the host's PAN, the host's identity and — when
// the flag is on — four in-person checks. None of that can be judged from a
// row, and the backend refuses an approve that has not met it. A button that
// mostly errors teaches people to distrust the screen, so the queue's primary
// action is Review: it takes you to where the evidence is.
//
// Reject IS here. Turning something down needs a reason, not the evidence — a
// car photographed at night from one angle can be sent back without opening
// anything — and making that a two-page trip is what leaves queues unworked.

const REJECT_REASONS = [
  'Photos are unclear or insufficient',
  'RC does not match the vehicle details',
  'Vehicle does not meet listing standards',
  'Duplicate listing',
]

function RejectDialog({ vehicle, onCancel, onConfirm, busy }) {
  const [reason, setReason] = useState('')
  return (
    <Modal onClose={onCancel} size='sm' label='Reject vehicle' className='p-5'>
      <div>
        <h3 className='text-sm font-semibold text-[#1a1a1a]'>
          Reject {vehicle.vehicleName || vehicle.vehicleNumber}
        </h3>
        <p className='text-xs text-[#757575] mt-1'>
          The host sees this reason. Editing the vehicle resubmits it and returns it to this queue.
        </p>

        <div className='flex flex-wrap gap-2 mt-3'>
          {REJECT_REASONS.map((r) => (
            <button key={r} type='button' onClick={() => setReason(r)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                reason === r ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 text-[#757575] hover:border-gray-300'
              }`}>
              {r}
            </button>
          ))}
        </div>

        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder='Reason shown to the host'
          className='w-full mt-3 border border-gray-200 rounded-md p-2 text-sm outline-none focus:border-[#ECC032]' />

        <div className='flex justify-end gap-2 mt-4'>
          <button onClick={onCancel} className='text-xs font-semibold px-3 py-2 rounded-md border border-gray-200 text-[#454545]'>
            Cancel
          </button>
          {/* Mandatory, and the backend refuses an empty one too — so this is a
              mirror of the server rule, not a second implementation of it. */}
          <button disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim())}
            className='text-xs font-semibold px-3 py-2 rounded-md bg-red-600 text-white disabled:opacity-40'>
            {busy ? 'Rejecting…' : 'Reject vehicle'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function QueueCard({ vehicle: v, canUpdate, onReject }) {
  const cover = v.images?.find((i) => i.isCover) || v.images?.[0]
  const rcState = v.vehicleRcVerified ? 'verified' : (v.vehicleRcNumber ? 'pending' : 'missing')
  const photos = v.images?.length || 0

  return (
    <div className='bg-white border border-gray-100 rounded-lg p-4 flex gap-4 items-start'>
      <Thumb src={cover?.url} alt={v.vehicleName} className='w-32 h-24' />

      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2 flex-wrap'>
          <p className='text-sm font-semibold text-[#1a1a1a]'>
            {[v.brand?.name, v.vehicleName].filter(Boolean).join(' ') || 'Untitled vehicle'}
          </p>
          <span className='text-xs text-[#959595] font-mono'>{v.vehicleNumber}</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_PILL[rcState]}`}>
            RC {DOC_LABEL[rcState].toLowerCase()}
          </span>
          {/* Photo count is the single most common reason to send a listing
              back, so it is a pill rather than a number in a row of metadata. */}
          <Pill tone={photos === 0 ? 'bad' : photos < 3 ? 'warn' : 'neutral'}>
            {photos} photo{photos === 1 ? '' : 's'}
          </Pill>
        </div>

        <div className='text-xs text-[#757575] mt-1.5 flex flex-wrap gap-x-4 gap-y-1'>
          <span>Host: {v.host?.user?.name || v.host?.name || '—'}</span>
          {v.vehicleYear && <span>{v.vehicleYear}</span>}
          {v.vehicleFuelType && <span className='capitalize'>{v.vehicleFuelType}</span>}
          {v.createdAt && <span>Submitted {getValidDateFormat(v.createdAt)}</span>}
        </div>

        {/* Context for a resubmission — otherwise the reviewer repeats a
            rejection the host has already addressed. */}
        {v.rejectionReason && (
          <p className='text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded px-2 py-1.5'>
            Previously rejected: {v.rejectionReason}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-2 shrink-0 w-28'>
        <Link href={`/dashboard/vehicles/${v.id}/review`} className='btn-md text-center'>Review</Link>
        {canUpdate && (
          <button onClick={() => onReject(v)}
            className='text-xs font-semibold px-3 py-2 rounded-md border border-red-200 text-red-600 hover:bg-red-50'>
            Reject
          </button>
        )}
      </div>
    </div>
  )
}

export default function VehicleApprovals() {
  const canUpdate = useCan('operations.vehicles.update')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rejecting, setRejecting] = useState(null)
  const [busy, setBusy] = useState(false)

  // A review queue is worked top to bottom, so it is not paginated — but the
  // server limit is real, and a silently truncated queue reads as "we are
  // caught up". Say so when the cap is hit.
  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/vehicle', {
        params: { approved: false, populate: true, limit: LIMIT },
      })
      setRows(res.data?.vehicles || res.data?.data || [])
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load the approvals queue.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const reject = async (reason) => {
    setBusy(true)
    try {
      await coreApi().post(`/admin/vehicle/${rejecting.id}/reject`, { reason })
      InfoToast('Vehicle rejected')
      setRejecting(null)
      await load()
    } catch (err) {
      ErrorToast(apiErrorMessage(err, 'Could not reject this vehicle.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageLayout
      title='Vehicle approvals'
      subtitle='Listings submitted by hosts and waiting on a decision.'
      breadcrumb={['Operations', 'Vehicles', 'Approvals']}
      filters={(
        <>
          <span className='text-xs text-[#757575]'>
            {loading ? 'Loading…' : `${rows.length} awaiting review`}
          </span>
          <button onClick={load} className='text-xs font-semibold text-[#454545] hover:text-[#151515]'>
            Refresh
          </button>
        </>
      )}
    >
      <ListState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={rows.length === 0}
        empty={(
          <EmptyState
            title='Nothing awaiting approval'
            message='New listings appear here as soon as a host submits one. Rejected vehicles and unsubmitted drafts are not shown.'
          />
        )}
      >
        <div className='space-y-3'>
          {rows.map((v) => (
            <QueueCard key={v.id} vehicle={v} canUpdate={canUpdate} onReject={setRejecting} />
          ))}
        </div>

        {rows.length >= LIMIT && (
          <p className='text-xs text-amber-700 mt-3'>
            Showing the first {LIMIT}. There are more waiting — work through these and refresh.
          </p>
        )}

        <div className='mt-4'>
          <Explainer>
            Approve lives on the review screen, not here: it is gated on the RC, the host&apos;s PAN, the
            host&apos;s identity and — when enabled — the in-person checks, none of which can be judged from
            a row. Reject only needs a reason, so it stays in the queue.
          </Explainer>
        </div>
      </ListState>

      {rejecting && (
        <RejectDialog vehicle={rejecting} busy={busy} onCancel={() => setRejecting(null)} onConfirm={reject} />
      )}
    </PageLayout>
  )
}
