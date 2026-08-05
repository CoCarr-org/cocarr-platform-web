'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'
import Pagination from '@/app/_components/Pagination'
import { LIMIT } from '@/app/_helpers/constants'
import { StatusPill, DocumentImage, VerifyActions, docState } from '@/app/_components/DocumentCell'

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

const Detail = ({ label, value }) => (
  <div>
    <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
    <p className='text-xs text-[#454545]'>{value || '—'}</p>
  </div>
)

export default function VehicleRc() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAxios.get('/admin/vehicle-rc', {
        params: { offset, limit: LIMIT, search: search || undefined, status: status || undefined },
      })
      setVehicles(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load RC details')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, search, status])

  const setVerified = async (id, verified) => {
    setBusy(id)
    try {
      await authAxios.put(`/admin/vehicle-rc/${id}`, { verified })
      InfoToast(verified ? 'RC verified' : 'Verification removed')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update')
    } finally { setBusy(null) }
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title='Vehicle RC Details' RightContent={() => null} />

      <div className='flex flex-wrap items-center gap-3 py-4 px-1'>
        <input className={`${input} max-w-xs flex-1`} placeholder='Search by vehicle name, number or RC number'
          value={search} onChange={(e) => { setOffset(0); setSearch(e.target.value) }} />
        <select className={input} value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }}>
          <option value=''>Any status</option>
          <option value='pending'>Pending review</option>
          <option value='verified'>Verified</option>
        </select>
        <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
      </div>

      <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
              <th className='px-4 py-3 font-semibold'>Vehicle</th>
              <th className='px-4 py-3 font-semibold'>RC number</th>
              <th className='px-4 py-3 font-semibold'>Owner on RC</th>
              <th className='px-4 py-3 font-semibold'>Host</th>
              <th className='px-4 py-3 font-semibold'>Status</th>
              <th className='px-4 py-3 font-semibold'>Document</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className='px-4 py-6 text-[#757575]'>Loading…</td></tr>}
            {!loading && vehicles.length === 0 && (
              <tr><td colSpan={7} className='px-4 py-6 text-[#757575]'>No vehicles match these filters.</td></tr>
            )}
            {vehicles.map((v) => {
              const state = docState(!!v.vehicleRcNumber, v.vehicleRcVerified)
              const isOpen = expanded === v.id
              return (
                <React.Fragment key={v.id}>
                  <tr className='border-b border-gray-50'>
                    <td className='px-4 py-3'>
                      <p className='font-medium'>{v.vehicleName || '—'}</p>
                      <p className='text-[11px] text-[#959595]'>{v.vehicleNumber || '—'}</p>
                    </td>
                    <td className='px-4 py-3 font-mono text-xs'>{v.vehicleRcNumber || '—'}</td>
                    <td className='px-4 py-3 text-xs'>{v.ownerName || '—'}</td>
                    <td className='px-4 py-3 text-xs'>
                      {v.host?.name || <span className='text-[#959595]'>—</span>}
                    </td>
                    <td className='px-4 py-3'>
                      <StatusPill state={state} />
                      {v.rcVerified && !v.vehicleRcVerified && (
                        <p className='text-[10px] text-green-600 mt-1'>Provider-verified</p>
                      )}
                    </td>
                    <td className='px-4 py-3'>
                      <DocumentImage src={v.vehicleRcImage} label='RC document' />
                    </td>
                    <td className='px-4 py-3 text-right whitespace-nowrap'>
                      <button onClick={() => setExpanded(isOpen ? null : v.id)}
                        className='text-xs font-semibold text-[#454545] mr-3'>
                        {isOpen ? 'Hide' : 'Details'}
                      </button>
                      <VerifyActions state={state} busy={busy === v.id}
                        onVerify={() => setVerified(v.id, true)}
                        onUnverify={() => setVerified(v.id, false)} />
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className='border-b border-gray-50 bg-gray-50/50'>
                      <td colSpan={7} className='px-4 py-4'>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                          <Detail label='Maker' value={v.vehicleMaker} />
                          <Detail label='Model' value={v.model} />
                          <Detail label='Year' value={v.vehicleYear} />
                          <Detail label='Colour' value={v.vehicleColor} />
                          <Detail label='Fuel type' value={v.vehicleFuelType} />
                          <Detail label='Engine number' value={v.vehicleEngineNumber} />
                          <Detail label='Chassis number' value={v.vehicleChassisNumber} />
                          <Detail label='RC verification ref' value={v.rcVerificationId} />
                        </div>
                        <p className='text-[11px] text-[#959595] mt-3'>
                          Engine, chassis, maker and colour are captured from the RC record at verification time,
                          not typed by the host.
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
