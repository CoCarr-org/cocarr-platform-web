'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header, Pagination, Modal } from '@cocarr/ui'
import { LIMIT, photoUrl } from '@cocarr/shared-utils'

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

// pending  → awaiting the admin's photo comparison
// approved → verified, now with the assessment team
// assessed → priced; feeds the rider's refund
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  assessed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  paid: 'bg-gray-100 text-gray-600',
}

const STATUS_LABEL = {
  pending: 'pending verification',
  approved: 'awaiting assessment',
  assessed: 'assessed',
  rejected: 'rejected',
  paid: 'paid',
}

const Badge = ({ status }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
    {STATUS_LABEL[status] || status}
  </span>
)

const Tile = ({ label, value }) => (
  <div className='bg-white border border-gray-100 rounded-md px-5 py-4'>
    <p className='text-[11px] uppercase tracking-tight text-[#757575] font-semibold'>{label}</p>
    <p className='text-2xl font-bold tracking-tight mt-1'>{value}</p>
  </div>
)

const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : '—')

// damageImage is stored comma-joined; the API splits it into damageImages.
// Every src still has to go through photoUrl() — the bucket is private.
const Gallery = ({ images }) => {
  const [open, setOpen] = useState(null)
  if (!images?.length) return <span className='text-xs text-[#959595]'>No photos</span>

  return (
    <>
      <div className='flex gap-1.5 flex-wrap'>
        {images.map((src, i) => (
          <button key={`${src}-${i}`} onClick={() => setOpen(src)}
            className='w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-50'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(src)} alt={`Damage ${i + 1}`} className='w-full h-full object-cover' />
          </button>
        ))}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)} size='lg' label='Damage photos' dismissOnBackdrop className='p-3'>
          <div>
            <div className='flex justify-between items-center mb-2'>
              <p className='text-sm font-semibold'>Damage photo</p>
              <button onClick={() => setOpen(null)} className='text-sm text-[#757575] px-2'>✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(open)} alt='Damage' className='max-w-full max-h-[75vh] object-contain' />
          </div>
        </Modal>
      )}
    </>
  )
}

// Three photo sets side by side. The reviewer's job is to decide whether the
// claimed damage is visible at return but NOT at pickup — which is impossible
// to judge from the damage photos alone.
const PhotoSet = ({ title, images, empty }) => (
  <div>
    <p className='text-[11px] uppercase tracking-tight text-[#757575] font-semibold mb-2'>{title}</p>
    {images?.length ? (
      <div className='grid grid-cols-3 gap-1.5'>
        {images.map((img, i) => (
          <a key={i} href={photoUrl(img.url || img)} target='_blank' rel='noreferrer'
            className='block h-20 rounded border border-gray-200 overflow-hidden bg-gray-50'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(img.url || img)} alt={`${title} ${i + 1}`}
              className='w-full h-full object-cover hover:opacity-90' />
          </a>
        ))}
      </div>
    ) : (
      <div className='h-20 rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center'>
        <span className='text-[11px] text-[#959595]'>{empty}</span>
      </div>
    )}
  </div>
)

