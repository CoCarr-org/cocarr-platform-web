'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'

export default function BackgroundJobs() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await coreApi().get('/admin/background-jobs')
        setData(res.data)
      } catch (error) {
        ErrorToast(error?.response?.data?.error || 'Could not load jobs')
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Queue & Cron Jobs'} RightContent={() => null} />
      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}
      {!loading && data && (
        <>
          <p className='text-xs text-[#757575] px-1 pt-3'>{data.note}</p>
          <div className='bg-white border border-gray-100 rounded-md mt-4'>
            {data.jobs.map((j) => (
              <div key={j.name} className='border-b border-gray-100 last:border-b-0 flex justify-between items-center px-6 py-4'>
                <div>
                  <p className='text-sm font-semibold'>{j.name}</p>
                  <p className='text-xs text-[#757575]'>{j.schedule}</p>
                  {j.note && <p className='text-xs text-[#959595] mt-0.5'>{j.note}</p>}
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${j.status === 'configured' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#757575]'}`}>
                  {j.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
