'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import PageLayout from '@/app/_components/PageLayout'
import Pagination from '@/app/_components/Pagination'
import { LIMIT } from '@/app/_helpers/constants'
import { getValidDateFormat } from '@/app/_helpers/utils'

// Finance › Wallet Transactions — the points ledger, and the trace behind any
// one row.
//
// The trace is the reason this screen exists. Points turning up in someone's
// wallet generates support tickets and fraud questions, and the only answer
// available before was a free-text description like "Referral reward
// (sign-up)": enough to see that points moved, useless for working out why,
// from whom, or under which campaign. Every row here opens into its full
// lineage — the user, the referral, the campaign, and the person on the other
// side, each of them a link.

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

// Where a credit came from. `referral` is the only one written today; the others
// are declared so the filter doesn't have to change when they start appearing.
const SOURCE_FILTERS = [
  { value: '', label: 'All sources' },
  { value: 'referral', label: 'Referral' },
  { value: 'booking', label: 'Booking' },
  { value: 'refund', label: 'Refund' },
  { value: 'admin', label: 'Admin adjustment' },
]

const SOURCE_PILL = {
  referral: 'bg-purple-100 text-purple-700',
  booking: 'bg-blue-100 text-blue-700',
  refund: 'bg-amber-100 text-amber-700',
  admin: 'bg-gray-100 text-gray-600',
}

// Referral lifecycle, in the vocabulary the backend now writes. The legacy
// spellings are mapped too — rows written before the rename still hold them and
// they mean the money moved.
const REFERRAL_STATUS = {
  pending: ['bg-amber-100 text-amber-700', 'Pending'],
  completed: ['bg-green-100 text-green-700', 'Completed'],
  rewarded: ['bg-green-100 text-green-700', 'Completed'],
  eligible: ['bg-green-100 text-green-700', 'Completed'],
  cancelled: ['bg-red-100 text-red-600', 'Cancelled'],
  fraud: ['bg-red-100 text-red-600', 'Blocked (fraud)'],
}

// ── Module scope, deliberately ──────────────────────────────────────────────
// A component defined inside another component's render is a new type every
// render, so React remounts it — which on this screen would close the trace
// panel on every keystroke in the search box.

const Stat = ({ label, value, tone }) => (
  <div className='bg-white border border-gray-100 rounded-md px-4 py-3'>
    <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
    <p className={`text-lg font-semibold ${tone || 'text-[#454545]'}`}>{value}</p>
  </div>
)

const Row = ({ label, value }) => (
  <div className='flex justify-between gap-6 py-2 border-b border-gray-50 last:border-0'>
    <p className='text-[11px] uppercase tracking-tight text-[#959595] font-semibold shrink-0'>{label}</p>
    <p className='text-xs text-right text-[#454545] break-all'>{value || '—'}</p>
  </div>
)

// A user, rendered so the admin can both recognise them and jump to them. The
// name comes from the backend's shared display-name resolver — this screen must
// never fall back to `Unknown`, which is the bug that prompted it.
const UserLink = ({ user, label, onOpen }) => {
  if (!user) return <Row label={label} value='—' />
  return (
    <div className='py-2 border-b border-gray-50 last:border-0'>
      <p className='text-[11px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
      <button onClick={() => onOpen(user.id)}
        className='text-xs font-semibold text-[#454545] hover:text-[#ECC032] text-left'>
        {user.name || 'Unnamed user'}
      </button>
      <p className='text-[11px] text-[#959595]'>
        {[user.phone, user.email].filter(Boolean).join(' · ') || 'No contact details'}
      </p>
      <p className='text-[10px] text-gray-400 font-mono break-all'>{user.id}</p>
    </div>
  )
}