export default function DamageClaims() {
  const [claims, setClaims] = useState([])
  const [totals, setTotals] = useState({ claimed: 0, approved: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(null)
  const [amounts, setAmounts] = useState({})
  const [notes, setNotes] = useState({})
  const [reviewing, setReviewing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/damages', {
        params: { offset, limit: LIMIT, search: search || undefined, status: status || undefined },
      })
      setClaims(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setTotals(res.data?.totals || { claimed: 0, approved: 0 })
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load damage claims')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, search, status])

  // Step 1 — compare pickup, return and damage photos, then accept or reject.
  // Accepting does NOT charge anything; it hands the claim to assessment.
  const verify = async (claim, accept) => {
    let reason
    if (!accept) {
      reason = window.prompt('Why is this claim not valid? The host sees this.')
      if (reason === null) return
      if (!reason.trim()) { ErrorToast('A reason is required'); return }
    } else if (!window.confirm(
      'Accept this claim? It goes to the assessment team to be priced — nothing is charged yet.'
    )) return

    setBusy(claim.id)
    try {
      await coreApi().post(`/admin/damages/${claim.id}/verify`, { accept, reason: reason?.trim() })
      InfoToast(accept ? 'Verified — sent for assessment' : 'Claim rejected')
      setReviewing(null)
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update claim')
    } finally { setBusy(null) }
  }

  // Step 2 — the assessment figure. This is what the rider's refund is reduced
  // by, so it must be set explicitly rather than inherited from the claim.
  const assess = async (claim) => {
    const amount = amounts[claim.id]
    if (amount === undefined || amount === '' || Number(amount) <= 0) {
      ErrorToast('Enter the assessed amount')
      return
    }
    if (!window.confirm(
      `Assess this damage at ${money(amount)}? It will be deducted from the rider's deposit.`
    )) return

    setBusy(claim.id)
    try {
      await coreApi().post(`/admin/damages/${claim.id}/assess`, {
        assessedAmount: Number(amount),
        notes: notes[claim.id] || undefined,
      })
      InfoToast('Assessment recorded')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not record the assessment')
    } finally { setBusy(null) }
  }

  // Loads the claim with its ride-start and ride-end photos so the three sets
  // can be compared side by side — the whole point of the verification step.
  const openReview = async (claim) => {
    setBusy(`open-${claim.id}`)
    try {
      const res = await coreApi().get(`/admin/damages/${claim.id}`)
      setReviewing(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load this claim')
    } finally { setBusy(null) }
  }

  if (reviewing) {
    return (
      <div className='max-w-5xl mx-auto pb-10'>
        <Header title='Verify damage claim' RightContent={() => (
          <button onClick={() => setReviewing(null)} className='text-sm font-semibold text-[#454545]'>
            ← Back to claims
          </button>
        )} />

        <div className='bg-white border border-gray-100 rounded-md p-5 my-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='font-semibold capitalize'>{reviewing.damageType || 'Damage claim'}</p>
              <p className='text-[11px] text-[#959595]'>
                {reviewing.damagedPart || '—'} · Booking {reviewing.booking?.bookingId || '—'}
                {' · reported '}{fmtDate(reviewing.damageDate || reviewing.createdAt)}
              </p>
            </div>
            <Badge status={reviewing.damageStatus} />
          </div>
          {reviewing.damageDescription && (
            <p className='text-xs text-[#454545] mt-3'>{reviewing.damageDescription}</p>
          )}
        </div>

        <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
          <p className='text-sm font-semibold mb-1'>Compare the three sets</p>
          <p className='text-xs text-[#757575] mb-4'>
            The damage should be absent at pickup and present at return. If it appears in the
            pickup photos, it was pre-existing.
          </p>
          <div className='grid md:grid-cols-3 gap-4'>
            <PhotoSet title='1 · At pickup' images={reviewing.startImages} empty='No pickup photos' />
            <PhotoSet title='2 · At return' images={reviewing.endImages} empty='No return photos' />
            <PhotoSet title='3 · Claimed damage' images={reviewing.damageImages} empty='No damage photos' />
          </div>
        </div>

        {reviewing.damageStatus === 'pending' && (
          <div className='flex gap-3'>
            <button disabled={busy === reviewing.id} onClick={() => verify(reviewing, true)}
              className='bg-[#ECC032] text-black text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-50'>
              Accept — send for assessment
            </button>
            <button disabled={busy === reviewing.id} onClick={() => verify(reviewing, false)}
              className='border border-red-200 text-red-600 text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-50'>
              Reject claim
            </button>
          </div>
        )}
        {reviewing.rejectionReason && (
          <div className='bg-red-50 border-l-2 border-red-400 px-3 py-2'>
            <p className='text-[11px] text-red-800'>Rejected: {reviewing.rejectionReason}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title='Damage Claims' RightContent={() => null} />

      <div className='grid grid-cols-2 md:grid-cols-3 gap-3 my-4'>
        <Tile label='Claims' value={count} />
        <Tile label='Total claimed' value={money(totals.claimed)} />
        <Tile label='Approved / paid' value={money(totals.approved)} />
      </div>

      <div className='flex flex-wrap items-center gap-3 py-2 px-1'>
        <input className={`${input} max-w-xs flex-1`} placeholder='Search by type, part or description'
          value={search} onChange={(e) => { setOffset(0); setSearch(e.target.value) }} />
        <select className={input} value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }}>
          <option value=''>Any status</option>
          <option value='pending'>Pending verification</option>
          <option value='approved'>Awaiting assessment</option>
          <option value='assessed'>Assessed</option>
          <option value='rejected'>Rejected</option>
          <option value='paid'>Paid</option>
        </select>
        <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
      </div>

      <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
              <th className='px-4 py-3 font-semibold'>Booking</th>
              <th className='px-4 py-3 font-semibold'>Damage</th>
              <th className='px-4 py-3 font-semibold'>Photos</th>
              <th className='px-4 py-3 font-semibold'>Rider</th>
              <th className='px-4 py-3 font-semibold'>Host</th>
              <th className='px-4 py-3 font-semibold'>Amount</th>
              <th className='px-4 py-3 font-semibold'>Status</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className='px-4 py-6 text-[#757575]'>Loading…</td></tr>}
            {!loading && claims.length === 0 && (
              <tr><td colSpan={8} className='px-4 py-6 text-[#757575]'>No damage claims match these filters.</td></tr>
            )}
            {claims.map((c) => {
              return (
                <tr key={c.id} className='border-b border-gray-50 last:border-b-0 align-top'>
                  <td className='px-4 py-3'>
                    <p className='font-medium'>{c.booking?.bookingId || '—'}</p>
                    <p className='text-[11px] text-[#959595]'>
                      {c.vehicle?.vehicleName || '—'}
                      {c.vehicle?.vehicleNumber && <span className='block'>{c.vehicle.vehicleNumber}</span>}
                    </p>
                  </td>
                  <td className='px-4 py-3 max-w-[220px]'>
                    <p className='font-medium capitalize'>{c.damageType || '—'}</p>
                    {c.damagedPart && <p className='text-[11px] text-[#757575]'>{c.damagedPart}</p>}
                    {c.damageDescription && (
                      <p className='text-[11px] text-[#959595] mt-0.5 break-words'>{c.damageDescription}</p>
                    )}
                    <p className='text-[10px] text-[#959595] mt-1'>Reported {fmtDate(c.damageDate || c.createdAt)}</p>
                  </td>
                  <td className='px-4 py-3'><Gallery images={c.damageImages} /></td>
                  <td className='px-4 py-3 text-xs'>
                    {c.rider?.name || '—'}
                    <span className='block text-[11px] text-[#959595]'>
                      {c.rider?.email || c.rider?.contactNumber || ''}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-xs'>{c.host?.name || '—'}</td>
                  <td className='px-4 py-3'>
                    {c.damageStatus === 'approved' ? (
                      <>
                        <input type='number' min='0' placeholder='0'
                          className='border border-gray-200 rounded-md px-2 py-1 text-sm w-24 outline-none focus:border-[#ECC032]'
                          value={amounts[c.id] ?? ''}
                          onChange={(e) => setAmounts({ ...amounts, [c.id]: e.target.value })} />
                        <input placeholder='Notes'
                          className='border border-gray-200 rounded-md px-2 py-1 text-[11px] w-24 mt-1 outline-none focus:border-[#ECC032]'
                          value={notes[c.id] ?? ''}
                          onChange={(e) => setNotes({ ...notes, [c.id]: e.target.value })} />
                      </>
                    ) : c.damageStatus === 'assessed' || c.damageStatus === 'paid' ? (
                      <span className='font-semibold'>{money(c.assessedAmount ?? c.damageAmount)}</span>
                    ) : (
                      <span className='text-xs text-[#959595]'>Not assessed</span>
                    )}
                  </td>
                  <td className='px-4 py-3'><Badge status={c.damageStatus} /></td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    {c.damageStatus === 'pending' ? (
                      <button disabled={busy === `open-${c.id}`} onClick={() => openReview(c)}
                        className='text-xs font-semibold bg-[#ECC032] text-black px-3 py-1 rounded-md disabled:opacity-50'>
                        {busy === `open-${c.id}` ? '…' : 'Verify photos'}
                      </button>
                    ) : c.damageStatus === 'approved' ? (
                      <button disabled={busy === c.id} onClick={() => assess(c)}
                        className='text-xs font-semibold bg-[#ECC032] text-black px-3 py-1 rounded-md disabled:opacity-50'>
                        {busy === c.id ? '…' : 'Record assessment'}
                      </button>
                    ) : (
                      <span className='text-xs text-[#959595]'>
                        {c.damageStatus === 'paid' ? 'Settled'
                          : c.damageStatus === 'assessed' ? 'Assessed'
                          : 'Rejected'}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className='text-[11px] text-[#959595] mt-2'>
        Hosts file claims from the app within 10 days of a booking ending. Set the amount before approving —
        that is what the rider becomes liable for. &ldquo;Paid&rdquo; is set by the payment flow, not by hand.
      </p>
    </div>
  )
}
