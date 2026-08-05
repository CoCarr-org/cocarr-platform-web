'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'
import Pagination from '@/app/_components/Pagination'
import { LIMIT } from '@/app/_helpers/constants'

// Rider refunds — deposit back, less what they owe.
//
// Distinct from Settlements, which pays HOSTS. The daily job builds this list
// once a booking's 7-day hold has elapsed and no damage claim is still open;
// an admin then checks the figures and initiates.
const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'
const money = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`
const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—')

const STATUS = {
  pending_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-50 text-blue-700',
  processing: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  rejected: 'bg-gray-100 text-gray-500',
}

const Badge = ({ status }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[status] || STATUS.pending_review}`}>
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

// Editable deduction row. Module scope — inline it would remount and drop focus.
const Deduction = ({ label, field, value, onChange, disabled }) => (
  <div className='flex items-center justify-between gap-3 py-1.5'>
    <span className='text-xs text-[#454545]'>{label}</span>
    <div className='flex items-center gap-1'>
      <span className='text-xs text-[#959595]'>−₹</span>
      <input type='number' min='0' disabled={disabled}
        className='border border-gray-200 rounded-md px-2 py-1 text-sm w-28 text-right outline-none focus:border-[#ECC032] disabled:bg-gray-50'
        value={value ?? 0} onChange={(e) => onChange(field, e.target.value)} />
    </div>
  </div>
)

