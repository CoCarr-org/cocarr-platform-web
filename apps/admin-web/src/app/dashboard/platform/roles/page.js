'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { platformApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'

// ROLE → PERMISSIONS. What a role may do, edited grant by grant.
//
// GRANTS ONLY. Which modules and screens EXIST is generated from the web app's
// navConfig and seeded — it is not editable here, and that is the design rather
// than a gap. A module invented in this UI would have no page behind it, which
// surfaces to a user as a 404 from a menu entry the server advertised. So this
// screen changes who can do things, never what things there are.
//
// It edits DIRECT permissions. A role's effective set is the union of these and
// every active permission SET it holds, so a permission can look "off" here and
// still be granted through a set — the counts say so rather than letting someone
// conclude the checkbox is broken.

const ACTION_ORDER = ['read', 'create', 'update', 'delete']

const errMsg = (e, fallback) => e?.response?.data?.error?.message || e?.response?.data?.error || fallback

export default function Roles() {
  const [roles, setRoles] = useState(null)
  const [selected, setSelected] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [held, setHeld] = useState(new Set())
  const [sets, setSets] = useState([])
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('')

  const canEdit = useCan('platform.roles.update')

  const loadRoles = useCallback(async () => {
    try {
      const res = await platformApi().get('/roles?limit=200')
      setRoles(res.data?.data || [])
    } catch (e) { ErrorToast(errMsg(e, 'Could not load roles')); setRoles([]) }
  }, [])

  useEffect(() => {
    loadRoles()
    ;(async () => {
      try {
        const res = await platformApi().get('/permissions?limit=2000')
        setPermissions(res.data?.data || [])
      } catch (e) { ErrorToast(errMsg(e, 'Could not load permissions')) }
    })()
  }, [loadRoles])

  const openRole = async (role) => {
    setSelected(role); setDirty(false)
    try {
      // GET /roles/:id includes the role's permissions and sets.
      const res = await platformApi().get(`/roles/${role.id}`)
      setHeld(new Set((res.data?.permissions || []).map((p) => p.id)))
      setSets(res.data?.permissionSets || [])
    } catch (e) { ErrorToast(errMsg(e, 'Could not load this role')) }
  }

  // Grouped by the module segment of the key ('operations.bookings.read'), which
  // is how the platform is actually divided and how someone thinks about it.
  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const by = {}
    permissions.forEach((p) => {
      if (q && !String(p.key).toLowerCase().includes(q)) return
      const parts = String(p.key).split('.')
      const group = parts.slice(0, 2).join('.') || 'other'
      ;(by[group] = by[group] || []).push(p)
    })
    Object.values(by).forEach((list) => list.sort(
      (a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action)
        || a.key.localeCompare(b.key),
    ))
    return Object.entries(by).sort(([a], [b]) => a.localeCompare(b))
  }, [permissions, filter])

  const toggle = (id) => {
    setHeld((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    setDirty(true)
  }

  const toggleGroup = (list, on) => {
    setHeld((prev) => {
      const next = new Set(prev)
      list.forEach((p) => (on ? next.add(p.id) : next.delete(p.id)))
      return next
    })
    setDirty(true)
  }

  const save = async () => {
    setBusy(true)
    try {
      // The whole set is sent, not a delta — the endpoint replaces the role's
      // direct permissions, so a partial send would silently revoke everything
      // absent from it.
      await platformApi().put(`/roles/${selected.id}/permissions`, { permissionIds: [...held] })
      InfoToast(`Saved — ${held.size} permissions on ${selected.name}`)
      setDirty(false)
    } catch (e) { ErrorToast(errMsg(e, 'Could not save')) } finally { setBusy(false) }
  }

  return (
    <div className='max-w-6xl mx-auto pb-10'>
      <Header title='Roles' RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3 mb-5'>
        What each role may do. Modules and screens themselves are generated from the application&apos;s
        navigation and seeded — this screen changes <strong>who can do things</strong>, never what
        things exist, so a role can never be given a screen that has no page behind it.
      </p>

      <div className='grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-5'>
        <div>
          <h3 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>Roles</h3>
          {roles === null && <p className='text-sm text-[#757575]'>Loading…</p>}
          {roles && (
            <div className='bg-white border border-gray-100 rounded-md divide-y divide-gray-50 overflow-hidden'>
              {roles.map((r) => (
                <button key={r.id} type='button' onClick={() => openRole(r)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selected?.id === r.id ? 'bg-gray-50' : ''}`}>
                  <p className='text-sm font-semibold'>{r.name}</p>
                  <p className='text-[11px] text-[#959595]'>
                    {r.key}{r.isSuperAdmin ? ' · super admin' : ''}{r.isSystem ? ' · system' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {!selected && (
            <p className='text-sm text-[#757575] bg-white border border-gray-100 rounded-md px-5 py-6'>
              Select a role to edit what it may do.
            </p>
          )}

          {selected && selected.isSuperAdmin && (
            <div className='bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-md px-4 py-3 mb-4 leading-relaxed'>
              <strong>{selected.name} short-circuits to everything.</strong> Resolution never reads
              this role&apos;s permission list, so editing it here would change nothing while looking
              like it had. Narrow super admin by moving people off the role, not by unticking boxes.
            </div>
          )}

          {selected && !selected.isSuperAdmin && (
            <>
              <div className='flex items-center gap-3 mb-3 flex-wrap'>
                <input value={filter} onChange={(e) => setFilter(e.target.value)}
                  placeholder='Filter permission keys'
                  className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full max-w-xs outline-none focus:border-gray-400' />
                <span className='text-[11px] text-[#959595]'>{held.size} selected</span>
                {canEdit && (
                  <button type='button' onClick={save} disabled={!dirty || busy}
                    className='btn-md ml-auto disabled:opacity-40'>
                    {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                  </button>
                )}
              </div>

              {sets.length > 0 && (
                <div className='bg-gray-50 border border-gray-200 text-[#454545] text-xs rounded-md px-4 py-3 mb-4 leading-relaxed'>
                  This role also holds {sets.length} permission set{sets.length === 1 ? '' : 's'} (
                  {sets.map((s) => s.name).join(', ')}). Those grants are <strong>not</strong> shown as
                  ticks below — a permission can be unticked here and still held through a set.
                </div>
              )}

              {!canEdit && (
                <p className='text-xs text-[#959595] mb-3'>
                  View only — you do not hold <code className='text-[11px]'>platform.roles.update</code>.
                </p>
              )}

              {groups.map(([group, list]) => {
                const allOn = list.every((p) => held.has(p.id))
                return (
                  <div key={group} className='mb-4'>
                    <div className='flex items-center gap-2 mb-1.5'>
                      <h4 className='text-xs uppercase tracking-tight text-[#757575] font-semibold'>{group}</h4>
                      {canEdit && (
                        <button type='button' onClick={() => toggleGroup(list, !allOn)}
                          className='text-[11px] text-gray-500 hover:underline'>
                          {allOn ? 'clear' : 'select all'}
                        </button>
                      )}
                    </div>
                    <div className='bg-white border border-gray-100 rounded-md px-4 py-3 flex flex-wrap gap-x-5 gap-y-2'>
                      {list.map((p) => (
                        <label key={p.id} className={`flex items-center gap-2 text-xs ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}>
                          <input type='checkbox' disabled={!canEdit} checked={held.has(p.id)}
                            onChange={() => toggle(p.id)} />
                          <span className={held.has(p.id) ? 'font-semibold' : 'text-[#757575]'}>{p.action}</span>
                          <span className='text-[10px] text-[#bbb] font-mono'>{p.key.split('.').slice(2).join('.')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}

              {groups.length === 0 && (
                <p className='text-sm text-[#757575]'>No permission key matches that filter.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
