'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import { getValidDateFormat, getTimeFormat } from '@/app/_helpers/utils'
import { photoUrl } from '@/app/_helpers/media'
import { LIMIT } from '@/app/_helpers/constants'
import Pagination from '@/app/_components/Pagination'
import PageLayout from '@/app/_components/PageLayout'
import ManageUser from './_components/ManagerUser'
import { STATUS_PILL, STATUS_LABEL, STATUS_FILTERS } from '@/app/_helpers/userStatus'

// Customers list.
//
// Reads `/admin/user-verification?status=all` rather than the older `/user`
// endpoint: it is the one source returning the profile status AND the
// per-document review state on the same row, so the status column here and the
// detail page can never disagree about a user.
//
// The filter is driven by the `?status=` query param, so the User Management
// dashboard's cards deep-link straight into an already-filtered list.

export default function Customers() {
  const router = useRouter()
  const params = useSearchParams()

  const [users, setUsers] = useState([])
  const [counts, setCounts] = useState({})
  const [searchText, setSearchText] = useState('')
  const [status, setStatus] = useState(params.get('status') || 'all')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState({ status: false, edit: null })

  const getUsers = async () => {
    setLoading(true)
    try {
      let query = `status=${status}&offset=${offset}&limit=${LIMIT}`
      if (searchText) query += `&search=${encodeURIComponent(searchText)}`
      const res = await authAxios.get(`/admin/user-verification?${query}`)
      setUsers(res.data.data || [])
      setCount(res.data.totalCount || 0)
      setCounts(res.data.counts || {})
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { getUsers() }, [searchText, offset, status])

  // Keep the URL in step with the filter so a view can be linked, and so
  // coming back from a detail page restores the same filter.
  const changeStatus = (next) => {
    setOffset(0)
    setStatus(next)
    router.replace(next === 'all' ? '/dashboard/users' : `/dashboard/users?status=${next}`)
  }

  const createUser = async (e, data) => {
    e.preventDefault()
    try {
      await authAxios.post('/admin/user', data)
      setShowCreate({ status: false, edit: null })
      setOffset(0)
      await getUsers()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not create user')
    }
  }

  const filters = (
    <>
      <input
        value={searchText}
        onChange={(e) => { setOffset(0); setSearchText(e.target.value) }}
        placeholder='Search by name, email or phone'
        className='flex-1 min-w-[220px] max-w-sm border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'
      />
      <div className='flex flex-wrap gap-2'>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type='button'
            onClick={() => changeStatus(f.value)}
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
    </>
  )

  return (
    <>
      <PageLayout
        title='Customers'
        subtitle='Everyone who has signed up, with their verification status.'
        breadcrumb={['User Management', 'Customers']}
        actions={
          <button type='button' className='btn-md' onClick={() => setShowCreate({ status: true, edit: null })}>
            + Add User
          </button>
        }
        filters={filters}
      >
        {loading && (
          <div className='bg-white border border-gray-100 rounded-lg px-5 py-10 text-center'>
            <p className='text-sm text-[#757575]'>Loading customers…</p>
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className='bg-white border border-gray-100 rounded-lg px-5 py-10 text-center'>
            <p className='text-sm text-[#757575]'>No customers match this filter.</p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse'>
                <thead>
                  <tr className='bg-[#f9f9f9] border-b border-gray-100'>
                    <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>Customer</th>
                    <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>Email / Phone</th>
                    <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>Location</th>
                    <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>Joined</th>
                    <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-4 py-3'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const fullName = [item.firstName, item.lastName].filter(Boolean).join(' ') || item.name
                    const st = item.verificationStatus || 'incomplete'
                    return (
                      <tr
                        key={item.id}
                        className='border-b border-gray-50 last:border-0 cursor-pointer hover:bg-[#fafafa] transition-colors'
                        onClick={() => router.push(`/dashboard/users/${item.id}`)}
                      >
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-3'>
                            {item.profilePhoto
                              ? <img src={photoUrl(item.profilePhoto)} alt='' className='w-9 h-9 rounded-full object-cover shrink-0' />
                              : <div className='bg-gradient-to-br from-gray-200 to-gray-300 rounded-full h-9 w-9 shrink-0 flex items-center justify-center text-[11px] font-semibold text-gray-500'>
                                  {(fullName || '?').trim().charAt(0).toUpperCase()}
                                </div>}
                            <div className='min-w-0'>
                              <p className='text-sm font-medium my-0 capitalize truncate'>
                                {fullName || <span className='text-[#959595] normal-case'>Unavailable</span>}
                              </p>
                              <p className='text-[11px] my-0 text-gray-400 font-mono truncate'>{item.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          <p className='text-sm my-0 truncate max-w-[220px]'>{item.email || <span className='text-gray-400'>No email</span>}</p>
                          <p className='text-xs my-0 text-gray-400'>{[item.countryCode, item.contactNumber].filter(Boolean).join(' ') || 'No phone'}</p>
                        </td>
                        <td className='px-4 py-3'>
                          <p className='text-sm my-0 capitalize'>{item.city || '—'}</p>
                          <p className='text-xs my-0 text-gray-400 capitalize'>{item.state || ''}</p>
                        </td>
                        <td className='px-4 py-3'>
                          <p className='text-sm my-0'>{getValidDateFormat(item.createdAt)}</p>
                          <p className='text-xs my-0 text-gray-400'>{getTimeFormat(item.createdAt)}</p>
                        </td>
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
      </PageLayout>

      {showCreate.status && (
        <ManageUser onSubmit={createUser} onClose={() => setShowCreate({ status: false, edit: null })} />
      )}
    </>
  )
}
