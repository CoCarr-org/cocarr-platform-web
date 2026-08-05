'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'
import Pagination from '@/app/_components/Pagination'
import { LIMIT } from '@/app/_helpers/constants'

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`
const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—')

const STATUS = {
  pending: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  on_hold: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const Badge = ({ status }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[status] || STATUS.pending}`}>
    {String(status || '').replace('_', ' ')}
  </span>
)

const Tile = ({ label, value, sub }) => (
  <div className='bg-white border border-gray-100 rounded-md px-5 py-4'>
    <p className='text-[11px] uppercase tracking-tight text-[#757575] font-semibold'>{label}</p>
    <p className='text-2xl font-bold tracking-tight mt-1'>{value}</p>
    {sub && <p className='text-xs text-[#959595] mt-0.5'>{sub}</p>}
  </div>
)

export default function Settlements() {
  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState({ netPayable: 0, paid: 0 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(null)
  const [preview, setPreview] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAxios.get('/admin/settlements', {
        params: { offset, limit: LIMIT, status: status || undefined },
      })
      setRows(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setTotals(res.data?.totals || { netPayable: 0, paid: 0 })
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load settlements')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, status])

  // Dry run never creates records or moves money — it is the safe way to see
  // what Monday's job would do.
  const dryRun = async () => {
    setBusy('dry')
    try {
      const res = await authAxios.post('/admin/settlements/run', { dryRun: true })
      setPreview(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not run preview')
    } finally { setBusy(null) }
  }

  const runNow = async () => {
    const total = preview ? money(preview.totals.netPayable) : 'an unknown amount'
    if (!window.confirm(
      `This pays ${total} to ${preview?.settlements?.length ?? 'an unknown number of'} host(s) through the payment gateway. `
      + 'It cannot be undone. Continue?'
    )) return
    setBusy('run')
    try {
      const res = await authAxios.post('/admin/settlements/run', { dryRun: false })
      const failed = (res.data.settlements || []).filter((s) => s.status === 'failed').length
      InfoToast(failed ? `Run finished with ${failed} failure(s)` : 'Settlement run finished')
      setPreview(null)
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Settlement run failed')
    } finally { setBusy(null) }
  }

  const retry = async (row) => {
    if (!window.confirm(`Retry the payout of ${money(row.netPayable)} to ${row.host?.name || 'this host'}?`)) return
    setBusy(row.id)
    try {
      await authAxios.post(`/admin/settlements/${row.id}/retry`)
      InfoToast('Retry submitted')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Retry failed')
    } finally { setBusy(null) }
  }

  return (
    <div className='max-w-7xl mx-auto pb-10'>
      <Header title='Host Settlements' RightContent={() => (
        <div className='flex gap-2'>
          <button onClick={dryRun} disabled={busy === 'dry'}
            className='border border-gray-200 text-sm font-semibold px-4 py-2 rounded-md'>
            {busy === 'dry' ? 'Checking…' : 'Preview this week'}
          </button>
          <button onClick={runNow} disabled={busy === 'run'}
            className='bg-[#ECC032] text-black text-sm font-semibold px-4 py-2 rounded-md'>
            {busy === 'run' ? 'Running…' : 'Run now'}
          </button>
        </div>
      )} />

      <p className='text-sm text-[#757575] my-3'>
        Runs automatically every Monday morning for the week that just ended (Monday 00:00 to Sunday 23:59).
        Bookings with an unresolved damage claim or open dispute are held back and settle in a later run.
      </p>

      <div className='grid grid-cols-2 md:grid-cols-3 gap-3 mb-4'>
        <Tile label='Settlements' value={count} />
        <Tile label='Total net payable' value={money(totals.netPayable)} />
        <Tile label='Paid out' value={money(totals.paid)} />
      </div>

      {preview && (
        <div className='bg-blue-50 border border-blue-200 rounded-md p-5 mb-4'>
          <div className='flex justify-between items-start mb-3'>
            <div>
              <p className='text-sm font-semibold text-blue-900'>Preview — nothing has been paid</p>
              <p className='text-xs text-blue-700 mt-0.5'>
                {day(preview.period.periodStart)} to {day(preview.period.periodEnd)} ·{' '}
                {preview.settlements.length} host(s) · {money(preview.totals.netPayable)} across{' '}
                {preview.totals.bookings} booking(s)
                {preview.totals.held > 0 && ` · ${money(preview.totals.held)} held`}
              </p>
            </div>
            <button onClick={() => setPreview(null)} className='text-xs text-blue-700 font-semibold'>Dismiss</button>
          </div>
          {preview.settlements.map((s) => (
            <div key={s.hostId} className='flex justify-between text-xs py-1 border-b border-blue-100 last:border-b-0'>
              <span className='text-blue-900'>{s.hostName || s.hostId}</span>
              <span className='font-semibold text-blue-900'>
                {money(s.netPayable)} · {s.bookingCount} booking(s)
                {s.heldBookingCount > 0 && <span className='text-amber-700'> · {s.heldBookingCount} held</span>}
              </span>
            </div>
          ))}
          {preview.skipped?.length > 0 && (
            <p className='text-[11px] text-blue-700 mt-2'>
              {preview.skipped.length} host(s) skipped — {preview.skipped[0].reason}
              {preview.skipped.length > 1 ? ', and others' : ''}
            </p>
          )}
        </div>
      )}

      <div className='flex items-center gap-3 py-2 px-1'>
        <select className={input} value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }}>
          <option value=''>Any status</option>
          <option value='pending'>Pending</option>
          <option value='submitted'>Submitted</option>
          <option value='paid'>Paid</option>
          <option value='failed'>Failed</option>
          <option value='on_hold'>On hold</option>
        </select>
        <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
      </div>

      <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
              <th className='px-4 py-3 font-semibold'>Host</th>
              <th className='px-4 py-3 font-semibold'>Period</th>
              <th className='px-4 py-3 font-semibold'>Bookings</th>
              <th className='px-4 py-3 font-semibold'>Gross</th>
              <th className='px-4 py-3 font-semibold'>Commission</th>
              <th className='px-4 py-3 font-semibold'>GST</th>
              <th className='px-4 py-3 font-semibold'>Net paid</th>
              <th className='px-4 py-3 font-semibold'>Status</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className='px-4 py-6 text-[#757575]'>Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={9} className='px-4 py-6 text-[#757575]'>
                No settlements yet. Use &ldquo;Preview this week&rdquo; to see what the next run would pay.
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className='border-b border-gray-50 last:border-b-0'>
                <td className='px-4 py-3'>
                  <p className='font-medium'>{r.host?.name || '—'}</p>
                  <p className='text-[11px] text-[#959595]'>{r.host?.email || r.host?.contactNumber || ''}</p>
                </td>
                <td className='px-4 py-3 text-xs'>{day(r.periodStart)} – {day(r.periodEnd)}</td>
                <td className='px-4 py-3'>
                  {r.bookingCount}
                  {r.heldBookingCount > 0 && (
                    <span className='block text-[11px] text-amber-600' title='Held pending damage or dispute'>
                      +{r.heldBookingCount} held
                    </span>
                  )}
                </td>
                <td className='px-4 py-3 text-xs'>{money(r.grossAmount)}</td>
                <td className='px-4 py-3 text-xs text-red-500'>−{money(r.commissionAmount)}</td>
                <td className='px-4 py-3 text-xs'>{money(r.gstAmount)}</td>
                <td className='px-4 py-3 font-semibold'>{money(r.netPayable)}</td>
                <td className='px-4 py-3'>
                  <Badge status={r.status} />
                  {r.failureReason && (
                    <p className='text-[11px] text-red-500 mt-1 max-w-[180px]'>{r.failureReason}</p>
                  )}
                  {r.gatewayStatus && r.status !== 'failed' && (
                    <p className='text-[10px] text-[#959595] mt-1'>gateway: {r.gatewayStatus}</p>
                  )}
                </td>
                <td className='px-4 py-3 text-right'>
                  {['failed', 'on_hold'].includes(r.status) && (
                    <button disabled={busy === r.id} onClick={() => retry(r)}
                      className='text-xs font-semibold text-[#454545] disabled:opacity-50'>
                      {busy === r.id ? '…' : 'Retry'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className='text-[11px] text-[#959595] mt-2'>
        &ldquo;Submitted&rdquo; means the transfer was accepted by the gateway. It becomes &ldquo;paid&rdquo; only when the
        gateway confirms the money moved, via webhook — so a submitted settlement is not yet money in the host&rsquo;s account.
      </p>
    </div>
  )
}
