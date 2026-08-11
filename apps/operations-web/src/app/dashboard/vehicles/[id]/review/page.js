'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { photoUrl, getValidDateFormat } from '@cocarr/shared-utils'
import { DocumentThumb } from '@/app/_components/DocumentCell'
import { useCan } from '@cocarr/iam-sdk'
import {
  STATUS_PILL, STATUS_LABEL, STATUS_MEANING, DOC_PILL, DOC_LABEL,
  PHYSICAL_ITEMS, allowedActions, docState,
} from '@/app/_helpers/vehicleStatus'
import PhysicalCheck from '../_components/PhysicalCheck'

// Vehicle verification — the ops half of the car-hosting flow.
//
// The host lists a car; nothing about it is live until an admin works down this
// screen: RC, the host's PAN, the host's identity, their payout account, and —
// when the feature flag is on — a four-part in-person inspection with photos.
// Only then does Approve become pressable, and only Approve makes a vehicle
// bookable.
//
// EVERY GATE HERE IS A MIRROR, NEVER THE DECISION. `readyToApprove` and
// `outstanding` are computed by vehicleReviewService and simply rendered. A
// second implementation of the rules in the client would drift from the server,
// and the drift is invisible both ways: block what the server allows and the
// screen looks broken; allow what it refuses and every click is a 400.

const Row = ({ label, value, muted }) => (
  <div className='flex justify-between gap-4 py-1.5 text-sm'>
    <span className='text-gray-500'>{label}</span>
    <span className={muted ? 'text-gray-400' : 'text-gray-900 text-right'}>{value ?? '—'}</span>
  </div>
)

const Card = ({ title, pill, children, aside }) => (
  <div className='border border-gray-200 rounded-lg p-4 bg-white'>
    <div className='flex items-center justify-between gap-3 mb-3'>
      <div className='flex items-center gap-2'>
        <h3 className='font-medium text-sm'>{title}</h3>
        {pill}
      </div>
      {aside}
    </div>
    {children}
  </div>
)

const Pill = ({ state, map = DOC_PILL, labels = DOC_LABEL }) => (
  <span className={`text-xs px-2 py-0.5 rounded-full ${map[state] || map.missing}`}>
    {labels[state] || state}
  </span>
)

