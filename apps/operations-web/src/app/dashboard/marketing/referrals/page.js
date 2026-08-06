'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { Header, Pagination } from '@cocarr/ui'
import { LIMIT } from '@cocarr/shared-utils'

// Marketing > Referral Program (moderation). Lists referral records with the
// two moderation actions the backend exposes:
//   POST /admin/referrals/:id/block    → flag as fraud (stops future rewards)
//   POST /admin/referrals/:id/reverse  → claw back credited points, cancel
// Records come from GET /admin/referrals (referrer + referee joined in).

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  eligible: 'bg-blue-50 text-blue-600',
  rewarded: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  fraud: 'bg-red-50 text-red-600',
}

const Badge = ({ status }) => (
  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
    {status}
  </span>
)

const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

const person = (u, fallbackId) => (u?.name || u?.contactNumber || fallbackId || '—')

export default function ReferralModeration() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await coreApi().get(`/admin/referrals?offset=${offset}&limit=${LIMIT}`)
      setRows(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load referrals')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset])

  const act = async (id, action) => {
    const verb = action === 'block' ? 'block this referral as fraud' : 'reverse the rewards and cancel this referral'
    if (typeof window !== 'undefined' && !window.confirm(`Are you sure you want to ${verb}?`)) return
    setBusyId(id)
    try {
      await coreApi().post(`/admin/referrals/${id}/${action}`)
      InfoToast(action === 'block' ? 'Referral blocked' : 'Rewards reversed')
      load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Action failed')
    } finally { setBusyId(null) }
  }

  return (
    <div className='max-w-7xl mx-auto pb-10'>
      <Header
        title='Referral Program'
        RightContent={() => null}
        pagination
        count={count}
        offset={offset}
        setOffset={setOffset}
      />

      <p className='text-xs text-[#757575] px-1 pt-3'>
        Referral records. Use <span className='font-semibold'>Block</span> to flag fraud (stops future rewards) or{' '}
        <span className='font-semibold'>Reverse</span> to claw back credited points and cancel the referral. Reward
        amounts are configured under Marketing › Referral Campaigns.
      </p>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className='bg-white border border-gray-100 rounded-md px-5 py-8 text-center mt-3'>
          <p className='text-sm text-[#757575]'>No referral records yet.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className='overflow-x-auto mt-3'>
          <table className='w-full'>
            <thead className='bg-[#f9f9f9]'>
              <tr>
                <td><p>Referrer</p></td>
                <td><p>Referee</p></td>
                <td><p>Code</p></td>
                <td><p>Status</p></td>
                <td><p>Points (referrer/referee)</p></td>
                <td><p>When</p></td>
                <td><p>Actions</p></td>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const closed = r.status === 'fraud' || r.status === 'cancelled'
                return (
                  <tr key={r.id} className='hover:bg-[#fafafa]'>
                    <td>
                      <p className='text-sm font-medium my-0 capitalize'>{person(r.referrer, r.referrerId)}</p>
                      <p className='text-[11px] my-0 text-gray-400 font-mono break-all'>{r.referrerId}</p>
                    </td>
                    <td>
                      <p className='text-sm font-medium my-0 capitalize'>{person(r.referee, r.refereeId)}</p>
                      <p className='text-[11px] my-0 text-gray-400 font-mono break-all'>{r.refereeId}</p>
                    </td>
                    <td>
                      <span className='text-xs font-mono font-semibold bg-[#f3f3f3] px-2 py-1 rounded'>{r.referralCode}</span>
                    </td>
                    <td><Badge status={r.status} /></td>
                    <td><p className='text-sm my-0'>{r.rewardPointsReferrer ?? 0} / {r.rewardPointsReferee ?? 0}</p></td>
                    <td><p className='text-xs my-0 text-[#555]'>{fmtDate(r.createdAt)}</p></td>
                    <td>
                      {closed ? (
                        <span className='text-xs text-[#959595]'>—</span>
                      ) : (
                        <div className='flex gap-2 whitespace-nowrap'>
                          <button
                            onClick={() => act(r.id, 'block')}
                            disabled={busyId === r.id}
                            className='text-xs font-semibold text-red-600 border border-red-200 rounded px-2 py-1 disabled:opacity-50'
                          >
                            Block
                          </button>
                          <button
                            onClick={() => act(r.id, 'reverse')}
                            disabled={busyId === r.id}
                            className='text-xs font-semibold text-[#454545] border border-gray-200 rounded px-2 py-1 disabled:opacity-50'
                          >
                            Reverse
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className='flex justify-end py-3'>
        <Pagination count={count} offset={offset} setOffset={setOffset} />
      </div>
    </div>
  )
}
