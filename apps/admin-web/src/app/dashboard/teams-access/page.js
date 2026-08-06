'use client'
import React, { useEffect, useState } from 'react'
import { platformApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { ResourceManager } from '@cocarr/datagrid'
import { useCan } from '@cocarr/iam-sdk'

// Roles & Access — the route the nav has always pointed at, now backed by the
// platform IAM rather than core-api's team/level grid.
//
// The name is inherited: navConfig called this "Teams & Access" when it edited
// core-api's team × level × module matrix, and the taxonomy generator carried
// the route across. That grid is superseded by this service — roles, permission
// sets and assignments — but the route is kept because it is what is seeded, is
// what the sidebar links to, and is where bookmarks land. Renaming it would
// mean regenerating the taxonomy and re-seeding for no gain.
//
// Assignments are the half that matters day to day: a principal holds a role,
// and that is the only way anyone gets any permission at all.

const fmt = (d) => (d ? new Date(d).toLocaleString() : '—')

function Assignments({ roles }) {
  const [principalId, setPrincipalId] = useState('')
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [roleId, setRoleId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const canAssign = useCan('platform.roles.create')
  const canRevoke = useCan('platform.roles.delete')

  const load = async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const res = await platformApi().get(`/assignments/principal/${encodeURIComponent(id)}`)
      setRows(res.data?.data || res.data || [])
      setPrincipalId(id)
    } catch (error) {
      ErrorToast(error?.response?.data?.error?.message || 'Could not load assignments')
    } finally { setLoading(false) }
  }

  const assign = async () => {
    if (!principalId || !roleId) return
    setBusy(true)
    try {
      await platformApi().post('/assignments', {
        principalId,
        roleId,
        // Empty string is not "no expiry" to a date column — send null, or an
        // assignment meant to be permanent is written with an invalid date.
        expiresAt: expiresAt || null,
        reason: reason || null,
      })
      InfoToast('Role assigned')
      setRoleId(''); setExpiresAt(''); setReason('')
      await load(principalId)
    } catch (error) {
      ErrorToast(error?.response?.data?.error?.message || 'Could not assign the role')
    } finally { setBusy(false) }
  }

  const revoke = async (id) => {
    setBusy(true)
    try {
      await platformApi().delete(`/assignments/${id}`)
      InfoToast('Assignment revoked')
      await load(principalId)
    } catch (error) {
      ErrorToast(error?.response?.data?.error?.message || 'Could not revoke the assignment')
    } finally { setBusy(false) }
  }

  const active = (a) => !a.revokedAt && (!a.expiresAt || new Date(a.expiresAt) > new Date())

  return (
    <div className='px-1'>
      <p className='text-sm text-[#757575] mb-4'>
        A principal is the platform identity id from the Identity service — the value the gateway
        sends as <code className='text-[11px]'>x-identity-id</code>. Before someone&apos;s identity row
        exists their Firebase uid is used instead, so both forms are valid here.
      </p>

      <div className='flex gap-2 mb-5'>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(query.trim())}
          placeholder='Principal id (identity uuid or Firebase uid)'
          className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full max-w-lg outline-none focus:border-gray-400'
        />
        <button
          type='button'
          onClick={() => load(query.trim())}
          disabled={!query.trim() || loading}
          className='bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-40'
        >
          {loading ? 'Loading…' : 'Look up'}
        </button>
      </div>

      {rows && (
        <>
          <h3 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>
            Assignments for <code className='text-[11px] normal-case'>{principalId}</code>
          </h3>

          {rows.length === 0 && (
            <p className='text-sm text-[#757575] bg-white border border-gray-100 rounded-md px-4 py-4 mb-5'>
              This principal holds no roles, so they have no permissions at all — the sidebar will be
              empty and every call will refuse.
            </p>
          )}

          {rows.length > 0 && (
            <div className='bg-white border border-gray-100 rounded-md divide-y divide-gray-50 mb-5'>
              {rows.map((a) => (
                <div key={a.id} className='px-4 py-3 flex items-center gap-3'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold'>
                      {a.role?.name || roles.find((r) => r.id === a.roleId)?.name || a.roleId}
                      {a.role?.isSuperAdmin && (
                        <span className='ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700'>
                          super admin
                        </span>
                      )}
                    </p>
                    <p className='text-[11px] text-[#959595] mt-0.5'>
                      granted {fmt(a.createdAt)}
                      {a.expiresAt && ` · expires ${fmt(a.expiresAt)}`}
                      {a.reason && ` · ${a.reason}`}
                    </p>
                  </div>
                  <span
                    className={`ml-auto shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      active(a) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {a.revokedAt ? 'revoked' : active(a) ? 'active' : 'expired'}
                  </span>
                  {canRevoke && active(a) && (
                    <button
                      type='button'
                      onClick={() => revoke(a.id)}
                      disabled={busy}
                      className='shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-40'
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canAssign && (
            <div className='bg-white border border-gray-100 rounded-md px-4 py-4'>
              <h4 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-3'>
                Assign a role
              </h4>
              <div className='flex flex-wrap items-end gap-3'>
                <label className='block'>
                  <span className='block text-[11px] text-[#757575] mb-1'>Role</span>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className='border border-gray-200 rounded-md px-3 py-2 text-sm min-w-[16rem] outline-none focus:border-gray-400'
                  >
                    <option value=''>Select a role…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}{r.isSuperAdmin ? ' (super admin)' : ''}</option>
                    ))}
                  </select>
                </label>
                <label className='block'>
                  <span className='block text-[11px] text-[#757575] mb-1'>Expires (optional)</span>
                  <input
                    type='datetime-local'
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className='border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400'
                  />
                </label>
                <label className='block flex-1 min-w-[12rem]'>
                  <span className='block text-[11px] text-[#757575] mb-1'>Reason (optional)</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder='Why this was granted'
                    className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full outline-none focus:border-gray-400'
                  />
                </label>
                <button
                  type='button'
                  onClick={assign}
                  disabled={!roleId || busy}
                  className='bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-40'
                >
                  Assign
                </button>
              </div>
              <p className='text-[11px] text-[#959595] mt-3'>
                Leaving expiry blank grants the role indefinitely. Setting it is how temporary access
                is modelled — resolution filters on the current time every call, so nothing has to run
                to take it away.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function RolesAndAccess() {
  const [tab, setTab] = useState('assignments')
  const [roles, setRoles] = useState([])

  useEffect(() => {
    (async () => {
      try {
        const res = await platformApi().get('/roles?limit=200')
        setRoles(res.data?.data || [])
      } catch (error) {
        ErrorToast(error?.response?.data?.error?.message || 'Could not load roles')
      }
    })()
  }, [])

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
      <Header title='Roles & Access' RightContent={() => null} />

      <div className='flex gap-1 border-b border-gray-200 mt-4 mb-4 px-1'>
        <Tab id='assignments' label='Assignments' />
        <Tab id='roles' label='Roles' />
      </div>

      {tab === 'assignments' && <Assignments roles={roles} />}

      {tab === 'roles' && (
        <div>
          <p className='text-sm text-[#757575] mb-4 px-1'>
            System roles are seeded with the taxonomy. A role carrying{' '}
            <strong>super admin</strong> short-circuits resolution to &ldquo;everything&rdquo; and needs
            no permission list of its own. Re-running the seed never re-grants an existing role —
            narrowing one here is a decision, and a seed that restored defaults on the next deploy
            would revert it with no trace.
          </p>
          <ResourceManager
            api='platform'
            permission='platform.roles'
            endpoint='/roles'
            searchPlaceholder='Search by key or name'
            createLabel='+ Add role'
            emptyText='No roles yet — run seedTaxonomy.js.'
            columns={[
              { key: 'key', label: 'Key' },
              { key: 'name', label: 'Name' },
              { key: 'isSuperAdmin', label: 'Super admin' },
              { key: 'isSystem', label: 'System' },
              { key: 'createdAt', label: 'Created' },
            ]}
            fields={[
              { key: 'key', label: 'Key', type: 'text', required: true },
              { key: 'name', label: 'Name', type: 'text', required: true },
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'isSuperAdmin', label: 'Super admin (grants everything)', type: 'boolean' },
            ]}
          />
        </div>
      )}
    </div>
  )
}
