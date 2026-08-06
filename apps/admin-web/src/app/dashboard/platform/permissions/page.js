'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { platformApi } from '@cocarr/api-sdk'
import { ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { ResourceManager } from '@cocarr/datagrid'

// Permissions and permission sets.
//
// Two things that behave differently, which is why they share a screen but not
// a table:
//
//  - PERMISSIONS are generated with the taxonomy and are the currency of
//    authorization: `permission.key` is what /authorize compares, exactly, with
//    no runtime wildcard. Browsing them is how you answer "what is the key for
//    this action?" — the question every `useCan()` call starts with. Editing one
//    by hand would rename a grant out from under every role holding it, so this
//    half is read-only.
//  - PERMISSION SETS are a real editing surface. A role's permissions are the
//    union of its direct permissions and every ACTIVE set it holds, so editing
//    a set edits every role holding it, immediately.

const PAGE = 2000

function PermissionBrowser() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await platformApi().get(`/permissions?limit=${PAGE}`)
        setRows(res.data?.data || [])
      } catch (error) {
        ErrorToast(error?.response?.data?.error?.message || 'Could not load permissions')
      } finally { setLoading(false) }
    })()
  }, [])

  // Grouped by the product segment of the key ('operations.bookings.read'), so
  // the list reads the way the platform is actually divided.
  const groups = useMemo(() => {
    const filtered = q
      ? rows.filter((r) => String(r.key).toLowerCase().includes(q.toLowerCase()))
      : rows
    const by = {}
    filtered.forEach((r) => {
      const product = String(r.key).split('.')[0] || 'other'
      ;(by[product] = by[product] || []).push(r)
    })
    Object.values(by).forEach((list) => list.sort((a, b) => a.key.localeCompare(b.key)))
    return Object.entries(by).sort(([a], [b]) => a.localeCompare(b))
  }, [rows, q])

  const shown = groups.reduce((n, [, list]) => n + list.length, 0)

  return (
    <div>
      <div className='flex items-center gap-3 mb-3'>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search permission keys'
          className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full max-w-sm outline-none focus:border-gray-400'
        />
        <span className='text-[11px] text-[#959595] shrink-0'>
          {loading ? 'Loading…' : `${shown} of ${rows.length}`}
        </span>
      </div>

      {!loading && shown === 0 && (
        <p className='py-4 text-sm text-[#757575]'>No permission key matches that.</p>
      )}

      {groups.map(([product, list]) => (
        <div key={product} className='mb-5'>
          <h3 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>
            {product} <span className='text-[#959595] font-normal'>({list.length})</span>
          </h3>
          <div className='bg-white border border-gray-100 rounded-md divide-y divide-gray-50'>
            {list.map((p) => (
              <div key={p.id} className='px-4 py-2 flex items-baseline gap-3'>
                <code className='text-xs font-semibold'>{p.key}</code>
                <span className='text-[11px] text-[#959595] ml-auto shrink-0'>{p.action}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Permissions() {
  const [tab, setTab] = useState('permissions')

  const Tab = ({ id, label }) => (
    <button
      type='button'
      onClick={() => setTab(id)}
      className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
        tab === id ? 'border-gray-800 text-gray-900' : 'border-transparent text-[#757575] hover:text-[#454545]'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className='max-w-5xl mx-auto pb-10'>
      <Header title='Permissions' RightContent={() => null} />

      <div className='flex gap-1 border-b border-gray-200 mt-4 mb-4 px-1'>
        <Tab id='permissions' label='Permissions' />
        <Tab id='sets' label='Permission sets' />
      </div>

      {tab === 'permissions' && (
        <div className='px-1'>
          <p className='text-sm text-[#757575] mb-4'>
            The permission <strong>key</strong> is what authorization compares, and it compares it
            exactly — there is no runtime wildcard, so a new module never silently widens an existing
            grant. These are generated alongside the taxonomy and are read-only here: renaming one
            would change what every role holding it is actually granted.
          </p>
          <PermissionBrowser />
        </div>
      )}

      {tab === 'sets' && (
        <div>
          <p className='text-sm text-[#757575] mb-4 px-1'>
            A role&apos;s permissions are the union of its direct permissions and every <strong>active</strong>{' '}
            set it holds — so editing a set edits every role holding it, immediately. Deactivating a
            set removes that access rather than merely hiding it.
          </p>
          <ResourceManager
            api='platform'
            permission='platform.permissions'
            endpoint='/permission-sets'
            searchPlaceholder='Search by key or name'
            createLabel='+ Add set'
            emptyText='No permission sets yet.'
            columns={[
              { key: 'key', label: 'Key' },
              { key: 'name', label: 'Name' },
              { key: 'isSystem', label: 'System' },
              { key: 'isActive', label: 'Active' },
              { key: 'createdAt', label: 'Created' },
            ]}
            fields={[
              { key: 'key', label: 'Key', type: 'text', required: true },
              { key: 'name', label: 'Name', type: 'text', required: true },
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'isActive', label: 'Active', type: 'boolean' },
            ]}
          />
        </div>
      )}
    </div>
  )
}
