'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { photoUrl, getValidDateFormat } from '@cocarr/shared-utils'
import { useCan } from '@cocarr/iam-sdk'
import { DOC_PILL, DOC_LABEL } from '@/app/_helpers/vehicleStatus'

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
// anything — and making that a two-page trip is the thing that leaves queues
// unworked.

const REJECT_REASONS = [
  'Photos are unclear or insufficient',
  'RC does not match the vehicle details',
  'Vehicle does not meet listing standards',
  'Duplicate listing',
]

function RejectDialog({ vehicle, onCancel, onConfirm, busy }) {
  const [reason, setReason] = useState('')
  return (
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6' onClick={onCancel}>
      <div className='bg-white rounded-lg p-5 w-full max-w-md' onClick={(e) => e.stopPropagation()}>
        <h3 className='font-medium'>Reject {vehicle.vehicleName || vehicle.vehicleNumber}</h3>
        <p className='text-xs text-gray-500 mt-1'>
          The host sees this reason. Editing the vehicle resubmits it and returns it to this queue.
        </p>
        <div className='flex flex-wrap gap-2 mt-3'>
          {REJECT_REASONS.map((r) => (
            <button key={r} type='button' onClick={() => setReason(r)}
              className={`text-xs px-2.5 py-1 rounded border ${reason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-300'}`}>
              {r}
            </button>
          ))}
        </div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          placeholder='Reason shown to the host'
          className='w-full mt-3 border border-gray-300 rounded p-2 text-sm' />
        <div className='flex justify-end gap-2 mt-3'>
          <button onClick={onCancel} className='text-sm px-3 py-1.5 rounded border border-gray-300'>Cancel</button>
          {/* Mandatory, and the backend refuses an empty one too — so this is a
              mirror of the server rule, not a second implementation of it. */}
          <button disabled={busy || !reason.trim()} onClick={() => onConfirm(reason.trim())}
            className='text-sm px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-40'>
            {busy ? 'Rejecting…' : 'Reject vehicle'}
          </button>
        </div>
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

  const load = useCallback(async () => {
    try {
      const res = await coreApi().get('/admin/vehicle?approved=false&populate=true&limit=50')
      setRows(res.data?.vehicles || res.data?.data || [])
      setError('')
    } catch (err) {
      setError(err?.platform?.message || 'Could not load the approvals queue.')
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
      ErrorToast(err?.platform?.message || 'Could not reject this vehicle')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className='p-6 text-sm text-gray-500'>Loading approvals…</div>

  return (
    <div className='p-6 max-w-5xl'>
      <div className='flex items-baseline justify-between'>
        <h1 className='text-lg font-semibold'>Vehicle approvals</h1>
        <span className='text-sm text-gray-500'>{rows.length} awaiting review</span>
      </div>
      <p className='text-xs text-gray-500 mt-1'>
        Vehicles submitted by hosts and waiting on a decision. Rejected vehicles and unsubmitted drafts are not shown.
      </p>

      {error && (
        <div className='mt-4'>
          <p className='text-sm text-red-600'>{error}</p>
          <button onClick={load} className='mt-2 text-xs px-3 py-1.5 rounded border border-gray-300'>Try again</button>
        </div>
      )}

      {!error && rows.length === 0 && (
        <p className='mt-6 text-sm text-gray-500'>
          Nothing awaiting approval. New listings appear here as soon as a host submits one.
        </p>
      )}

      <div className='mt-4 space-y-3'>
        {rows.map((v) => {
          const cover = v.images?.find((i) => i.isCover) || v.images?.[0]
          const rcState = v.vehicleRcVerified ? 'verified' : (v.vehicleRcNumber ? 'pending' : 'missing')
          return (
            <div key={v.id} className='border border-gray-200 rounded-lg p-3 flex gap-4 items-start bg-white'>
              <div className='w-28 h-20 rounded overflow-hidden bg-gray-100 shrink-0'>
                {cover?.url
                  ? <img src={photoUrl(cover.url)} alt='' className='w-full h-full object-cover' />
                  : <div className='w-full h-full grid place-items-center text-[10px] text-gray-400'>No photo</div>}
              </div>

              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-medium text-sm'>{v.vehicleName || v.vehicleNumber || 'Untitled vehicle'}</span>
                  <span className='text-xs text-gray-500'>{v.vehicleNumber}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${DOC_PILL[rcState]}`}>
                    RC {DOC_LABEL[rcState].toLowerCase()}
                  </span>
                </div>
                <div className='text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4'>
                  <span>Host: {v.host?.user?.name || v.host?.name || '—'}</span>
                  <span>{v.images?.length || 0} photo{(v.images?.length || 0) === 1 ? '' : 's'}</span>
                  {v.createdAt && <span>Submitted {getValidDateFormat(v.createdAt)}</span>}
                </div>
                {/* Context for a resubmission — otherwise the reviewer repeats
                    a rejection the host has already addressed. */}
                {v.rejectionReason && (
                  <p className='text-xs text-amber-700 mt-1'>Previously rejected: {v.rejectionReason}</p>
                )}
              </div>

              <div className='flex flex-col gap-2 shrink-0'>
                <Link href={`/dashboard/vehicles/${v.id}/review`}
                  className='text-xs px-3 py-1.5 rounded bg-blue-600 text-white text-center'>
                  Review
                </Link>
                {canUpdate && (
                  <button onClick={() => setRejecting(v)}
                    className='text-xs px-3 py-1.5 rounded border border-red-300 text-red-600'>
                    Reject
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {rejecting && (
        <RejectDialog vehicle={rejecting} busy={busy} onCancel={() => setRejecting(null)} onConfirm={reject} />
      )}
    </div>
  )
}
