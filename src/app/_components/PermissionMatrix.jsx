'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'

// C/R/U/D per the spec's access legend.
const ACTIONS = [
  { key: 'create', letter: 'C', title: 'Create' },
  { key: 'read', letter: 'R', title: 'Read' },
  { key: 'update', letter: 'U', title: 'Update' },
  { key: 'delete', letter: 'D', title: 'Delete' },
]

const ACTION_ON = {
  create: 'bg-green-100 text-green-700 border-green-300',
  read: 'bg-blue-100 text-blue-700 border-blue-300',
  update: 'bg-amber-100 text-amber-700 border-amber-300',
  delete: 'bg-red-100 text-red-700 border-red-300',
}
const ACTION_OFF = 'bg-white text-[#c3c3c3] border-gray-200'

// Roles as rows, the spec's 18 modules as columns, each cell four toggleable
// C/R/U/D flags. Defaults come from the spec's Permission Matrix table and
// are only persisted once a cell is actually changed.
export default function PermissionMatrix() {
  const [roles, setRoles] = useState([])
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function getMatrix() {
    try {
      setLoading(true)
      const res = await authAxios.get('/admin/permissions')
      setRoles(res.data?.roles || [])
      setModules(res.data?.modules || [])
      setDirty(false)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load permissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { getMatrix() }, [])

  const toggle = (role, moduleKey, action) => {
    setRoles((prev) => prev.map((r) => {
      if (r.role !== role) return r
      const cell = r.permissions[moduleKey] || {}
      return {
        ...r,
        permissions: { ...r.permissions, [moduleKey]: { ...cell, [action]: !cell[action] } },
      }
    }))
    setDirty(true)
  }

  // Toggle every action for one (role, module) at once — 720 individual
  // checkboxes is a lot of clicking otherwise.
  const toggleAll = (role, moduleKey) => {
    setRoles((prev) => prev.map((r) => {
      if (r.role !== role) return r
      const cell = r.permissions[moduleKey] || {}
      const allOn = ACTIONS.every((a) => cell[a.key])
      const next = {}
      ACTIONS.forEach((a) => { next[a.key] = !allOn })
      return { ...r, permissions: { ...r.permissions, [moduleKey]: next } }
    }))
    setDirty(true)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const permissions = roles.flatMap((r) => modules.map((m) => ({
        role: r.role,
        module: m.key,
        ...ACTIONS.reduce((acc, a) => ({ ...acc, [a.key]: !!r.permissions[m.key]?.[a.key] }), {}),
      })))
      await authAxios.put('/admin/permissions', { permissions })
      InfoToast('Permissions saved')
      setDirty(false)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className='px-6 py-4 text-sm text-[#757575]'>Loading…</p>

  return (
    <div className='py-4'>
      <div className='flex items-start justify-between px-2 mb-3 gap-4'>
        <div className='text-xs text-[#757575] max-w-2xl'>
          <p className='mb-1'>
            <strong>C</strong>=Create <strong>R</strong>=Read <strong>U</strong>=Update <strong>D</strong>=Delete. Click a letter to toggle it, or the module name in a row to toggle all four.
          </p>
          <p>
            Enforcement is controlled by the <code className='bg-gray-100 px-1 rounded'>RBAC_ENFORCE</code> environment variable on the API and is <strong>off by default</strong> — until it&apos;s enabled this matrix records intended access without blocking anything. Modules marked <span className='text-[#c3c3c3]'>◦</span> have no backend built yet.
          </p>
        </div>
        <button type='button' className='btn-md-disabled shrink-0' disabled={!dirty || saving} onClick={onSave}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className='overflow-x-auto rounded-md border border-gray-100 shadow-xs shadow-gray-200 bg-white'>
        <table className='text-sm border-collapse'>
          <thead>
            <tr className='bg-[#f9f9f9] border-b border-gray-100'>
              <th className='sticky left-0 z-10 bg-[#f9f9f9] text-left px-4 py-3 font-semibold text-xs text-[#757575] uppercase tracking-tight border-r border-gray-100 min-w-[180px]'>
                Role
              </th>
              {modules.map((m) => (
                <th key={m.key} title={m.description} className='px-3 py-3 font-semibold text-[11px] text-[#757575] uppercase tracking-tight whitespace-nowrap border-r border-gray-100 last:border-r-0'>
                  {m.label}{!m.built && <span className='text-[#c3c3c3] ml-1' title='No backend built yet'>◦</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.role} className='border-b border-gray-100 last:border-b-0'>
                <td className='sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-100'>
                  <p className='font-semibold whitespace-nowrap'>{r.name}</p>
                  <p className='text-[11px] text-[#959595] max-w-[220px] leading-tight'>{r.description}</p>
                </td>
                {modules.map((m) => {
                  const cell = r.permissions[m.key] || {}
                  return (
                    <td key={m.key} className='px-3 py-2 border-r border-gray-100 last:border-r-0 align-middle'>
                      <div className='flex gap-1 justify-center'>
                        {ACTIONS.map((a) => (
                          <button
                            key={a.key}
                            type='button'
                            title={`${a.title} — ${m.label} — ${r.name}`}
                            onClick={() => toggle(r.role, m.key, a.key)}
                            className={`w-6 h-6 rounded border text-[11px] font-bold transition-colors ${cell[a.key] ? ACTION_ON[a.key] : ACTION_OFF}`}
                          >
                            {a.letter}
                          </button>
                        ))}
                      </div>
                      <button
                        type='button'
                        onClick={() => toggleAll(r.role, m.key)}
                        className='block mx-auto mt-1 text-[10px] text-[#b3b3b3] hover:text-[#454545]'
                      >
                        all
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