// The full lineage of one transaction. Slides in beside the ledger rather than
// navigating away, so an admin working through a list keeps their place.
const TracePanel = ({ trace, loading, onClose, onOpenUser }) => {
  if (!trace && !loading) return null

  const source = trace?.source
  const referral = source?.kind === 'referral' && !source.missing ? source : null
  const status = referral ? (REFERRAL_STATUS[referral.status] || ['bg-gray-100 text-gray-600', referral.status]) : null

  return (
    <div className='fixed inset-0 bg-black/40 z-50 flex justify-end' onClick={onClose}>
      <div className='bg-[#fafafa] w-full max-w-xl h-full overflow-y-auto p-6'
        onClick={(e) => e.stopPropagation()}>
        <div className='flex items-center justify-between gap-3 mb-4'>
          <p className='font-semibold'>Transaction trace</p>
          <button onClick={onClose} className='text-sm font-semibold text-[#757575]'>Close</button>
        </div>

        {loading && <p className='text-sm text-[#757575]'>Loading…</p>}

        {trace && (
          <>
            <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
              <p className='font-semibold text-sm mb-3'>The transaction</p>
              <Row label='Points' value={`${trace.isCredit ? '+' : '−'}${trace.points}`} />
              <Row label='Description' value={trace.description} />
              <Row label='Status' value={trace.status} />
              <Row label='Source' value={trace.referenceType || 'Not recorded'} />
              <Row label='When' value={getValidDateFormat(trace.createdAt)} />
              <Row label='Transaction id' value={trace.id} />
              {trace.metadata?.balanceBefore !== undefined && (
                <Row label='Balance'
                  value={`${trace.metadata.balanceBefore} → ${trace.metadata.balanceAfter}`} />
              )}
            </div>

            <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
              <p className='font-semibold text-sm mb-3'>Who</p>
              <UserLink label='Wallet owner' user={trace.user} onOpen={onOpenUser} />
              <UserLink label='Other party' user={trace.counterparty} onOpen={onOpenUser} />
              {trace.wallet && (
                <Row label='Wallet balance now'
                  value={`${trace.wallet.walletPoints} points (${trace.wallet.referralPoints} from referrals)`} />
              )}
            </div>

            {/* No referenceType means the row predates the provenance columns.
                Saying so is more useful than an empty panel that looks broken. */}
            {!trace.referenceType && (
              <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
                <p className='text-xs text-[#757575]'>
                  This transaction was written before wallet rows recorded where they came
                  from, so there is nothing to trace beyond the description above.
                </p>
              </div>
            )}

            {source?.missing && (
              <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
                <p className='text-xs text-amber-700'>
                  This transaction points at a {source.kind} that no longer exists
                  (<span className='font-mono'>{source.referralId || source.bookingId}</span>).
                </p>
              </div>
            )}

            {referral && (
              <>
                <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
                  <div className='flex items-center justify-between gap-3 mb-3'>
                    <p className='font-semibold text-sm'>The referral</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${status[0]}`}>
                      {status[1]}
                    </span>
                  </div>
                  <UserLink label='Referrer (owns the code)' user={referral.referrer} onOpen={onOpenUser} />
                  <UserLink label='Referee (used the code)' user={referral.referee} onOpen={onOpenUser} />
                  <Row label='Code used' value={referral.referralCode} />
                  <Row label='Signed up' value={getValidDateFormat(referral.signedUpAt)} />
                  <Row label='Credited'
                    value={referral.completedAt ? getValidDateFormat(referral.completedAt) : 'Not yet'} />
                  <Row label='Reward stages'
                    value={`sign-up ${referral.signupRewarded ? '✓' : '—'} · first booking ${referral.firstBookingRewarded ? '✓' : '—'}`} />
                  <Row label='Points to referrer' value={referral.pointsReferrer} />
                  <Row label='Points to referee' value={referral.pointsReferee} />
                  <Row label='Campaign' value={referral.campaign?.name} />
                </div>

                <div className='bg-white border border-gray-100 rounded-md p-5'>
                  <p className='font-semibold text-sm mb-1'>Every credit from this referral</p>
                  <p className='text-[11px] text-[#959595] mb-3'>
                    Both sides, both stages — this is the whole money trail for this one
                    relationship.
                  </p>
                  {referral.walletTransactions?.length ? referral.walletTransactions.map((t) => (
                    <div key={t.id}
                      className={`py-2 border-b border-gray-50 last:border-0 ${t.isCurrent ? 'bg-[#fffbea] -mx-2 px-2 rounded' : ''}`}>
                      <div className='flex justify-between gap-4'>
                        <p className='text-xs text-[#454545]'>{t.description}</p>
                        <p className={`text-xs font-semibold shrink-0 ${t.isCredit ? 'text-green-700' : 'text-red-600'}`}>
                          {t.isCredit ? '+' : '−'}{t.points}
                        </p>
                      </div>
                      <p className='text-[10px] text-[#959595]'>
                        {getValidDateFormat(t.createdAt)}
                        {t.isCurrent && <span className='font-semibold text-[#ECC032]'> · this row</span>}
                      </p>
                    </div>
                  )) : (
                    <p className='text-xs text-[#959595]'>No credits recorded yet.</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

export default function WalletTransactionsPage() {
  const router = useRouter()
  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState({ credited: 0, debited: 0, net: 0 })
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [referenceType, setReferenceType] = useState('')
  const [direction, setDirection] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [trace, setTrace] = useState(null)
  const [tracing, setTracing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAxios.get('/admin/wallet-transactions', {
        params: {
          offset, limit: LIMIT,
          search: search || undefined,
          referenceType: referenceType || undefined,
          direction: direction || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })
      setRows(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setTotals(res.data?.totals || { credited: 0, debited: 0, net: 0 })
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load wallet transactions')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, search, referenceType, direction, from, to])

  const openTrace = async (id) => {
    setTracing(true)
    setTrace(null)
    try {
      const res = await authAxios.get(`/admin/wallet-transactions/${id}`)
      setTrace(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not trace this transaction')
    } finally { setTracing(false) }
  }

  const openUser = (userId) => router.push(`/dashboard/users/${userId}`)

  // Any filter change has to reset paging, or page 3 of the old filter shows an
  // empty page 3 of the new one.
  const setFilter = (setter) => (value) => { setOffset(0); setter(value) }

  const filters = (
    <>
      <input className={`${input} flex-1 min-w-[220px] max-w-sm`}
        placeholder='Search by user name, email or phone'
        value={search} onChange={(e) => setFilter(setSearch)(e.target.value)} />
      <select className={input} value={referenceType}
        onChange={(e) => setFilter(setReferenceType)(e.target.value)}>
        {SOURCE_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <select className={input} value={direction}
        onChange={(e) => setFilter(setDirection)(e.target.value)}>
        <option value=''>Credits and debits</option>
        <option value='credit'>Credits only</option>
        <option value='debit'>Debits only</option>
      </select>
      <input type='date' className={input} value={from}
        onChange={(e) => setFilter(setFrom)(e.target.value)} />
      <input type='date' className={input} value={to}
        onChange={(e) => setFilter(setTo)(e.target.value)} />
    </>
  )

  return (
    <PageLayout title='Wallet Transactions' filters={filters}>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
        <Stat label='Transactions' value={count} />
        <Stat label='Points credited' value={totals.credited} tone='text-green-700' />
        <Stat label='Points debited' value={totals.debited} tone='text-red-600' />
        <Stat label='Net' value={totals.net} />
      </div>

      {loading ? (
        <p className='text-sm text-[#757575] p-4'>Loading…</p>
      ) : rows.length === 0 ? (
        <p className='text-sm text-[#757575] p-4'>
          {search || referenceType || direction || from || to
            ? 'No transaction matches these filters.'
            : 'No wallet transactions yet.'}
        </p>
      ) : (
        <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-100 text-left'>
                {['User', 'Description', 'Source', 'Other party', 'Points', 'When'].map((h) => (
                  <th key={h} className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} onClick={() => openTrace(t.id)}
                  className='border-b border-gray-50 last:border-0 hover:bg-[#fafafa] cursor-pointer'>
                  <td className='px-4 py-3'>
                    <p className='text-xs font-semibold text-[#454545]'>
                      {t.user?.name || <span className='text-[#959595]'>Deleted user</span>}
                    </p>
                    <p className='text-[11px] text-[#959595]'>{t.user?.phone || t.user?.email || ''}</p>
                  </td>
                  <td className='px-4 py-3 text-xs text-[#454545] max-w-[320px]'>{t.description}</td>
                  <td className='px-4 py-3'>
                    {t.referenceType ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SOURCE_PILL[t.referenceType] || 'bg-gray-100 text-gray-600'}`}>
                        {t.referenceType}
                      </span>
                    ) : <span className='text-[11px] text-gray-400'>—</span>}
                  </td>
                  <td className='px-4 py-3 text-xs text-[#454545]'>{t.counterparty?.name || '—'}</td>
                  <td className={`px-4 py-3 text-xs font-semibold ${t.isCredit ? 'text-green-700' : 'text-red-600'}`}>
                    {t.isCredit ? '+' : '−'}{t.points}
                  </td>
                  <td className='px-4 py-3 text-[11px] text-[#757575]'>{getValidDateFormat(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination offset={offset} setOffset={setOffset} count={count} limit={LIMIT} />

      <p className='text-[11px] text-[#959595] mt-3'>
        Click any row to trace it back to the user, the referral and the campaign that
        produced it.
      </p>

      <TracePanel trace={trace} loading={tracing}
        onClose={() => setTrace(null)} onOpenUser={openUser} />
    </PageLayout>
  )
}
