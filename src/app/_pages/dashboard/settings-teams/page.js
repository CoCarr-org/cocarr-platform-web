'use client'
import React, { useEffect, useMemo, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import PageLayout from '@/app/_components/PageLayout'
import { NAV_MODULES } from '@/app/_helpers/navConfig'

// Teams & Access — the Super Admin's control panel for RBAC.
//
//   Left  : the teams (Super Admin, Admin, … + any the admin adds)
//   Right : the selected team — its levels (Manager / Specialist / Agent / …)
//           and, per level, the module × C/R/U/D permission grid.
//
// Everything is data-driven: teams, levels and grids are edited here and saved
// to /admin/teams*, and the enforcement middleware reads exactly this.

// The screens each module owns, derived from navConfig so this list cannot
// drift from the nav the permissions actually gate. Keyed by module, since one
// nav GROUP can contain pages belonging to several modules (Finance holds
// Wallets → users, Taxes → settings) and the permission editor is organised by
// module, not by menu.
const SCREENS_BY_MODULE = NAV_MODULES.reduce((acc, group) => {
  for (const page of group.pages) {
    const key = page.module || group.module
    ;(acc[key] = acc[key] || []).push({ route: page.route, label: page.label, group: group.label })
  }
  return acc
}, {})

const ACTIONS = [
  ['create', 'Create'],
  ['read', 'Read'],
  ['update', 'Update'],
  ['delete', 'Delete'],
]
const blank = { create: false, read: false, update: false, delete: false }

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

export default function TeamsAccess() {
  const [teams, setTeams] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [levelId, setLevelId] = useState(null)
  const [grid, setGrid] = useState({}) // moduleKey -> {create,read,update,delete}
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null) // {type, ...}

  const loadTeams = async (selectAfter) => {
    try {
      const res = await authAxios.get('/admin/teams')
      const list = res.data?.teams || []
      setTeams(list)
      const next = selectAfter || selectedId || list[0]?.id
      if (next) setSelectedId(next)
      return list
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load teams')
      return []
    }
  }

  // Per-screen overrides being edited, keyed by route. Only screens that
  // deviate live here — absent means "inherits its module", which is the normal
  // case and why the editor shows them collapsed by default.
  const [subs, setSubs] = useState({})
  const [expanded, setExpanded] = useState(null)

  const loadDetail = async (id) => {
    try {
      const res = await authAxios.get(`/admin/teams/${id}`)
      const d = res.data
      setDetail(d)
      const lvl = d.levels.find((l) => l.isDefault) || d.levels[0]
      setLevelId(lvl?.id ?? null)
      setGrid(lvl ? { ...lvl.permissions } : {})
      setSubs(lvl ? { ...(lvl.submodules || {}) } : {})
      setDirty(false)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load this team')
    }
  }

  useEffect(() => { (async () => { setLoading(true); await loadTeams(); setLoading(false) })() }, [])
  useEffect(() => { if (selectedId) loadDetail(selectedId) }, [selectedId])

  const currentLevel = useMemo(
    () => detail?.levels.find((l) => l.id === levelId) || null,
    [detail, levelId],
  )
  const modules = detail?.modules || []

  // Super Admin's grid is not consulted by anything. `resolveAccess` returns a
  // full grid for this team unconditionally, so the rows here were written,
  // read back, and ignored — an editor that accepted a change and quietly did
  // nothing, which is the one thing a permissions screen must never do.
  //
  // The backend now refuses the write. Showing the reason instead of the grid
  // means nobody reaches that error by trying.
  const isSuperAdmin = detail?.key === 'super-admin'

  const pickLevel = (id) => {
    if (dirty && !window.confirm('Discard unsaved permission changes?')) return
    const lvl = detail.levels.find((l) => l.id === id)
    setLevelId(id)
    setGrid(lvl ? { ...lvl.permissions } : {})
    setSubs(lvl ? { ...(lvl.submodules || {}) } : {})
    setDirty(false)
  }

  const setCell = (moduleKey, action, value) => {
    setGrid((g) => ({ ...g, [moduleKey]: { ...(g[moduleKey] || blank), [action]: value } }))
    setDirty(true)
  }
  const setRow = (moduleKey, preset) => {
    const map = {
      full: { create: true, read: true, update: true, delete: true },
      readonly: { create: false, read: true, update: false, delete: false },
      none: { ...blank },
    }
    setGrid((g) => ({ ...g, [moduleKey]: map[preset] }))
    setDirty(true)
  }
  const setAll = (preset) => {
    const map = {
      full: { create: true, read: true, update: true, delete: true },
      readonly: { create: false, read: true, update: false, delete: false },
      none: { ...blank },
    }
    setGrid(() => Object.fromEntries(modules.map((m) => [m.key, { ...map[preset] }])))
    setDirty(true)
  }

  // ── Per-screen overrides ──
  // Adding one seeds it from the module's current row, so "override" starts as
  // "same as now" and the admin changes only what they mean to. Seeding it
  // blank would make every override begin by silently revoking everything.
  // How many screens in this module deviate — shown on the collapsed toggle so
  // an override is never invisible.
  const overrideCount = (moduleKey) =>
    Object.values(subs).filter((o) => o.module === moduleKey).length

  const addOverride = (moduleKey, route) => {
    setSubs((prev) => ({
      ...prev,
      [route]: { module: moduleKey, ...(grid[moduleKey] || blank) },
    }))
    setDirty(true)
  }

  // Removing an override returns the screen to inheriting its module. The save
  // call sends the remaining set and the backend deletes anything absent.
  const removeOverride = (route) => {
    setSubs((prev) => {
      const next = { ...prev }
      delete next[route]
      return next
    })
    setDirty(true)
  }

  const setSubCell = (route, action, value) => {
    setSubs((prev) => ({ ...prev, [route]: { ...prev[route], [action]: value } }))
    setDirty(true)
  }

  const saveGrid = async () => {
    if (!currentLevel) return
    setBusy(true)
    try {
      await authAxios.put(`/admin/teams/${selectedId}/levels/${levelId}/permissions`, { permissions: grid, submodules: subs })
      InfoToast('Permissions saved')
      await loadDetail(selectedId)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not save permissions')
    } finally { setBusy(false) }
  }

  // ── Team / level mutations ──
  const submitAddTeam = async (payload) => {
    setBusy(true)
    try {
      const res = await authAxios.post('/admin/teams', payload)
      InfoToast('Team created')
      setModal(null)
      await loadTeams(res.data?.id)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not create team')
    } finally { setBusy(false) }
  }
  const submitEditTeam = async (payload) => {
    setBusy(true)
    try {
      await authAxios.put(`/admin/teams/${selectedId}`, payload)
      InfoToast('Team updated')
      setModal(null)
      await loadTeams()
      await loadDetail(selectedId)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update team')
    } finally { setBusy(false) }
  }
  const deleteTeam = async () => {
    if (!window.confirm(`Delete the “${detail.name}” team? This cannot be undone.`)) return
    setBusy(true)
    try {
      await authAxios.delete(`/admin/teams/${selectedId}`)
      InfoToast('Team deleted')
      setSelectedId(null); setDetail(null)
      const list = await loadTeams()
      setSelectedId(list[0]?.id ?? null)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not delete team')
    } finally { setBusy(false) }
  }
  const addLevel = async () => {
    const name = window.prompt('New level name (e.g. Team Lead, Reviewer):')
    if (name === null) return
    if (!name.trim()) { ErrorToast('A name is required'); return }
    setBusy(true)
    try {
      await authAxios.post(`/admin/teams/${selectedId}/levels`, { name: name.trim() })
      InfoToast('Level added')
      await loadDetail(selectedId)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not add level')
    } finally { setBusy(false) }
  }
  const makeDefaultLevel = async () => {
    setBusy(true)
    try {
      await authAxios.put(`/admin/teams/${selectedId}/levels/${levelId}`, { isDefault: true })
      InfoToast('Default level set')
      await loadDetail(selectedId)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not set default')
    } finally { setBusy(false) }
  }
  const deleteLevel = async () => {
    if (!window.confirm(`Delete the “${currentLevel.name}” level?`)) return
    setBusy(true)
    try {
      await authAxios.delete(`/admin/teams/${selectedId}/levels/${levelId}`)
      InfoToast('Level deleted')
      await loadDetail(selectedId)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not delete level')
    } finally { setBusy(false) }
  }

  const actions = (
    <button type='button' className='btn-md' onClick={() => setModal({ type: 'add-team' })}>
      + Add team
    </button>
  )

  return (
    <PageLayout
      title='Roles & Permissions'
      subtitle='Team → level → module → screen. Everything a team can reach, in one place.'
      breadcrumb={['Settings', 'Teams & Access']}
      actions={actions}
    >
      {loading ? (
        <p className='py-8 text-sm text-[#757575]'>Loading…</p>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4'>
          {/* Teams list */}
          <div className='bg-white border border-gray-100 rounded-lg p-2 h-max'>
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md mb-1 transition ${
                  selectedId === t.id ? 'bg-[#FCF6E3] border border-[#ECC032]' : 'hover:bg-[#fafafa] border border-transparent'}`}
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-sm font-medium text-[#1a1a1a] truncate'>{t.name}</span>
                  {t.isSystem && <span className='text-[9px] uppercase font-semibold text-[#959595] bg-gray-100 px-1.5 py-0.5 rounded'>system</span>}
                </div>
                <p className='text-[11px] text-[#959595] mt-0.5'>
                  {t.memberCount} member{t.memberCount === 1 ? '' : 's'} · {t.levels.length} level{t.levels.length === 1 ? '' : 's'}
                </p>
              </button>
            ))}
          </div>

          {/* Selected team */}
          {detail ? (
            <div className='min-w-0'>
              <div className='bg-white border border-gray-100 rounded-lg p-5 mb-4'>
                <div className='flex items-start justify-between gap-3 flex-wrap'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2'>
                      <h2 className='text-lg font-bold text-[#1a1a1a] m-0'>{detail.name}</h2>
                      {detail.isSystem && <span className='text-[10px] uppercase font-semibold text-[#959595] bg-gray-100 px-2 py-0.5 rounded'>built-in</span>}
                    </div>
                    <p className='text-xs text-[#757575] mt-1'>{detail.description || 'No description.'}</p>
                    <p className='text-[11px] text-[#959595] mt-1'>{detail.memberCount} member{detail.memberCount === 1 ? '' : 's'}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button onClick={() => setModal({ type: 'edit-team', name: detail.name, description: detail.description || '' })}
                      className='text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-300'>Edit</button>
                    {!detail.isSystem && (
                      <button onClick={deleteTeam} disabled={busy}
                        className='text-xs font-semibold border border-red-200 text-red-600 px-3 py-1.5 rounded-md disabled:opacity-50'>Delete</button>
                    )}
                  </div>
                </div>

                {/* Level tabs */}
                <div className='flex items-center gap-2 flex-wrap mt-4 border-t border-gray-50 pt-3'>
                  {detail.levels.map((l) => (
                    <button key={l.id} onClick={() => pickLevel(l.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                        levelId === l.id ? 'bg-[#ECC032] border-[#ECC032] text-black' : 'bg-white border-gray-200 text-[#757575] hover:border-gray-300'}`}>
                      {l.name}{l.isDefault ? ' ★' : ''}
                    </button>
                  ))}
                  <button onClick={addLevel} disabled={busy}
                    className='text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-[#757575] hover:border-gray-400 disabled:opacity-50'>
                    + Level
                  </button>
                </div>
                {currentLevel && (
                  <div className='flex items-center gap-3 mt-2'>
                    <p className='text-[11px] text-[#959595]'>
                      Editing <span className='font-semibold text-[#454545]'>{currentLevel.name}</span>
                      {currentLevel.isDefault && ' — the default level for new members'}
                    </p>
                    {!currentLevel.isDefault && (
                      <button onClick={makeDefaultLevel} disabled={busy} className='text-[11px] font-semibold text-blue-700 hover:underline disabled:opacity-50'>Set default</button>
                    )}
                    {detail.levels.length > 1 && (
                      <button onClick={deleteLevel} disabled={busy} className='text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50'>Delete level</button>
                    )}
                  </div>
                )}
              </div>

              {/* Permission grid — or, for Super Admin, why there isn't one */}
              {isSuperAdmin ? (
                <div className='bg-white border border-gray-100 rounded-lg p-5'>
                  <p className='text-xs font-semibold text-[#1a1a1a] mb-1.5'>
                    Super Admin access is fixed
                  </p>
                  <p className='text-[12px] text-[#757575] leading-relaxed max-w-2xl'>
                    This team always has full access to every module and every screen. The
                    permission grid is not consulted for it, so there is nothing here to edit —
                    a change would appear to save and would not take effect.
                  </p>
                  <p className='text-[12px] text-[#757575] leading-relaxed max-w-2xl mt-2'>
                    To limit what someone can do, move them to a different team. Super Admin
                    cannot revoke its own access, which is what stops the panel being locked
                    from inside it.
                  </p>
                </div>
              ) : (
              <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
                <div className='flex items-center justify-between gap-2 px-5 py-3 border-b border-gray-100 bg-[#fafafa]'>
                  <p className='text-xs font-semibold text-[#1a1a1a]'>Module access — {currentLevel?.name}</p>
                  <div className='flex items-center gap-2'>
                    <span className='text-[11px] text-[#959595]'>Set all:</span>
                    <button onClick={() => setAll('full')} className='text-[11px] font-semibold border border-gray-200 px-2 py-1 rounded'>Full</button>
                    <button onClick={() => setAll('readonly')} className='text-[11px] font-semibold border border-gray-200 px-2 py-1 rounded'>Read-only</button>
                    <button onClick={() => setAll('none')} className='text-[11px] font-semibold border border-gray-200 px-2 py-1 rounded'>None</button>
                  </div>
                </div>
                <div className='overflow-x-auto'>
                  <table className='w-full border-collapse'>
                    <thead>
                      <tr className='border-b border-gray-100'>
                        <th className='text-left text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-5 py-2.5'>Module</th>
                        {ACTIONS.map(([, label]) => (
                          <th key={label} className='text-center text-[11px] uppercase tracking-tight text-[#959595] font-semibold px-3 py-2.5 w-20'>{label}</th>
                        ))}
                        <th className='px-3 py-2.5 w-28'></th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((m) => {
                        const cell = grid[m.key] || blank
                        return (
                        <React.Fragment key={m.key}>
                          <tr className='border-b border-gray-50 last:border-0 hover:bg-[#fafafa]'>
                            <td className='px-5 py-2.5'>
                              <p className='text-sm font-medium text-[#1a1a1a] m-0'>{m.label}</p>
                              <p className='text-[11px] text-[#959595] m-0'>{(m.features || []).slice(0, 3).join(' · ')}</p>
                            </td>
                            {ACTIONS.map(([action]) => (
                              <td key={action} className='text-center px-3 py-2.5'>
                                <input type='checkbox' className='w-4 h-4 accent-[#ECC032] cursor-pointer'
                                  checked={!!cell[action]}
                                  onChange={(e) => setCell(m.key, action, e.target.checked)} />
                              </td>
                            ))}
                            <td className='px-3 py-2.5 text-right'>
                              <div className='flex gap-1 justify-end items-center'>
                                <button onClick={() => setRow(m.key, 'full')} className='text-[10px] font-semibold text-[#757575] border border-gray-200 px-1.5 py-0.5 rounded hover:border-gray-300'>Full</button>
                                <button onClick={() => setRow(m.key, 'none')} className='text-[10px] font-semibold text-[#757575] border border-gray-200 px-1.5 py-0.5 rounded hover:border-gray-300'>None</button>
                                {(SCREENS_BY_MODULE[m.key] || []).length > 0 && (
                                  <button
                                    onClick={() => setExpanded(expanded === m.key ? null : m.key)}
                                    title='Set permissions for individual screens in this module'
                                    className='text-[10px] font-semibold text-[#757575] border border-gray-200 px-1.5 py-0.5 rounded hover:border-gray-300'>
                                    {expanded === m.key ? 'Hide screens' : `Screens (${(SCREENS_BY_MODULE[m.key] || []).length})`}
                                    {overrideCount(m.key) > 0 && (
                                      <span className='ml-1 text-[#ECC032]'>●{overrideCount(m.key)}</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* One row per screen in this module. Collapsed by
                              default: most screens inherit, and showing 58 rows
                              at once would bury the handful that don't. The
                              amber dot on the toggle is how an override stays
                              discoverable while collapsed. */}
                          {expanded === m.key && (SCREENS_BY_MODULE[m.key] || []).map((sc) => {
                            const ov = subs[sc.route]
                            const eff = ov || cell
                            return (
                              // An overridden row is marked by the row ITSELF —
                              // a left accent bar and a tinted background —
                              // rather than a badge next to the label. The
                              // distinction that matters here is "which of
                              // these 58 rows deviate", and that is a scanning
                              // question: an edge you can run your eye down
                              // answers it, a word you have to read on each row
                              // does not.
                              <tr key={sc.route}
                                className={ov
                                  ? 'bg-[#fffdf5] border-b border-gray-50'
                                  : 'bg-[#fcfcfc] border-b border-gray-50'}>
                                <td className={`px-5 py-2 pl-10 border-l-2 ${ov ? 'border-[#ECC032]' : 'border-transparent'}`}>
                                  <p className='text-[13px] text-[#454545] m-0 flex items-center gap-1.5'>
                                    {/* The dot repeats the accent for anyone who
                                        cannot pick up the colour alone. */}
                                    {ov && <span className='w-1.5 h-1.5 rounded-full bg-[#ECC032] shrink-0' title='Overridden' />}
                                    {sc.label}
                                  </p>
                                </td>
                                {ACTIONS.map(([action]) => (
                                  <td key={action} className='text-center px-3 py-2'>
                                    <input type='checkbox'
                                      className='w-3.5 h-3.5 accent-[#ECC032] cursor-pointer disabled:opacity-40'
                                      checked={!!eff[action]}
                                      disabled={!ov}
                                      onChange={(e) => setSubCell(sc.route, action, e.target.checked)} />
                                  </td>
                                ))}
                                <td className='px-3 py-2 text-right'>
                                  {/* Override is amber, matching the accent that
                                      marks an overridden row and the dot on the
                                      module toggle — one colour meaning
                                      "deviates from the module" throughout.
                                      Inherit is neutral, not red: returning a
                                      screen to its module default is a reset,
                                      not a destructive act, and red would make
                                      the safe direction look like the dangerous
                                      one. */}
                                  {ov ? (
                                    <button onClick={() => removeOverride(sc.route)}
                                      title='Return this screen to its module permissions'
                                      className='text-[10px] font-semibold text-[#757575] border border-gray-200 px-2 py-0.5 rounded hover:border-gray-300 hover:text-[#454545]'>
                                      Reset to module
                                    </button>
                                  ) : (
                                    <button onClick={() => addOverride(m.key, sc.route)}
                                      title='Give this screen its own permissions'
                                      className='text-[10px] font-semibold text-[#8a6d10] bg-[#fdf6e0] border border-[#ECC032] px-2 py-0.5 rounded hover:bg-[#fbefc9]'>
                                      Override
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className='flex items-center justify-between gap-2 px-5 py-3 border-t border-gray-100'>
                  <p className='text-[11px] text-[#959595]'>{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
                  <button onClick={saveGrid} disabled={busy || !dirty}
                    className='text-sm font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md disabled:opacity-50'>
                    {busy ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
              )}
            </div>
          ) : (
            <div className='bg-white border border-gray-100 rounded-lg p-8 text-center'>
              <p className='text-sm text-[#757575]'>Select a team to edit its access.</p>
            </div>
          )}
        </div>
      )}

      {modal?.type === 'add-team' && (
        <TeamModal title='Add team' teams={teams} busy={busy}
          onClose={() => setModal(null)} onSubmit={submitAddTeam} showCopy />
      )}
      {modal?.type === 'edit-team' && (
        <TeamModal title='Edit team' busy={busy} initial={{ name: modal.name, description: modal.description }}
          onClose={() => setModal(null)} onSubmit={submitEditTeam} />
      )}
    </PageLayout>
  )
}

// Module-scope so it isn't remounted each render (would drop input focus).
const TeamModal = ({ title, initial = {}, teams = [], showCopy = false, busy, onClose, onSubmit }) => {
  const [name, setName] = useState(initial.name || '')
  const [description, setDescription] = useState(initial.description || '')
  const [copyFromTeamId, setCopyFromTeamId] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const payload = { name: name.trim(), description: description.trim() }
    if (showCopy && copyFromTeamId) payload.copyFromTeamId = Number(copyFromTeamId)
    onSubmit(payload)
  }

  return (
    <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6' onClick={onClose}>
      <div className='bg-white rounded-md p-5 w-full max-w-lg' onClick={(e) => e.stopPropagation()}>
        <p className='font-semibold mb-4'>{title}</p>
        <form onSubmit={submit}>
          <label className='text-[#000] text-sm font-medium'>Team name</label>
          <input className={`${input} w-full mt-1 mb-3`} value={name} onChange={(e) => setName(e.target.value)}
            placeholder='e.g. Fraud & Risk' required autoFocus />
          <label className='text-[#000] text-sm font-medium'>Description</label>
          <textarea className={`${input} w-full mt-1 mb-3 min-h-[70px]`} value={description}
            onChange={(e) => setDescription(e.target.value)} placeholder='What does this team do?' />
          {showCopy && (
            <>
              <label className='text-[#000] text-sm font-medium'>Copy access from (optional)</label>
              <select className={`${input} w-full mt-1 mb-2`} value={copyFromTeamId} onChange={(e) => setCopyFromTeamId(e.target.value)}>
                <option value=''>Start with no access</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <p className='text-[11px] text-[#959595] mb-2'>Seeds the new team’s levels from an existing team; you can tweak afterwards.</p>
            </>
          )}
          <div className='flex justify-end gap-3 mt-4'>
            <button type='button' onClick={onClose} className='text-sm font-semibold text-[#757575]'>Cancel</button>
            <button type='submit' disabled={busy || !name.trim()}
              className='text-sm font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md disabled:opacity-50'>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