export default function RefundRequests() {
  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState({})
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('pending_review')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(null)
  const [open, setOpen] = useState(null)     // the detail being reviewed
  const [edits, setEdits] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAxios.get('/admin/refunds', {
        params: { offset, limit: LIMIT, status: status || undefined },
      })
      setRows(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setTotals(res.data?.totals || {})
      setCounts(res.data?.counts || {})
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load refunds')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, status])

  const openDetail = async (id) => {
    setBusy(`open-${id}`)
    try {
      const res = await authAxios.get(`/admin/refunds/${id}`)
      setOpen(res.data)
      setEdits({})
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load this refund')
    } finally { setBusy(null) }
  }

  const setField = (field, value) => setEdits((e) => ({ ...e, [field]: value }))

  const val = (field) => (edits[field] !== undefined ? edits[field] : open?.[field] ?? 0)

  const deductionTotal = ['damagePayable', 'fuelCharge', 'extraHourCharge', 'extraKmCharge',
    'cleaningCharge', 'otherDeduction', 'cancellationFee']
    .reduce((a, f) => a + Number(val(f) || 0), 0)

  const projectedRefund = Math.max(0,
    Number(open?.depositAmount || 0) + Number(open?.refundableFare || 0) - deductionTotal)

  const save = async (approve) => {
    setBusy('save')
    try {
      await authAxios.put(`/admin/refunds/${open.id}`, { ...edits, approve })
      InfoToast(approve ? 'Refund approved' : 'Saved')
      const res = await authAxios.get(`/admin/refunds/${open.id}`)
      setOpen(res.data); setEdits({})
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not save')
    } finally { setBusy(null) }
  }

  const process = async () => {
    if (!window.confirm(
      `Send ${money(open.refundAmount)} back to ${open.user?.name || 'the rider'}? This cannot be undone.`
    )) return
    setBusy('process')
    try {
      const res = await authAxios.post(`/admin/refunds/${open.id}/process`)
      InfoToast('Refund sent to the gateway')
      setOpen(res.data)
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Refund failed')
    } finally { setBusy(null) }
  }

  const reject = async () => {
    const why = window.prompt('Why is no refund due?')
    if (why === null) return
    if (!why.trim()) { ErrorToast('A reason is required'); return }
    setBusy('reject')
    try {
      await authAxios.post(`/admin/refunds/${open.id}/reject`, { reason: why.trim() })
      InfoToast('Refund rejected')
      setOpen(null)
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not reject')
    } finally { setBusy(null) }
  }

  const runJob = async (dryRun) => {
    setBusy('build')
    try {
      const res = await authAxios.post('/admin/refunds/build', { dryRun })
      const r = res.data
      InfoToast(dryRun
        ? `Would add ${r.created.length} · ${r.blocked.length} held`
        : `Added ${r.created.length} to the list`)
      if (!dryRun) await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not run the job')
    } finally { setBusy(null) }
  }

  // ── Detail ──
  if (open) {
    const editable = ['pending_review', 'approved'].includes(open.status)
    const changed = open.calculatedAmount !== open.refundAmount

    return (
      <div className='max-w-4xl mx-auto pb-10'>
        <Header title='Review refund' RightContent={() => (
          <button onClick={() => { setOpen(null); setEdits({}) }} className='text-sm font-semibold text-[#454545]'>
            ← Back to refunds
          </button>
        )} />

        <div className='bg-white border border-gray-100 rounded-md p-5 my-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='font-semibold'>{open.user?.name || '—'}</p>
              <p className='text-[11px] text-[#959595]'>
                Booking {open.booking?.bookingId || '—'} · {open.type === 'cancellation' ? 'Cancelled' : 'Ride completed'}
                {open.booking?.dropTime && ` · returned ${day(open.booking.dropTime)}`}
              </p>
            </div>
            <Badge status={open.status} />
          </div>
        </div>

        {/* What the rules produced, before any admin edit. */}
        {open.calculation?.lines?.length > 0 && (
          <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
            <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-3'>Calculated breakdown</p>
            {open.calculation.lines.map((l, i) => (
              <div key={i} className='flex justify-between gap-4 py-1 border-b border-gray-50 last:border-b-0'>
                <span className='text-xs text-[#454545]'>
                  {l.label}
                  {l.warning && <span className='block text-[10px] text-amber-600'>⚠ {l.warning}</span>}
                </span>
                <span className={`text-xs font-semibold shrink-0 ${l.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {l.amount < 0 ? '−' : '+'}{money(Math.abs(l.amount))}
                </span>
              </div>
            ))}
            {open.calculation.shortfall > 0 && (
              <div className='mt-3 bg-red-50 border-l-2 border-red-400 px-3 py-2'>
                <p className='text-[11px] text-red-800'>
                  Deductions exceed the deposit by {money(open.calculation.shortfall)} — the rider owes this,
                  it is not a refund. Collect it separately.
                </p>
              </div>
            )}
          </div>
        )}

        <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
          <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-3'>Adjust deductions</p>

          <div className='flex justify-between py-1.5 border-b border-gray-100 mb-2'>
            <span className='text-xs font-semibold text-[#454545]'>Security deposit</span>
            <span className='text-sm font-bold'>{money(open.depositAmount)}</span>
          </div>
          {open.refundableFare > 0 && (
            <div className='flex justify-between py-1.5 border-b border-gray-100 mb-2'>
              <span className='text-xs font-semibold text-[#454545]'>Refundable fare</span>
              <span className='text-sm font-bold'>{money(open.refundableFare)}</span>
            </div>
          )}

          <Deduction label={`Damage excess${open.damageCoveredByPlan ? ` (plan covered ${money(open.damageCoveredByPlan)})` : ''}`}
            field='damagePayable' value={val('damagePayable')} onChange={setField} disabled={!editable} />
          <Deduction label='Fuel' field='fuelCharge' value={val('fuelCharge')} onChange={setField} disabled={!editable} />
          <Deduction label='Late return' field='extraHourCharge' value={val('extraHourCharge')} onChange={setField} disabled={!editable} />
          <Deduction label='Extra kilometres' field='extraKmCharge' value={val('extraKmCharge')} onChange={setField} disabled={!editable} />
          <Deduction label='Cleaning' field='cleaningCharge' value={val('cleaningCharge')} onChange={setField} disabled={!editable} />
          {open.type === 'cancellation' && (
            <Deduction label='Cancellation fee' field='cancellationFee' value={val('cancellationFee')} onChange={setField} disabled={!editable} />
          )}
          <Deduction label='Other' field='otherDeduction' value={val('otherDeduction')} onChange={setField} disabled={!editable} />

          {Number(val('otherDeduction')) > 0 && (
            <input className={`${input} w-full mt-1`} disabled={!editable}
              placeholder='Reason for the additional deduction (required)'
              value={edits.otherDeductionReason ?? open.otherDeductionReason ?? ''}
              onChange={(e) => setField('otherDeductionReason', e.target.value)} />
          )}

          <div className='flex justify-between items-center mt-4 pt-3 border-t border-gray-200'>
            <span className='text-sm font-semibold'>Refund to rider</span>
            <span className='text-2xl font-bold'>{money(projectedRefund)}</span>
          </div>
          {changed && (
            <p className='text-[11px] text-amber-600 mt-1 text-right'>
              Adjusted from the calculated {money(open.calculatedAmount)}
            </p>
          )}

          <textarea className={`${input} w-full mt-3 min-h-[60px]`} disabled={!editable}
            placeholder='Notes (optional)'
            value={edits.adminNotes ?? open.adminNotes ?? ''}
            onChange={(e) => setField('adminNotes', e.target.value)} />

          {editable && (
            <div className='flex flex-wrap gap-2 mt-4'>
              <button onClick={() => save(false)} disabled={busy === 'save'}
                className='border border-gray-200 text-sm font-semibold px-4 py-2 rounded-md'>
                Save
              </button>
              {open.status === 'pending_review' && (
                <button onClick={() => save(true)} disabled={busy === 'save'}
                  className='bg-[#ECC032] text-black text-sm font-semibold px-4 py-2 rounded-md'>
                  Approve
                </button>
              )}
              {open.status === 'approved' && (
                <button onClick={process} disabled={busy === 'process' || open.refundAmount <= 0}
                  className='bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50'>
                  {busy === 'process' ? 'Sending…' : `Refund ${money(open.refundAmount)}`}
                </button>
              )}
              <button onClick={reject} className='text-sm font-semibold text-red-600 px-3 py-2'>
                No refund due
              </button>
            </div>
          )}

          {open.failureReason && (
            <p className='text-[11px] text-red-600 mt-3'>Gateway: {open.failureReason}</p>
          )}
        </div>

        {open.damages?.length > 0 && (
          <div className='bg-white border border-gray-100 rounded-md p-5'>
            <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>Damage claims</p>
            {open.damages.map((d) => (
              <div key={d.id} className='flex justify-between py-1.5 border-b border-gray-50 last:border-b-0'>
                <span className='text-xs text-[#454545]'>
                  {d.damagedPart || d.damageType || 'Claim'} · <span className='capitalize'>{d.damageStatus}</span>
                </span>
                <span className='text-xs font-semibold'>{money(d.assessedAmount ?? d.damageAmount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── List ──
  return (
    <div className='max-w-7xl mx-auto pb-10'>
      <Header title='Refunds' RightContent={() => (
        <div className='flex gap-2'>
          <button onClick={() => runJob(true)} disabled={busy === 'build'}
            className='border border-gray-200 text-sm font-semibold px-4 py-2 rounded-md'>
            Preview
          </button>
          <button onClick={() => runJob(false)} disabled={busy === 'build'}
            className='bg-[#ECC032] text-black text-sm font-semibold px-4 py-2 rounded-md'>
            {busy === 'build' ? 'Running…' : 'Run job now'}
          </button>
        </div>
      )} />

      <p className='text-sm text-[#757575] my-3'>
        Built daily, 7 days after a ride ends or a booking is cancelled. Bookings with an unresolved
        damage claim are held back until the assessment is complete.
      </p>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
        <Tile label='Awaiting review' value={counts.pending_review ?? 0} sub={money(totals.pending)} />
        <Tile label='Approved' value={counts.approved ?? 0} sub={money(totals.approved)} />
        <Tile label='Processing' value={counts.processing ?? 0} />
        <Tile label='Failed' value={counts.failed ?? 0} sub={counts.failed ? 'needs attention' : ''} />
      </div>

      <div className='flex items-center gap-3 py-2 px-1'>
        <select className={input} value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }}>
          <option value='pending_review'>Awaiting review</option>
          <option value='approved'>Approved</option>
          <option value='processing'>Processing</option>
          <option value='completed'>Completed</option>
          <option value='failed'>Failed</option>
          <option value='rejected'>Rejected</option>
          <option value=''>All</option>
        </select>
        <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
      </div>

      <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
              <th className='px-4 py-3 font-semibold'>Rider</th>
              <th className='px-4 py-3 font-semibold'>Booking</th>
              <th className='px-4 py-3 font-semibold'>Type</th>
              <th className='px-4 py-3 font-semibold'>Deposit</th>
              <th className='px-4 py-3 font-semibold'>Deductions</th>
              <th className='px-4 py-3 font-semibold'>Refund</th>
              <th className='px-4 py-3 font-semibold'>Status</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className='px-4 py-6 text-[#757575]'>Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className='px-4 py-6 text-[#757575]'>Nothing in this queue.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className='border-b border-gray-50 last:border-b-0'>
                <td className='px-4 py-3'>
                  <p className='font-medium'>{r.user?.name || '—'}</p>
                  <p className='text-[11px] text-[#959595]'>{r.user?.email || r.user?.contactNumber || ''}</p>
                </td>
                <td className='px-4 py-3 text-xs'>{r.booking?.bookingId || '—'}</td>
                <td className='px-4 py-3 text-xs'>{r.type === 'cancellation' ? 'Cancellation' : 'Ride'}</td>
                <td className='px-4 py-3 text-xs'>{money(r.depositAmount)}</td>
                <td className='px-4 py-3 text-xs text-red-600'>
                  {r.totalDeductions ? `−${money(r.totalDeductions)}` : '—'}
                </td>
                <td className='px-4 py-3 font-semibold'>{money(r.refundAmount)}</td>
                <td className='px-4 py-3'><Badge status={r.status} /></td>
                <td className='px-4 py-3 text-right'>
                  <button disabled={busy === `open-${r.id}`} onClick={() => openDetail(r.id)}
                    className='text-xs font-semibold text-[#454545]'>
                    {busy === `open-${r.id}` ? '…' : 'Review'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className='text-[11px] text-[#959595] mt-2'>
        A refund is only &ldquo;completed&rdquo; once the gateway confirms it by webhook — &ldquo;processing&rdquo;
        means it was accepted, not that the money has landed.
      </p>
    </div>
  )
}
