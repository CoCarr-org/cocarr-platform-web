'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const Tile = ({ label, value, sub }) => (
  <div className='bg-white border border-gray-100 rounded-md px-5 py-4 shadow-xs shadow-gray-200'>
    <p className='text-[11px] uppercase tracking-tight text-[#757575] font-semibold'>{label}</p>
    <p className='text-2xl font-bold tracking-tight mt-1'>{value}</p>
    {sub && <p className='text-xs text-[#959595] mt-0.5'>{sub}</p>}
  </div>
)

export default function Reports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  async function load() {
    try {
      setLoading(true)
      let q = []
      if (from) q.push(`from=${from}`)
      if (to) q.push(`to=${to}`)
      const res = await coreApi().get(`/admin/reports${q.length ? `?${q.join('&')}` : ''}`)
      setData(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [from, to])

  const s = data?.summary
  const maxBookings = Math.max(1, ...(data?.byDay || []).map((d) => Number(d.bookings) || 0))

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Reports & Analytics'} RightContent={() => null} />

      <div className='flex gap-3 items-end px-1 py-4'>
        <div>
          <label className='text-xs text-[#757575] block mb-1'>From</label>
          <input type='date' className='text-input' value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className='text-xs text-[#757575] block mb-1'>To</label>
          <input type='date' className='text-input' value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(from || to) && (
          <button type='button' className='btn-md-disabled' onClick={() => { setFrom(''); setTo('') }}>Clear</button>
        )}
      </div>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && s && (
        <>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-3 mb-6'>
            <Tile label='Revenue' value={inr(s.revenue)} sub='Finished + ongoing bookings' />
            <Tile label='Total Bookings' value={s.totalBookings} />
            <Tile label='Completed' value={s.finishedBookings} sub={`${s.completionRate}% completion rate`} />
            <Tile label='Cancelled' value={s.cancelledBookings} />
            <Tile label='Users' value={s.totalUsers} sub='All time' />
            <Tile label='Vehicles' value={s.totalVehicles} sub='All time' />
          </div>

          <div className='bg-white border border-gray-100 rounded-md p-5 mb-6 shadow-xs shadow-gray-200'>
            <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>Bookings per day</p>
            {(data.byDay || []).length === 0 ? (
              <p className='text-sm text-[#757575]'>No bookings in this range.</p>
            ) : (
              <div className='flex items-end gap-1 h-40'>
                {data.byDay.map((d) => (
                  <div key={d.day} className='flex-1 flex flex-col items-center justify-end group relative'>
                    <div
                      className='w-full bg-[#ECC032] rounded-t transition-all'
                      style={{ height: `${(Number(d.bookings) / maxBookings) * 100}%`, minHeight: '2px' }}
                      title={`${d.day}: ${d.bookings} bookings, ${inr(d.revenue)}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='bg-white border border-gray-100 rounded-md p-5 shadow-xs shadow-gray-200'>
            <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-3'>Bookings by status</p>
            {(data.statusBreakdown || []).map((row) => (
              <div key={row.status} className='flex justify-between items-center py-2 border-b border-gray-50 last:border-b-0'>
                <span className='text-sm capitalize'>{row.status}</span>
                <span className='text-sm font-semibold'>{row.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
