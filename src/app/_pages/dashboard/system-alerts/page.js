'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

const STYLE = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
}

// Derived from real signals (pending approvals, stuck bookings, unresolved
// disputes, failed webhooks, unreviewed KYC, low memory) — not a stored feed.
export default function SystemAlerts() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const res = await authAxios.get('/admin/system-alerts')
      setData(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load alerts')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Notifications & Alerts'} RightContent={() => (
        <button type='button' className='btn-md-disabled' onClick={load}>Refresh</button>
      )} />
      <p className='text-xs text-[#757575] px-1 pt-3'>
        Live operational signals, computed on request. Nothing is stored — these reflect the current state of the platform.
      </p>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Checking…</p>}

      {!loading && data?.healthy && (
        <div className='bg-green-50 border border-green-200 text-green-700 rounded-md px-6 py-8 mt-4 text-center'>
          <p className='text-sm font-semibold'>Nothing needs attention</p>
          <p className='text-xs mt-1'>No pending approvals, stuck bookings, unresolved disputes or failed webhooks.</p>
        </div>
      )}

      {!loading && !data?.healthy && (
        <div className='mt-4 space-y-2'>
          {data.alerts.map((a, i) => (
            <div key={i} className={`border rounded-md px-5 py-4 flex justify-between items-center ${STYLE[a.severity]}`}>
              <div>
                <p className='text-sm font-semibold'>{a.title}</p>
                <p className='text-xs opacity-80'>{a.area} · {a.severity}</p>
              </div>
              {a.action && <Link href={`${a.action}/`} className='btn-md-disabled shrink-0'>View</Link>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
