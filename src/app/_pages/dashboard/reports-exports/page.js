'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

export default function ExportCentre() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await authAxios.get('/admin/reports/exports')
        setItems(res.data?.exports || [])
      } catch (error) {
        ErrorToast(error?.response?.data?.error || 'Could not load export targets')
      } finally { setLoading(false) }
    })()
  }, [])

  const download = async (item) => {
    setBusy(item.key)
    try {
      const res = await authAxios.get(item.endpoint)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `cocarr-${item.key}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Export failed')
    } finally { setBusy(null) }
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Export Centre'} RightContent={() => null} />
      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}
      <div className='bg-white border border-gray-100 rounded-md mt-4'>
        {items.map((i) => (
          <div key={i.key} className='border-b border-gray-100 last:border-b-0 flex justify-between items-center px-6 py-4'>
            <div>
              <p className='text-sm font-semibold'>{i.label}</p>
              {i.note && <p className='text-xs text-[#959595]'>{i.note}</p>}
            </div>
            {i.available
              ? <button type='button' className='btn-md' disabled={busy === i.key} onClick={() => download(i)}>
                  {busy === i.key ? 'Exporting…' : 'Download'}
                </button>
              : <span className='text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-[#757575]'>Not available</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