export default function VehicleReview() {
  const { id } = useParams()
  // Hooks before any early return — `useCan` after a `if (loading) return` is
  // the rules-of-hooks trap the user-detail screen already hit once.
  const canUpdate = useCan('operations.vehicles.update')

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await coreApi().get(`/admin/vehicle/${id}/review`)
      setData(res.data)
      setError('')
    } catch (err) {
      setError(err?.platform?.message || 'Could not load this vehicle for review.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Every decision funnels through here so success and failure are handled once.
  const act = async (fn, okMessage) => {
    setBusy(true)
    try {
      await fn()
      InfoToast(okMessage)
      await load()
    } catch (err) {
      ErrorToast(err?.platform?.message || 'That action could not be completed')
    } finally {
      setBusy(false)
    }
  }

  const reviewDoc = (docType, status) => {
    let reason = null
    if (status === 'rejected') {
      reason = window.prompt(`Why is the ${docType.toUpperCase()} being rejected?`)
      if (!reason || !reason.trim()) return
    }
    return act(
      () => coreApi().post(`/admin/vehicle/${id}/document/${docType}`, { status, reason }),
      `${docType.toUpperCase()} marked ${status}`,
    )
  }

  const decide = (path, body, message) =>
    act(() => coreApi().post(`/admin/vehicle/${id}/${path}`, body), message)

  if (loading) return <div className='p-6 text-sm text-gray-500'>Loading vehicle…</div>
  if (error) {
    return (
      <div className='p-6'>
        <p className='text-sm text-red-600'>{error}</p>
        <button onClick={load} className='mt-3 text-xs px-3 py-1.5 rounded border border-gray-300'>Try again</button>
      </div>
    )
  }

  const review = data?.review || {}
  const status = data?.approvalStatus || 'pending'
  const actions = allowedActions(status)
  const outstanding = review.outstanding || []
  const advisory = review.outstandingAdvisory || []
  const bank = review.bank
  const host = review.host

  return (
    <div className='p-6 space-y-5 max-w-5xl'>
      {/* ── Heading: what this vehicle is, and where it stands ── */}
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-lg font-semibold'>{data?.vehicleName || data?.vehicleNumber || 'Vehicle'}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_PILL[status]}`}>
              {STATUS_LABEL[status] || status}
            </span>
          </div>
          <p className='text-xs text-gray-500 mt-1 max-w-2xl'>{STATUS_MEANING[status]}</p>
          <p className='text-xs mt-1'>
            <span className={review.isLive ? 'text-green-700' : 'text-gray-500'}>
              {review.isLive ? 'Live now' : 'Not live'}
            </span>
            {review.liveReason ? <span className='text-gray-400'> — {review.liveReason}</span> : null}
          </p>
        </div>
        <Link href={`/dashboard/vehicles/${id}`} className='text-xs px-3 py-1.5 rounded border border-gray-300'>
          Vehicle details
        </Link>
      </div>

      {/* ── What still blocks approval. Server-computed. ── */}
      {status === 'pending' && (
        <div className={`rounded-lg p-4 text-sm ${outstanding.length ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          {outstanding.length ? (
            <>
              <p className='font-medium text-amber-800'>Outstanding before this vehicle can be approved</p>
              <ul className='list-disc ml-5 mt-1 text-amber-800'>
                {outstanding.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </>
          ) : (
            <p className='text-green-800 font-medium'>Everything required is verified — this vehicle can be approved.</p>
          )}
          {/* Advisory, deliberately separate: the backend does NOT gate approval
              on the payout account, and presenting it as a blocker would claim a
              rule that does not exist. */}
          {advisory.length > 0 && (
            <p className='text-xs text-amber-700 mt-2'>
              Worth resolving, but does not block approval: {advisory.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ── Documents ── */}
      <div className='grid md:grid-cols-2 gap-4'>
        <Card
          title='Vehicle RC'
          pill={<Pill state={docState(review.rc)} />}
          aside={canUpdate && review.rc ? (
            <div className='flex gap-2'>
              <button disabled={busy} onClick={() => reviewDoc('rc', 'verified')}
                className='text-xs px-2.5 py-1 rounded bg-green-600 text-white disabled:opacity-40'>Verify</button>
              <button disabled={busy} onClick={() => reviewDoc('rc', 'rejected')}
                className='text-xs px-2.5 py-1 rounded border border-red-300 text-red-600 disabled:opacity-40'>Reject</button>
            </div>
          ) : null}
        >
          <DocumentThumb src={photoUrl(review.rc?.frontImageKey || data?.vehicleRcImage)} label='RC' />
          <Row label='RC number' value={review.rc?.documentNumber || data?.vehicleRcNumber} />
          <Row label='Provider check' value={review.rc?.providerStatus || 'Not checked'} />
          {review.rc?.rejectionReason && <Row label='Rejected because' value={review.rc.rejectionReason} />}
          {!review.rc && <p className='text-xs text-gray-500'>The host has not submitted an RC for this vehicle.</p>}
        </Card>

        <Card
          title='Host PAN'
          pill={<Pill state={docState(review.pan)} />}
          aside={canUpdate && review.pan ? (
            <div className='flex gap-2'>
              <button disabled={busy} onClick={() => reviewDoc('pan', 'verified')}
                className='text-xs px-2.5 py-1 rounded bg-green-600 text-white disabled:opacity-40'>Verify</button>
              <button disabled={busy} onClick={() => reviewDoc('pan', 'rejected')}
                className='text-xs px-2.5 py-1 rounded border border-red-300 text-red-600 disabled:opacity-40'>Reject</button>
            </div>
          ) : null}
        >
          <DocumentThumb src={photoUrl(review.pan?.imageKey)} label='PAN' />
          {/* The number is masked server-side by design — the reviewer reads it
              off the scan, which is why the image comes first. */}
          <Row label='PAN' value={review.pan?.panNumber} muted />
          <Row label='Name on card' value={review.pan?.holderName} />
          <Row label='Registry check' value={review.pan?.providerStatus || 'Not checked'} />
          {review.pan?.rejectionReason && <Row label='Rejected because' value={review.pan.rejectionReason} />}
          {!review.pan && <p className='text-xs text-gray-500'>This host has not submitted a PAN.</p>}
        </Card>

        <Card title='Host identity' pill={<Pill state={host?.verificationStatus === 'active' ? 'verified' : 'pending'} />}>
          <Row label='Host' value={host?.name} />
          <Row label='Profile status' value={host?.verificationStatus} />
          {host?.userId && (
            <Link href={`/dashboard/users/${host.userId}`} className='text-xs text-blue-600 hover:underline'>
              Open host profile →
            </Link>
          )}
          {!host && <p className='text-xs text-gray-500'>This vehicle has no host on file.</p>}
        </Card>

        <Card
          title='Host payout account'
          pill={<Pill state={!bank ? 'missing' : (bank.isVerified || bank.isManuallyVerified) ? 'verified' : 'pending'} />}
        >
          {bank ? (
            <>
              <Row label='Method' value={bank.paymentMethod} />
              {/* accountNumber only ever stores the last 4 digits by design. */}
              <Row label='Account' value={bank.accountNumber ? `•••• ${bank.accountNumber}` : null} />
              <Row label='Bank' value={bank.bankName} />
              <Row label='IFSC' value={bank.ifscCode} />
              <Row label='Holder (bank)' value={bank.accountHolderName} />
              <Row label='Holder (typed)' value={bank.hostProvidedName} />
              {bank.accountHolderName && bank.hostProvidedName
                && bank.accountHolderName.trim().toLowerCase() !== bank.hostProvidedName.trim().toLowerCase() && (
                <p className='text-xs text-red-600 mt-1'>
                  Name mismatch between the bank and what the host typed — the main fraud signal on this card.
                </p>
              )}
              {bank.isManuallyVerified && (
                <p className='text-xs text-gray-500 mt-1'>Marked verified by an admin, not by a penny-drop check.</p>
              )}
              <Link href='/dashboard/finance/bank-accounts' className='text-xs text-blue-600 hover:underline'>
                Manage in Host Bank Accounts →
              </Link>
            </>
          ) : (
            <p className='text-xs text-gray-500'>
              No payout account on file. The host cannot be paid until one is added and verified.
            </p>
          )}
        </Card>
      </div>

      {/* ── Physical verification ── */}
      {review.physicalRequired ? (
        <div className='border border-gray-200 rounded-lg p-4 bg-white'>
          <div className='flex items-center justify-between gap-3 mb-1'>
            <h3 className='font-medium text-sm'>Physical verification</h3>
            {review.physical?.inspectedByName && (
              <span className='text-xs text-gray-500'>
                Inspected by {review.physical.inspectedByName}
                {review.physical.inspectedAt ? ` on ${getValidDateFormat(review.physical.inspectedAt)}` : ''}
              </span>
            )}
          </div>
          <p className='text-xs text-gray-500 mb-3'>
            A fleet manager attends the vehicle in person, photographs it and records a verdict per item.
            All four must be verified before this vehicle can be approved.
          </p>
          <div className='grid md:grid-cols-2 gap-3'>
            {PHYSICAL_ITEMS.map((item) => (
              <PhysicalCheck
                key={item.key}
                item={item}
                row={review.physical}
                vehicleId={id}
                canEdit={canUpdate}
                onChanged={load}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className='border border-dashed border-gray-300 rounded-lg p-4 text-xs text-gray-500'>
          Physical verification is switched off (<code>vehicle.physicalVerification</code>), so approval is
          document-only. Existing inspection records are retained and ignored.
        </div>
      )}

      {/* ── The decision ── */}
      <div className='border border-gray-200 rounded-lg p-4 bg-white'>
        <h3 className='font-medium text-sm mb-3'>Decision</h3>
        {!canUpdate ? (
          <p className='text-xs text-gray-500'>You have view-only access to vehicle verification.</p>
        ) : (
          <div className='flex flex-wrap gap-2'>
            {actions.approve && (
              <button
                disabled={busy || !review.readyToApprove}
                onClick={() => decide('approve', {}, 'Vehicle approved — it can now be booked')}
                className='text-sm px-4 py-2 rounded bg-green-600 text-white disabled:opacity-40'
                title={review.readyToApprove ? '' : 'Everything in Outstanding must be verified first'}
              >
                Approve
              </button>
            )}
            {actions.reject && (
              <button disabled={busy} onClick={() => {
                const reason = window.prompt('Why is this vehicle being rejected? The host sees this.')
                if (!reason || !reason.trim()) return
                decide('reject', { reason }, 'Vehicle rejected')
              }} className='text-sm px-4 py-2 rounded border border-red-300 text-red-600 disabled:opacity-40'>
                {status === 'approved' ? 'Reject (withdraw approval)' : 'Reject'}
              </button>
            )}
            {actions.suspend && (
              <button disabled={busy} onClick={() => {
                const reason = window.prompt('Why is this vehicle being suspended?')
                if (!reason || !reason.trim()) return
                decide('suspend', { suspended: true, reason }, 'Vehicle suspended')
              }} className='text-sm px-4 py-2 rounded border border-orange-300 text-orange-700 disabled:opacity-40'>
                Suspend
              </button>
            )}
            {actions.restore && (
              <button disabled={busy} onClick={() => decide('suspend', { suspended: false }, 'Vehicle restored')}
                className='text-sm px-4 py-2 rounded border border-gray-300 disabled:opacity-40'>
                Restore
              </button>
            )}
            {actions.maintenance && (
              <button disabled={busy} onClick={() => {
                const reason = window.prompt('Why is this vehicle going into maintenance?')
                if (!reason || !reason.trim()) return
                decide('maintenance', { maintenance: true, reason }, 'Marked for maintenance')
              }} className='text-sm px-4 py-2 rounded border border-blue-300 text-blue-700 disabled:opacity-40'>
                Mark for maintenance
              </button>
            )}
            {actions.endMaintenance && (
              <button disabled={busy} onClick={() => decide('maintenance', { maintenance: false }, 'Returned from maintenance')}
                className='text-sm px-4 py-2 rounded border border-gray-300 disabled:opacity-40'>
                End maintenance
              </button>
            )}
          </div>
        )}
        {status === 'rejected' && data?.rejectionReason && (
          <p className='text-xs text-gray-500 mt-3'>Previously rejected: {data.rejectionReason}</p>
        )}
      </div>
    </div>
  )
}
