'use client'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { platformApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'

// ROLE × MODULE × ACTION, with each module expanding into its screens.
//
// This is the legacy Teams & Access grid re-expressed for IAM. The old model was
// Team → Level → Module → Screen; here a ROLE is the team-and-level pair already
// combined (operations-manager and operations-agent are exactly that), so the
// four levels become Role → Module → Screen → Action and the grid loses a
// dimension without losing any expressiveness.
//
// GRANTS ONLY. Which modules and screens exist is generated from the web app's
// navConfig and seeded — never editable here. A module invented in a UI would
// have no page behind it, which reaches a user as a 404 from a menu entry the
// server advertised.
//
// C/R/U/D IS DRAWN PER MODULE, NOT PER SCREEN, because that is what the taxonomy
// actually has: all 27 modules carry read/create/update/delete, and all 66
// sub-modules carry read alone. Rendering four boxes against a screen would
// offer three grants that do not exist — the checkbox would tick, save, and mean
// nothing. A screen therefore gets one control, which is the honest question:
// may this role open it?

const ACTIONS = ['read', 'create', 'update', 'delete']
const ACTION_LABEL = { read: 'R', create: 'C', update: 'U', delete: 'D' }
const PAGE = 500

const errMsg = (e, fallback) => e?.response?.data?.error?.message || e?.response?.data?.error || fallback

export default function RolePermissions() {
  const [roles, setRoles] = useState(null)
  const [selected, setSelected] = useState(null)
  const [tree, setTree] = useState(null)
  const [held, setHeld] = useState(new Set())
  const [baseline, setBaseline] = useState(new Set())
  const [sets, setSets] = useState([])
  const [expanded, setExpanded] = useState({})
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('')

  const canEdit = useCan('platform.roles.update')

  const loadRoles = useCallback(async () => {
    try {
      const res = await platformApi().get('/roles?limit=200')
      setRoles(res.data?.data || [])
    } catch (e) { ErrorToast(errMsg(e, 'Could not load roles')); setRoles([]) }
  }, [])

  // The taxonomy plus every permission, assembled into the grid's rows. Five
  // flat reads stitched in JS rather than one nested include — the same choice
  // navigationService makes, for the same reason: a five-level eager load is
  // where one missing association takes out the whole response.
  useEffect(() => {
    loadRoles()
    ;(async () => {
      try {
        const api = platformApi()
        const [products, portals, modules, subModules, permissions] = await Promise.all([
          api.get(`/products?limit=${PAGE}`), api.get(`/portals?limit=${PAGE}`),
          api.get(`/modules?limit=${PAGE}`), api.get(`/sub-modules?limit=${PAGE}`),
          api.get(`/permissions?limit=${PAGE * 6}`),
        ])
        const rows = (r) => r.data?.data || []
        const P = rows(products); const PO = rows(portals)
        const M = rows(modules); const SM = rows(subModules); const PERM = rows(permissions)
        const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)

        // permission lookup: module-level by (moduleId, action); screen-level by subModuleId
        const modPerm = {}; const subPerm = {}
        PERM.forEach((p) => {
          if (p.subModuleId) subPerm[p.subModuleId] = p
          else if (p.moduleId) modPerm[`${p.moduleId}:${p.action}`] = p
        })

        setTree(P.slice().sort(bySort).map((prod) => ({
          key: prod.key,
          name: prod.name,
          modules: PO.filter((x) => x.productId === prod.id).sort(bySort).flatMap((po) => M
            .filter((x) => x.portalId === po.id).sort(bySort)
            .map((m) => ({
              id: m.id,
              key: m.key,
              name: m.name,
              route: m.route,
              actions: ACTIONS.map((a) => ({ action: a, permission: modPerm[`${m.id}:${a}`] || null })),
              screens: SM.filter((x) => x.moduleId === m.id).sort(bySort)
                .map((s) => ({ id: s.id, name: s.name, route: s.route, permission: subPerm[s.id] || null })),
            }))),
        })))
      } catch (e) { ErrorToast(errMsg(e, 'Could not load the permission matrix')) }
    })()
  }, [loadRoles])

  const openRole = async (role) => {
    setSelected(role)
    try {
      const res = await platformApi().get(`/roles/${role.id}`)
      const ids = new Set((res.data?.permissions || []).map((p) => p.id))
      setHeld(ids)
      setBaseline(new Set(ids))
      setSets(res.data?.permissionSets || [])
    } catch (e) { ErrorToast(errMsg(e, 'Could not load this role')) }
  }

  const dirty = useMemo(() => held.size !== baseline.size
    || [...held].some((id) => !baseline.has(id)), [held, baseline])

  const toggle = (permission) => {
    if (!permission || !canEdit) return
    setHeld((prev) => {
      const next = new Set(prev)
      if (next.has(permission.id)) next.delete(permission.id); else next.add(permission.id)
      return next
    })
  }

  // Whole-module row: everything the module actually declares.
  const setModule = (mod, on) => {
    if (!canEdit) return
    setHeld((prev) => {
      const next = new Set(prev)
      mod.actions.forEach(({ permission }) => {
        if (!permission) return
        if (on) next.add(permission.id); else next.delete(permission.id)
      })
      mod.screens.forEach((s) => {
        if (!s.permission) return
        if (on) next.add(s.permission.id); else next.delete(s.permission.id)
      })
      return next
    })
  }

  const save = async () => {
    setBusy(true)
    try {
      // The WHOLE set is sent — the endpoint replaces the role's direct
      // permissions, so a partial send would silently revoke everything absent.
      await platformApi().put(`/roles/${selected.id}/permissions`, { permissionIds: [...held] })
      setBaseline(new Set(held))
      InfoToast(`Saved — ${held.size} permissions on ${selected.name}`)
    } catch (e) { ErrorToast(errMsg(e, 'Could not save')) } finally { setBusy(false) }
  }

  const visibleTree = useMemo(() => {
    if (!tree) return null
    const q = filter.trim().toLowerCase()
    if (!q) return tree
    return tree.map((prod) => ({
      ...prod,
      modules: prod.modules.filter((m) => `${m.name} ${m.key} ${m.route || ''}`.toLowerCase().includes(q)
        || m.screens.some((s) => `${s.name} ${s.route || ''}`.toLowerCase().includes(q))),
    })).filter((p) => p.modules.length)
  }, [tree, filter])

  const Box = ({ permission, label, title }) => {
    const exists = Boolean(permission)
    return (
      <label
        title={exists ? title : 'This action does not exist on this module'}
        className={`inline-flex items-center justify-center w-7 h-7 rounded text-[11px] font-bold select-none
          ${!exists ? 'text-gray-200 cursor-not-allowed'
      : held.has(permission.id) ? 'bg-gray-900 text-white cursor-pointer'
        : 'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-pointer'}
          ${!canEdit && exists ? 'cursor-default opacity-70' : ''}`}
      >
        <input
          type='checkbox'
          className='sr-only'
          disabled={!exists || !canEdit}
          checked={exists ? held.has(permission.id) : false}
          onChange={() => toggle(permission)}
        />
        {label}
      </label>
    )
  }

  return (
    <div className='max-w-7xl mx-auto pb-10'>
      <Header title='Roles & Permissions' RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3 mb-4'>
        What each role may do, module by module. A role here is the old team-and-level pair combined —
        <strong> Operations Manager</strong> and <strong>Operations Agent</strong> are two roles rather
        than two levels of one. Modules and screens themselves come from the application&apos;s
        navigation and are not editable, so a role can never be granted a screen with no page behind it.
      </p>

      <div className='grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-5'>
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
                    {r.key}{r.isSuperAdmin ? ' · super admin' : ''}
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

          {selected?.isSuperAdmin && (
            <div className='bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-md px-4 py-3 leading-relaxed'>
              <strong>{selected.name} short-circuits to everything.</strong> Resolution never reads this
              role&apos;s permission list, so edits here would change nothing while appearing to work.
              Narrow super admin by moving people off the role, not by unticking boxes.
            </div>
          )}

          {selected && !selected.isSuperAdmin && (
            <>
              <div className='flex items-center gap-3 mb-3 flex-wrap'>
                <input value={filter} onChange={(e) => setFilter(e.target.value)}
                  placeholder='Filter modules and screens'
                  className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full max-w-xs outline-none focus:border-gray-400' />
                <span className='text-[11px] text-[#959595]'>{held.size} granted</span>
                {canEdit && (
                  <button type='button' onClick={save} disabled={!dirty || busy}
                    className='btn-md ml-auto disabled:opacity-40'>
                    {busy ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                  </button>
                )}
              </div>

              {sets.length > 0 && (
                <div className='bg-gray-50 border border-gray-200 text-[#454545] text-xs rounded-md px-4 py-3 mb-3 leading-relaxed'>
                  This role also holds {sets.length} permission set{sets.length === 1 ? '' : 's'} (
                  {sets.map((s) => s.name).join(', ')}). Those grants are <strong>not</strong> ticked
                  below — a box can be empty here and the permission still held through a set.
                </div>
              )}

              {!canEdit && (
                <p className='text-xs text-[#959595] mb-3'>
                  View only — you do not hold <code className='text-[11px]'>platform.roles.update</code>.
                </p>
              )}

              {!visibleTree && <p className='text-sm text-[#757575]'>Loading the matrix…</p>}

              {visibleTree?.map((prod) => (
                <div key={prod.key} className='mb-5'>
                  <h3 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>
                    {prod.name}
                  </h3>
                  <div className='bg-white border border-gray-100 rounded-md overflow-hidden'>
                    <div className='flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100'>
                      <span className='flex-1 text-[11px] font-semibold text-[#757575]'>Module</span>
                      {ACTIONS.map((a) => (
                        <span key={a} title={a} className='w-7 text-center text-[11px] font-semibold text-[#757575]'>
                          {ACTION_LABEL[a]}
                        </span>
                      ))}
                      <span className='w-16' />
                    </div>

                    {prod.modules.map((m) => {
                      const open = expanded[m.id]
                      const allOn = m.actions.every((a) => !a.permission || held.has(a.permission.id))
                        && m.screens.every((s) => !s.permission || held.has(s.permission.id))
                      const someScreens = m.screens.filter((s) => s.permission && held.has(s.permission.id)).length
                      return (
                        <div key={m.id} className='border-b border-gray-50 last:border-0'>
                          <div className='flex items-center gap-2 px-4 py-2.5'>
                            <button type='button'
                              onClick={() => setExpanded((p) => ({ ...p, [m.id]: !p[m.id] }))}
                              className='flex-1 text-left flex items-baseline gap-2 min-w-0'>
                              <span className={`text-[#959595] text-xs transition-transform ${open ? 'rotate-90' : ''}`}>
                                {m.screens.length ? '›' : ' '}
                              </span>
                              <span className='text-sm font-medium truncate'>{m.name}</span>
                              {m.screens.length > 0 && (
                                <span className='text-[11px] text-[#959595] shrink-0'>
                                  {someScreens}/{m.screens.length} screens
                                </span>
                              )}
                            </button>
                            {m.actions.map(({ action, permission }) => (
                              <Box key={action} permission={permission} label={ACTION_LABEL[action]}
                                title={`${m.name} — ${action}`} />
                            ))}
                            <span className='w-16 text-right'>
                              {canEdit && (
                                <button type='button' onClick={() => setModule(m, !allOn)}
                                  className='text-[11px] text-gray-500 hover:underline'>
                                  {allOn ? 'clear' : 'all'}
                                </button>
                              )}
                            </span>
                          </div>

                          {open && m.screens.length > 0 && (
                            <div className='bg-[#fbfbfb] border-t border-gray-50 px-4 py-2'>
                              <p className='text-[11px] text-[#959595] mb-1.5'>
                                Screens inside this module. Only <strong>visibility</strong> is grantable
                                per screen — create, update and delete are held at the module level.
                              </p>
                              {m.screens.map((s) => (
                                <div key={s.id} className='flex items-center gap-2 py-1'>
                                  <span className='flex-1 text-xs text-[#454545] truncate pl-5'>{s.name}</span>
                                  <Box permission={s.permission} label='R' title={`${s.name} — visible`} />
                                  <span className='w-16' />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {visibleTree?.length === 0 && (
                <p className='text-sm text-[#757575]'>Nothing matches that filter.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
