'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

const Tile = ({ label, value, sub }) => (
  <div className='bg-white border border-gray-100 rounded-md px-5 py-4'>
    <p className='text-[11px] uppercase tracking-tight text-[#757575] font-semibold'>{label}</p>
    <p className='text-2xl font-bold tracking-tight mt-1'>{value}</p>
    {sub && <p className='text-xs text-[#959595] mt-0.5'>{sub}</p>}
  </div>
)

export default function OperationalReport() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await authAxios.get('/admin/reports/operational')
        setData(res.data)
      } catch (error) {
        ErrorToast(error?.response?.data?.error || 'Could not load report')
      } finally { setLoading(false) }
    })()
  }, [])

  const s = data?.summary
  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Performance Reports'} RightContent={() => null} />
      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}
      {!loading && s && (
        <>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-3 my-4'>
            <Tile label='Fleet size' value={s.totalVehicles} />
            <Tile label='Active vehicles' value={s.activeVehicles} />
            <Tile label='Awaiting approval' value={s.pendingApproval} />
            <Tile label='Vehicles booked' value={s.vehiclesBooked} sub={`${s.utilisationPct}% fleet utilisation`} />
          </div>
          <div className='bg-white border border-gray-100 rounded-md p-5'>
            <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-3'>Most booked vehicles</p>
            {(data.topVehicles || []).length === 0 && <p className='text-sm text-[#757575]'>No bookings in range.</p>}
            {(data.topVehicles || []).map((v) => (
              <div key={v.vehicleId} className='flex justify-between py-2 border-b border-gray-50 last:border-b-0'>
                <span className='text-xs text-[#757575] truncate max-w-[60%]'>{v.vehicleId}</span>
                <span className='text-sm font-semibold'>{v.bookings} bookings · ₹{Number(v.revenue || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
