'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'

const Tile = ({ label, value, sub }) => (
  <div className='bg-white border border-gray-100 rounded-md px-5 py-4'>
    <p className='text-[11px] uppercase tracking-tight text-[#757575] font-semibold'>{label}</p>
    <p className='text-2xl font-bold tracking-tight mt-1'>{value}</p>
    {sub && <p className='text-xs text-[#959595] mt-0.5'>{sub}</p>}
  </div>
)

// Green above 80%, red below 50% — the thresholds operations actually act on.
const Rate = ({ value, invert }) => {
  const good = invert ? value < 10 : value >= 80
  const bad = invert ? value > 25 : value < 50
  return (
    <span className={good ? 'text-green-600' : bad ? 'text-red-500' : 'text-[#454545]'}>
      {value}%
    </span>
  )
}

const input = 'border border-gray-200 rounded-md px-3 py-1.5 text-sm outline-none focus:border-[#ECC032]'

export default function DriverReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState({ from: '', to: '' })

  const load = async (params = {}) => {
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/reports/driver', { params })
      setData(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load driver report')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const exportCsv = () => {
    if (!data?.drivers?.length) return
    const cols = ['name', 'email', 'contactNumber', 'bookings', 'completed', 'cancelled',
      'completionRate', 'cancellationRate', 'onTimeRate', 'rating', 'revenue']
    const csv = [
      cols.join(','),
      ...data.drivers.map((d) => cols.map((c) => `"${String(d[c] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = `driver-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const s = data?.summary

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title='Driver Reports' RightContent={() => (
        <button onClick={exportCsv} disabled={!data?.drivers?.length}
          className='border border-gray-200 text-sm font-semibold px-4 py-2 rounded-md'>
          Export CSV
        </button>
      )} />

      <div className='flex flex-wrap items-end gap-3 my-4'>
        <div>
          <label className='block text-[11px] font-semibold text-[#757575] mb-1'>From</label>
          <input type='date' className={input} value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })} />
        </div>
        <div>
          <label className='block text-[11px] font-semibold text-[#757575] mb-1'>To</label>
          <input type='date' className={input} value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        <button onClick={() => load(range)} className='bg-[#ECC032] text-black text-sm font-semibold px-4 py-2 rounded-md'>
          Apply
        </button>
        {(range.from || range.to) && (
          <button onClick={() => { setRange({ from: '', to: '' }); load() }}
            className='text-sm font-semibold text-[#757575]'>Clear</button>
        )}
      </div>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && s && (
        <>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
            <Tile label='Total drivers' value={s.totalDrivers} sub={`${s.activeDrivers} with bookings in range`} />
            <Tile label='Bookings' value={s.totalBookings} />
            <Tile label='Revenue' value={`₹${Number(s.totalRevenue).toLocaleString('en-IN')}`} />
            <Tile label='Avg rating' value={s.avgRating ?? '—'}
              sub={`${s.avgCompletionRate}% completion · ${s.avgCancellationRate}% cancelled`} />
          </div>

          <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
                  <th className='px-4 py-3 font-semibold'>Driver</th>
                  <th className='px-4 py-3 font-semibold'>Bookings</th>
                  <th className='px-4 py-3 font-semibold'>Completed</th>
                  <th className='px-4 py-3 font-semibold'>Cancelled</th>
                  <th className='px-4 py-3 font-semibold'>Completion</th>
                  <th className='px-4 py-3 font-semibold'>Cancel rate</th>
                  <th className='px-4 py-3 font-semibold'>On time</th>
                  <th className='px-4 py-3 font-semibold'>Rating</th>
                  <th className='px-4 py-3 font-semibold'>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.drivers.length === 0 && (
                  <tr><td colSpan={9} className='px-4 py-6 text-[#757575]'>No drivers found.</td></tr>
                )}
                {data.drivers.map((d) => (
                  <tr key={d.hostId} className='border-b border-gray-50 last:border-b-0'>
                    <td className='px-4 py-3'>
                      <p className='font-medium'>{d.name}</p>
                      <p className='text-[11px] text-[#959595]'>
                        {d.email || d.contactNumber || '—'}
                        {!d.isActive && <span className='text-red-500 ml-1'>· inactive</span>}
                        {!d.kycVerified && <span className='text-amber-600 ml-1'>· KYC pending</span>}
                      </p>
                    </td>
                    <td className='px-4 py-3'>{d.bookings}</td>
                    <td className='px-4 py-3'>{d.completed}</td>
                    <td className='px-4 py-3'>{d.cancelled}</td>
                    <td className='px-4 py-3 font-semibold'><Rate value={d.completionRate} /></td>
                    <td className='px-4 py-3 font-semibold'><Rate value={d.cancellationRate} invert /></td>
                    <td className='px-4 py-3'>{d.onTimeRate}%</td>
                    <td className='px-4 py-3'>{d.rating ?? '—'} {d.reviews > 0 && <span className='text-[11px] text-[#959595]'>({d.reviews})</span>}</td>
                    <td className='px-4 py-3 font-semibold'>₹{Number(d.revenue).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className='text-[11px] text-[#959595] mt-2'>
            Rates are calculated over bookings in the selected range. Drivers with no bookings in range still appear, with zeros.
          </p>
        </>
      )}
    </div>
  )
}
