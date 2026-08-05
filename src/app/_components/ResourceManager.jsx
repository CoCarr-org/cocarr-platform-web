'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import workspaceAxios from '@/app/_helpers/workspaceAxios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Popup from '@/app/_components/Popup'
import Input from '@/app/_components/Input'
import Select from '@/app/_components/Select'
import Pagination from '@/app/_components/Pagination'
import { getDateTimeFormat } from '@/app/_helpers/utils'
import { usePermissions } from '@/app/_helpers/permissions'

const LIMIT = 25

// Generic list/create/edit/delete UI for the admin modules that are plain
// CRUD over one endpoint (banners, FAQs, pages, flags, templates, IP
// whitelist...). Mirrors crudFactory.js on the backend so a module needs a
// field config here rather than its own bespoke screen.
//
// field: { key, label, type: text|textarea|number|select|boolean|date, options?, required?, hideInTable? }

export default function ResourceManager({
  endpoint,
  fields,
  columns,
  searchPlaceholder = 'Search',
  createLabel = '+ Add',
  emptyText = 'Nothing here yet.',
  readOnly = false,
  extraQuery = '',
  renderRowExtra,
  // Which platform API backs this endpoint. Default is the core API (authAxios);
  // 'workspace' points the same CRUD UI at cocarr-workspace-api. Optional and
  // backward-compatible — every existing caller omits it and keeps the core API.
  api,
  // The RBAC module this screen belongs to. When given, the Add / Edit / Delete
  // controls are derived from the signed-in admin's team+level instead of being
  // shown to everyone.
  //
  // Optional on purpose: a caller that does not pass it keeps the old
  // behaviour, so this could not break the screens that had not been updated
  // yet. Every navConfig-driven list passes it via ListPage.
  module,
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  // Hide, don't disable. A greyed-out Delete invites "why can't I?", and the
  // honest answer — "your level cannot" — is better delivered by its absence
  // plus the level shown in the sidebar. Disabling is for temporarily
  // unavailable, not never-yours.
  const client = api === 'workspace' ? workspaceAxios : authAxios
  const { can } = usePermissions()
  const allowCreate = !readOnly && (!module || can(module, 'create'))
  const allowUpdate = !readOnly && (!module || can(module, 'update'))
  const allowDelete = !readOnly && (!module || can(module, 'delete'))
  // The actions COLUMN only earns its width if at least one action survives.
  const anyRowAction = allowUpdate || allowDelete

  const [editing, setEditing] = useState(null)   // row | 'new' | null
  const [deleting, setDeleting] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    try {
      setLoading(true)
      let q = `offset=${offset}&limit=${LIMIT}`
      if (search) q += `&search=${encodeURIComponent(search)}`
      if (extraQuery) q += `&${extraQuery}`
      const res = await client.get(`${endpoint}?${q}`)
      setRows(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [offset, search, extraQuery])

  const onSubmit = async (e, values) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing === 'new') await client.post(endpoint, values)
      else await client.put(`${endpoint}/${editing.id}`, values)
      InfoToast(editing === 'new' ? 'Created' : 'Updated')
      setEditing(null)
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async () => {
    setSubmitting(true)
    try {
      await client.delete(`${endpoint}/${deleting.id}`)
      InfoToast('Deleted')
      setDeleting(null)
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not delete')
    } finally {
      setSubmitting(false)
    }
  }

  const renderCell = (row, colKey) => {
    const value = row[colKey]
    const field = fields.find((f) => f.key === colKey)
    if (typeof value === 'boolean' || field?.type === 'boolean') {
      return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#757575]'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      )
    }
    if (field?.type === 'select') {
      return <span className='capitalize'>{field.options?.find((o) => String(o.value) === String(value))?.name || value || '—'}</span>
    }
    if (colKey === 'createdAt' || colKey === 'updatedAt' || field?.type === 'date') {
      return value ? getDateTimeFormat(value) : '—'
    }
    if (value === null || value === undefined || value === '') return '—'
    const str = String(value)
    return str.length > 80 ? `${str.slice(0, 80)}…` : str
  }

  return (
    <div className='py-4'>
      <div className='flex items-center justify-between gap-3 mb-3 px-1'>
        <input
          className='text-input max-w-xs'
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => { setOffset(0); setSearch(e.target.value) }}
        />
        <div className='flex items-center gap-3'>
          <Pagination count={count} offset={offset} setOffset={setOffset} />
          {allowCreate && <button type='button' className='btn-md whitespace-nowrap' onClick={() => setEditing('new')}>{createLabel}</button>}
        </div>
      </div>

      <div className='overflow-x-auto rounded-md border border-gray-100 shadow-xs shadow-gray-200 bg-white'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-[#f9f9f9] border-b border-gray-100'>
              {columns.map((c) => (
                <th key={c.key} className='text-left px-4 py-3 font-semibold text-xs text-[#757575] uppercase tracking-tight whitespace-nowrap'>{c.label}</th>
              ))}
              {anyRowAction && <th className='px-4 py-3' />}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length + 1} className='px-4 py-4 text-[#757575]'>Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={columns.length + 1} className='px-4 py-4 text-[#757575]'>{emptyText}</td></tr>}
            {!loading && rows.map((row) => (
              <tr key={row.id} className='border-b border-gray-100 last:border-b-0'>
                {columns.map((c) => (
                  <td key={c.key} className='px-4 py-3 align-top'>{c.render ? c.render(row) : renderCell(row, c.key)}</td>
                ))}
                {anyRowAction && (
                  <td className='px-4 py-3 whitespace-nowrap text-right'>
                    {renderRowExtra?.(row, load)}
                    {allowUpdate && <button type='button' className='text-xs font-semibold px-3 py-1 hover:bg-[#f3f3f3] rounded-md' onClick={() => setEditing(row)}>Edit</button>}
                    {allowDelete && <button type='button' className='text-xs font-semibold px-3 py-1 text-red-600 hover:bg-red-50 rounded-md' onClick={() => setDeleting(row)}>Delete</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <RecordPopup
          row={editing === 'new' ? null : editing}
          fields={fields}
          submitting={submitting}
          onClose={() => setEditing(null)}
          onSubmit={onSubmit}
        />
      )}
      {deleting && (
        <Popup onClose={() => setDeleting(null)} title='Delete record' submitTitle='Delete' onSubmittingTitle='Deleting' formName='deleteResourceForm' submitting={submitting}>
          <form id='deleteResourceForm' onSubmit={(e) => { e.preventDefault(); onDelete() }}>
            <p className='text-sm'>Delete this record? This cannot be undone.</p>
          </form>
        </Popup>
      )}
    </div>
  )
}

const RecordPopup = ({ row, fields, submitting, onClose, onSubmit }) => {
  const [values, setValues] = useState(() => {
    const init = {}
    fields.forEach((f) => {
      const v = row?.[f.key]
      init[f.key] = v === null || v === undefined
        ? (f.type === 'boolean' ? false : '')
        : (f.type === 'date' && v ? String(v).slice(0, 10) : v)
    })
    return init
  })

  const set = (key, v) => setValues((prev) => ({ ...prev, [key]: v }))

  return (
    <Popup
      onClose={onClose}
      title={row ? 'Edit record' : 'Add record'}
      submitTitle='Save'
      formName='resourceForm'
      submitting={submitting}
      size='lg'
    >
      <form className='w-full' id='resourceForm' onSubmit={(e) => onSubmit(e, values)}>
        {fields.map((f) => (
          <div className='mb-4' key={f.key}>
            <label className='text-xs text-[#757575] block mb-1'>{f.label}{f.required && ' *'}</label>
            {f.type === 'textarea' ? (
              <textarea
                className='text-input w-full min-h-[120px]'
                value={values[f.key] || ''}
                required={f.required}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : f.type === 'select' ? (
              <Select
                options={f.options || []}
                value={String(values[f.key] ?? '')}
                setValue={(v) => set(f.key, v)}
                customValue='value'
                customLabel='name'
                required={f.required}
                placeholder={`Select ${f.label.toLowerCase()}`}
              />
            ) : f.type === 'boolean' ? (
              <div className='flex gap-2'>
                <button type='button' onClick={() => set(f.key, true)} className={`px-4 py-2 rounded-md text-xs font-semibold ${values[f.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#757575]'}`}>Yes</button>
                <button type='button' onClick={() => set(f.key, false)} className={`px-4 py-2 rounded-md text-xs font-semibold ${!values[f.key] ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-[#757575]'}`}>No</button>
              </div>
            ) : (
              <Input
                type={f.type === 'date' ? 'date' : 'text'}
                number={f.type === 'number'}
                value={values[f.key] ?? ''}
                setValue={(v) => set(f.key, v)}
                placeholder={f.placeholder || f.label}
                required={f.required}
              />
            )}
          </div>
        ))}
      </form>
    </Popup>
  )
}
