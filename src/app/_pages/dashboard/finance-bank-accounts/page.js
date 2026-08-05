'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'
import Pagination from '@/app/_components/Pagination'
import { LIMIT } from '@/app/_helpers/constants'
import { StatusPill, VerifyActions, docState } from '@/app/_components/DocumentCell'

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

export default function HostBankAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAxios.get('/admin/host-bank-accounts', {
        params: {
          offset, limit: LIMIT,
          search: search || undefined, status: status || undefined, method: method || undefined,
        },
      })
      setAccounts(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load bank accounts')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, search, status, method])

  const setVerified = async (id, verified) => {
    if (verified && !window.confirm(
      'Manually verifying marks this account as payable without a penny-drop check. Only do this if you have confirmed the account out of band. Continue?'
    )) return
    setBusy(id)
    try {
      await authAxios.put(`/admin/host-bank-accounts/${id}`, { verified })
      InfoToast(verified ? 'Account marked verified' : 'Verification removed')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update')
    } finally { setBusy(null) }
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title='Host Bank Accounts' RightContent={() => null} />

      <div className='flex flex-wrap items-center gap-3 py-4 px-1'>
        <input className={`${input} max-w-xs flex-1`} placeholder='Search by name, bank, IFSC or UPI ID'
          value={search} onChange={(e) => { setOffset(0); setSearch(e.target.value) }} />
        <select className={input} value={method} onChange={(e) => { setOffset(0); setMethod(e.target.value) }}>
          <option value=''>All methods</option>
          <option value='bank'>Bank transfer</option>
          <option value='upi'>UPI</option>
        </select>
        <select className={input} value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }}>
          <option value=''>Any status</option>
          <option value='pending'>Pending verification</option>
          <option value='verified'>Verified</option>
        </select>
        <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
      </div>

      <div className='bg-white border border-gray-100 rounded-md overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
              <th className='px-4 py-3 font-semibold'>Host</th>
              <th className='px-4 py-3 font-semibold'>Method</th>
              <th className='px-4 py-3 font-semibold'>Account</th>
              <th className='px-4 py-3 font-semibold'>Account holder</th>
              <th className='px-4 py-3 font-semibold'>Bank</th>
              <th className='px-4 py-3 font-semibold'>Status</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className='px-4 py-6 text-[#757575]'>Loading…</td></tr>}
            {!loading && accounts.length === 0 && (
              <tr><td colSpan={7} className='px-4 py-6 text-[#757575]'>No payout accounts match these filters.</td></tr>
            )}
            {accounts.map((a) => {
              const state = docState(true, a.isVerified)
              return (
                <tr key={a.id} className={`border-b border-gray-50 last:border-b-0 ${a.isActive ? '' : 'opacity-60'}`}>
                  <td className='px-4 py-3'>
                    <p className='font-medium'>{a.host?.name || '—'}</p>
                    <p className='text-[11px] text-[#959595]'>{a.host?.email || a.host?.contactNumber || '—'}</p>
                  </td>
                  <td className='px-4 py-3 text-xs uppercase'>{a.paymentMethod}</td>
                  <td className='px-4 py-3'>
                    {a.paymentMethod === 'upi' ? (
                      <p className='font-mono text-xs'>{a.upiId || '—'}</p>
                    ) : (
                      <>
                        <p className='font-mono text-xs'>{a.accountNumberMasked || '—'}</p>
                        <p className='text-[11px] text-[#959595]'>{a.ifscCode}</p>
                      </>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    <p className='text-xs'>{a.accountHolderName || '—'}</p>
                    {a.nameMismatch && (
                      <p className='text-[11px] text-red-500 mt-0.5'>
                        Host entered &ldquo;{a.hostProvidedName}&rdquo;
                      </p>
                    )}
                    {a.nameMatchScore != null && (
                      <p className='text-[10px] text-[#959595]'>
                        Match score {a.nameMatchScore}{a.nameMatchStatus ? ` · ${a.nameMatchStatus}` : ''}
                      </p>
                    )}
                  </td>
                  <td className='px-4 py-3 text-xs'>
                    {a.bankName || '—'}
                    {a.branchName && <span className='block text-[11px] text-[#959595]'>{a.branchName}</span>}
                  </td>
                  <td className='px-4 py-3'>
                    <StatusPill state={state} />
                    {a.isManuallyVerified && (
                      <p className='text-[10px] text-amber-600 mt-1'>Manually verified</p>
                    )}
                    {!a.isActive && <p className='text-[10px] text-[#959595] mt-1'>Inactive</p>}
                  </td>
                  <td className='px-4 py-3 text-right'>
                    <VerifyActions state={state} busy={busy === a.id}
                      onVerify={() => setVerified(a.id, true)}
                      onUnverify={() => setVerified(a.id, false)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className='text-[11px] text-[#959595] mt-2'>
        Account numbers are stored as the last four digits only — the full number never reaches this system.
        A name mismatch between what the host entered and what the bank returned is flagged in red.
      </p>
    </div>
  )
}
