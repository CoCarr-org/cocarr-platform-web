'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Pagination from '@/app/_components/Pagination'
import PageLayout from '@/app/_components/PageLayout'
import { LIMIT } from '@/app/_helpers/constants'
import {
  STATUS_PILL, STATUS_LABEL, STATUS_FILTERS, DOC_PILL, DOC_LABEL,
} from '@/app/_helpers/userStatus'

// KYC & Documents.
//
// One row per user: who they are, then a column per document with its own
// review state, then the overall profile status. Clicking a row opens the user
// detail page — every decision (verify a document, approve, reject, suspend) is
// made there, so this screen stays a pure overview.
//
// Reads the same `/admin/user-verification` list as the customers page, so the
// per-document state here and on the detail page always come from one source.

const DOCS = [
  { key: 'licence', label: 'Driving licence' },
  { key: 'aadhaar', label: 'Aadhaar' },
  { key: 'pan', label: 'PAN' },
]

// Module scope — a component defined inside a render is a new type each time.
const DocPill = ({ state }) => (
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_PILL[state] || DOC_PILL.missing}`}>
    {DOC_LABEL[state] || state}
  </span>
)

export default function UsersDocuments() {
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [docFilter, setDocFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)

  const load = async () => {
    setLoading(true)
    try {
      let query = `status=${status}&offset=${offset}&limit=${LIMIT}`
      if (search) query += `&search=${encodeURIComponent(search)}`
      const res = await authAxios.get(`/admin/user-verification?${query}`)
      setUsers(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setCounts(res.data?.counts || {})
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load documents')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, search, status])

  // Applied client-side, over the current page only. The backend filters by
  // PROFILE status, not by an individual document's state, so this narrows what
  // is already loaded rather than pretending to be a server-side filter.
  const visible = docFilter
    ? users.filter((u) => Object.values(u.documentStatus || {}).includes(docFilter))
    : users

  const filters = (
    <>
      <input
        value={search}
        onChange={(e) => { setOffset(0); setSearch(e.target.value) }}
        placeholder='Search by name, email or phone'
        className='flex-1 min-w-[220px] max-w-sm border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'
      />
      <div className='flex flex-wrap gap-2'>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type='button'
            onClick={() => { setOffset(0); setStatus(f.value) }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
              status === f.value
                ? 'bg-[#ECC032] border-[#ECC032] text-black'
                : 'bg-white border-gray-200 text-[#757575] hover:border-gray-300'}`}
          >
            {f.label}
            <span className='ml-1.5 opacity-70'>
              {f.value === 'all' ? (counts.total ?? '') : (counts[f.value] ?? '')}
            </span>
          </button>
        ))}
      </div>
      <select
        className='ml-auto border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'
        value={docFilter}
        onChange={(e) => setDocFilter(e.target.value)}
      >
        <option value=''>Any document state</option>
        <option value='pending'>Has a document pending review</option>
        <option value='rejected'>Has a rejected document</option>
        <option value='verified'>Has a verified document</option>
        <option value='missing'>Has a missing document</option>
      </select>
    </>
  )

  return (
    <PageLayout
      title='KYC & Documents'
      subtitle='Each user’s document review state at a glance. Click a row to review the scans and decide.'
      breadcrumb={['User Management', 'KYC & Documents']}
      filters={filters}
    >
      {loading && (
        <div className='bg-white border border-gray-100 rounded-lg px-5 py-10 text-center'>
          <p className='text-sm text-[#757575]'>Loading…</p>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className='bg-white border border-gray-100 rounded-lg px-5 py-10 text-center'>
          <p className='text-sm text-[#757575]'>
            {docFilter
              ? 'No user on this page has a document in that state.'
              : 'No users match this filter.'}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse'>
              <thead>
                <tr className='bg-[#f9f9f9] border-b border-gray-100'>
                  <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>User</th>
                  {DOCS.map((d) => (
                    <th key={d.key} className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>{d.label}</th>
                  ))}
                  <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>Profile status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => {
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name
                  const st = u.verificationStatus || 'incomplete'
                  const ds = u.documentStatus || {}
                  return (
                    <tr
                      key={u.id}
                      className='border-b border-gray-50 last:border-0 cursor-pointer hover:bg-[#fafafa] transition-colors'
                      onClick={() => router.push(`/dashboard/users/${u.id}`)}
                    >
                      <td className='px-4 py-3'>
                        <p className='text-sm font-medium my-0 capitalize'>
                          {fullName || <span className='text-[#959595] normal-case'>No name</span>}
                        </p>
                        <p className='text-xs my-0 text-gray-400'>{u.email || u.contactNumber || '—'}</p>
                        <p className='text-[10px] my-0 text-gray-300 font-mono truncate max-w-[180px]'>{u.id}</p>
                      </td>
                      {DOCS.map((d) => (
                        <td key={d.key} className='px-4 py-3'><DocPill state={ds[d.key] || 'missing'} /></td>
                      ))}
                      <td className='px-4 py-3'>
                        <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[st] || STATUS_PILL.incomplete}`}>
                          {STATUS_LABEL[st] || st}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className='flex justify-end py-3'>
        <Pagination count={count} offset={offset} setOffset={setOffset} />
      </div>

      <p className='text-[11px] text-[#959595] mt-2'>
        Click a user to see the scans and make a decision. Aadhaar and PAN numbers are masked by the
        server — they are confirmed from the document image, not from a field.
      </p>
    </PageLayout>
  )
}
