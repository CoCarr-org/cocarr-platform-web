'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

// Reports whether each integration's environment variables are present.
// It never returns or displays the values themselves.
export default function Integrations() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const res = await authAxios.get('/admin/integrations')
        setItems(res.data?.integrations || [])
      } catch (error) {
        ErrorToast(error?.response?.data?.error || 'Could not load integrations')
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Integrations'} RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 py-3'>
        Shows whether each integration is configured on the API. Secret values are never sent to the browser — only whether the variables are set. Changing them is done in the hosting environment, not here.
      </p>
      <div className='overflow-hidden rounded-md border border-gray-100 bg-white'>
        {loading && <p className='px-6 py-4 text-sm text-[#757575]'>Loading…</p>}
        {items.map((i) => (
          <div key={i.key} className='border-b border-gray-100 last:border-b-0 flex justify-between items-center px-6 py-4'>
            <div>
              <p className='text-sm font-semibold tracking-tight'>{i.name}</p>
              <p className='text-xs text-[#757575]'>{i.envVars.join(', ')}</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${i.configured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {i.configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
