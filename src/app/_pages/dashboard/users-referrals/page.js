'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'
import Pagination from '@/app/_components/Pagination'
import { LIMIT } from '@/app/_helpers/constants'

// User Management > Referrals.
//
// One row per referrer: who they are, their shareable referral code, how many
// users signed up with it, and the referral points on their wallet. Expanding a
// row lists the people they brought in, each linking to that user's detail page.
//
// The relationship comes from the referral module's `referrals` table (one row
// per referred user, written at signup) joined to `referral_codes` for each
// referrer's shareable code and totals. The backend groups those into referrers;
// see adminExtraService.listUserReferrals.

const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

const REF_PILL = {
  rewarded: 'bg-green-50 text-green-700',
  eligible: 'bg-blue-50 text-blue-600',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
  fraud: 'bg-red-50 text-red-600',
}
const REF_LABEL = {
  rewarded: 'Reward credited',
  eligible: 'Signed up · pending',
  pending: 'Pending verification',
  cancelled: 'Cancelled',
  fraud: 'Blocked',
}

// Module scope — a component defined inside a render is a new type each time,
// which would collapse any expanded row on every keystroke.
const Stat = ({ label, value }) => (
  <div className='bg-white border border-gray-100 rounded-md px-4 py-3'>
    <p className='text-xl font-semibold my-0'>{value}</p>
    <p className='text-xs my-0 text-[#757575]'>{label}</p>
  </div>
)

export default function UsersReferrals() {
  const router = useRouter()

  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState({ referrers: 0, referred: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      let query = `offset=${offset}&limit=${LIMIT}`
      if (search) query += `&search=${encodeURIComponent(search)}`
      const res = await authAxios.get(`/admin/user-referrals?${query}`)
      setRows(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setTotals({
        referrers: res.data?.totalReferrers ?? res.data?.totalCount ?? 0,
        referred: res.data?.totalReferred ?? 0,
      })
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load referrals')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, search])

  return (
    <div className='max-w-7xl mx-auto pb-10'>
      <Header
        title='Referrals'
        RightContent={() => null}
        search
        searchPlaceholder='Search by referrer name, email, phone or code'
        searchText={search}
        setSearchText={(t) => { setOffset(0); setSearch(t) }}
        pagination
        count={count}
        offset={offset}
        setOffset={setOffset}
      />

      <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 px-1 py-3'>
        <Stat label='Referrers' value={totals.referrers} />
        <Stat label='Users referred' value={totals.referred} />
      </div>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && rows.length === 0 && (
        <div className='bg-white border border-gray-100 rounded-md px-5 py-8 text-center'>
          <p className='text-sm text-[#757575]'>
            {search ? 'No referrer matches this search.' : 'No referrals yet.'}
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-[#f9f9f9]'>
              <tr>
                <td><p>Referrer</p></td>
                <td><p>Referral code</p></td>
                <td><p>Contact</p></td>
                <td><p>Users referred</p></td>
                <td><p>Points earned</p></td>
                <td><p></p></td>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = expanded === r.referralCode
                return (
                  <React.Fragment key={r.referralCode}>
                    <tr
                      className='cursor-pointer hover:bg-[#fafafa]'
                      onClick={() => setExpanded(isOpen ? null : r.referralCode)}
                    >
                      <td>
                        {r.referrerId ? (
                          <button
                            className='text-sm font-medium my-0 capitalize text-left underline decoration-transparent hover:decoration-inherit'
                            onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/users/${r.referrerId}`) }}
                          >
                            {r.referrerName || <span className='text-[#959595]'>{r.referrerExists ? 'No name' : 'Deleted user'}</span>}
                          </button>
                        ) : (
                          <p className='text-sm font-medium my-0 capitalize'>
                            {r.referrerName || <span className='text-[#959595]'>Deleted user</span>}
                          </p>
                        )}
                        {r.referrerId && (
                          <p className='text-[11px] my-0 text-gray-400 font-mono break-all'>{r.referrerId}</p>
                        )}
                      </td>
                      <td>
                        <span className='text-xs font-mono font-semibold bg-[#f3f3f3] px-2 py-1 rounded'>
                          {r.referralCode}
                        </span>
                      </td>
                      <td>
                        <p className='text-xs my-0 text-[#555]'>{r.referrerEmail || '—'}</p>
                        <p className='text-xs my-0 text-gray-400'>{r.referrerPhone || ''}</p>
                      </td>
                      <td>
                        <span className='text-sm font-semibold'>{r.referredCount}</span>
                        {r.pendingCount > 0 && (
                          <span className='text-[11px] ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold'>
                            {r.pendingCount} pending
                          </span>
                        )}
                      </td>
                      <td>
                        <span className='text-sm font-semibold'>{r.pointsEarned}</span>
                      </td>
                      <td>
                        <span className='text-xs text-[#ECC032] font-semibold whitespace-nowrap'>
                          {isOpen ? 'Hide ▲' : 'View ▼'}
                        </span>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td colSpan={6} className='bg-[#fbfbfb] px-4 py-3'>
                          {r.referredUsers.length === 0 ? (
                            <p className='text-xs text-[#757575] my-0'>No referred users on record.</p>
                          ) : (
                            <div className='overflow-x-auto'>
                              <table className='w-full'>
                                <thead>
                                  <tr>
                                    <td><p className='text-[11px] text-[#959595]'>Referred user</p></td>
                                    <td><p className='text-[11px] text-[#959595]'>State</p></td>
                                    <td><p className='text-[11px] text-[#959595]'>Phone</p></td>
                                    <td><p className='text-[11px] text-[#959595]'>Joined</p></td>
                                    <td><p className='text-[11px] text-[#959595] text-right'>Points</p></td>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.referredUsers.map((u) => (
                                    <tr
                                      key={u.id}
                                      className='cursor-pointer hover:bg-white'
                                      onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/users/${u.id}`) }}
                                    >
                                      <td>
                                        <p className='text-xs font-medium my-0 capitalize'>
                                          {u.name || <span className='text-[#959595]'>No name</span>}
                                        </p>
                                        <p className='text-[10px] my-0 text-gray-400 font-mono break-all'>{u.id}</p>
                                      </td>
                                      <td>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${REF_PILL[u.status] || REF_PILL.pending}`}>
                                          {REF_LABEL[u.status] || u.status}
                                        </span>
                                      </td>
                                      <td><p className='text-xs my-0 text-[#555]'>{u.phone || '—'}</p></td>
                                      <td><p className='text-xs my-0 text-[#555]'>{fmtDate(u.joinedAt)}</p></td>
                                      <td><p className='text-xs my-0 text-right font-semibold'>{u.pointsAwarded > 0 ? `+${u.pointsAwarded}` : '—'}</p></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className='flex justify-end py-3'>
        <Pagination count={count} offset={offset} setOffset={setOffset} />
      </div>

      <p className='text-[11px] text-[#959595] mt-2'>
        Points earned reflects the referral points on the referrer&apos;s wallet. Click a row to see who
        signed up with their code; click a referred user to open their profile.
      </p>
    </div>
  )
}
