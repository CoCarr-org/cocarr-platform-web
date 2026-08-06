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

export default function CustomerReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await coreApi().get('/admin/reports/customer')
        setData(res.data)
      } catch (error) {
        ErrorToast(error?.response?.data?.error || 'Could not load report')
      } finally { setLoading(false) }
    })()
  }, [])

  const s = data?.summary
  const maxSignups = Math.max(1, ...(data?.signupsByDay || []).map((d) => Number(d.signups) || 0))

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Customer Reports'} RightContent={() => null} />
      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}
      {!loading && s && (
        <>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-3 my-4'>
            <Tile label='Total customers' value={s.totalUsers} />
            <Tile label='New in range' value={s.newUsers} />
            <Tile label='Have booked' value={s.customersWhoBooked} sub={`${s.conversionPct}% of all users`} />
            <Tile label='Repeat customers' value={s.repeatCustomers} sub={`${s.repeatRatePct}% of bookers`} />
          </div>

          <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
            <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>Sign-ups per day</p>
            {(data.signupsByDay || []).length === 0
              ? <p className='text-sm text-[#757575]'>No sign-ups in this range.</p>
              : (
                <div className='flex items-end gap-1 h-32'>
                  {data.signupsByDay.map((d) => (
                    <div key={d.day} className='flex-1 bg-[#ECC032] rounded-t' title={`${d.day}: ${d.signups}`}
                      style={{ height: `${(Number(d.signups) / maxSignups) * 100}%`, minHeight: '2px' }} />
                  ))}
                </div>
              )}
          </div>

          <div className='bg-white border border-gray-100 rounded-md p-5'>
            <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-3'>Top customers by spend</p>
            {(data.topCustomers || []).map((c) => (
              <div key={c.userId} className='flex justify-between py-2 border-b border-gray-50 last:border-b-0'>
                <span className='text-xs text-[#757575] truncate max-w-[60%]'>{c.userId}</span>
                <span className='text-sm font-semibold'>₹{Number(c.spend || 0).toLocaleString('en-IN')} · {c.bookings} bookings</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
