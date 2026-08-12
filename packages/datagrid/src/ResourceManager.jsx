'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Popup, Pagination } from '@cocarr/ui'
import { Input, Select } from '@cocarr/forms'
import { getDateTimeFormat, LIMIT } from '@cocarr/shared-utils'
import { useCan } from '@cocarr/iam-sdk'


// Generic list/create/edit/delete UI for the admin modules that are plain
// CRUD over one endpoint (banners, FAQs, pages, flags, templates, IP
// whitelist...). Mirrors crudFactory.js on the backend so a module needs a
// field config here rather than its own bespoke screen.
//
// field: { key, label, type: text|textarea|number|select|boolean|date, options?, required?, hideInTable? }

// PERMISSION IS NOT THE ONLY GATE. `useCan` answers "may this admin edit rows
// of this kind"; an endpoint can additionally refuse ONE row — the platform
// owner's employee record is the live case, and the workspace API answers 409
// on any write to it. Endpoints that have such a rule return `actions` per row
// saying what they will accept.
//
// A row with no `actions` is not restricted: most endpoints have no per-row
// rule and send nothing, and defaulting to "denied" there would blank out the
// buttons on every screen in the app. Absence means "no opinion", never "no".
const rowAllows = (row, action) => row?.actions?.[action] !== false

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
  // Which platform service backs this endpoint: 'core', 'workspace', 'platform'.
  // Named rather than passed as a client so a screen never holds a base URL.
  api = 'core',
  // Base permission key for this screen, e.g. 'workspace.employees'. The Add /
  // Edit / Delete controls are derived from `<permission>.create|update|delete`.
  //
  // Required in practice: omitting it shows every control to everyone, which is
  // only ever right for a screen with no write actions at all.
  permission,
  // `(row) => href` — turns the FIRST column into a link to that row's detail
  // page. Optional, because most screens here are settings tables where the
  // edit dialog already shows every field a detail page could; a link to a
  // thinner copy of the dialog is worse than no link.
  //
  // Only the first cell is the link, not the whole row: a row-wide click
  // target sits on top of Edit and Delete, and a mis-aimed click that
  // navigates away from a list somebody is working through is exactly the
  // annoyance a detail page is supposed to remove. It also keeps the target a
  // real anchor, so middle-click and "open in new tab" work.
  detailHref,
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
  const client = createClient(api)
  // Hooks cannot be called conditionally, so each is asked for unconditionally
  // and the absence of `permission` is handled after.
  const canCreate = useCan(`${permission}.create`)
  const canUpdate = useCan(`${permission}.update`)
  const canDelete = useCan(`${permission}.delete`)
  const allowCreate = !readOnly && (!permission || canCreate)
  const allowUpdate = !readOnly && (!permission || canUpdate)
  const allowDelete = !readOnly && (!permission || canDelete)
  // The actions COLUMN only earns its width if at least one action survives.
  const anyRowAction = allowUpdate || allowDelete

  // OPTIONS LOADED FROM THE API, so a foreign key is a dropdown rather than a
  // box you type a uuid into.
  //
  // Every relational field was `type: 'text'` — "Department ID", "Manager
  // (employee ID)" — which asks somebody to know a uuid by heart, and silently
  // accepts a typo as a valid-looking value. A field declares where its options
  // come from and this loads them once:
  //
  //   { key: 'departmentId', type: 'select',
  //     optionsFrom: { api: 'workspace', endpoint: '/departments',
  //                    value: 'id', label: 'name' } }
  //
  // Fetched here rather than by each screen so every list gets it for free, and
  // a failure is per-FIELD: one unreachable lookup leaves that dropdown empty
  // with the rest of the form usable, instead of taking out the whole dialog.
  const [remoteOptions, setRemoteOptions] = useState({})
  const optionSpecs = JSON.stringify(
    (fields || []).filter((f) => f.optionsFrom).map((f) => [f.key, f.optionsFrom]),
  )
  useEffect(() => {
    const specs = JSON.parse(optionSpecs)
    if (specs.length === 0) return
    let cancelled = false
    ;(async () => {
      const loaded = {}
      await Promise.all(specs.map(async ([key, spec]) => {
        try {
          const res = await createClient(spec.api || api).get(`${spec.endpoint}?limit=${spec.limit || 500}`)
          const list = res.data?.data || res.data || []
          loaded[key] = list.map((row) => ({
            value: String(row[spec.value || 'id']),
            // A label built from more than one column (an employee's first and
            // last name) is common enough to be worth supporting directly.
            name: (spec.label || 'name').split('+')
              .map((c) => row[c.trim()]).filter(Boolean).join(' ') || String(row[spec.value || 'id']),
          }))
        } catch (_) { loaded[key] = [] }
      }))
      if (!cancelled) setRemoteOptions(loaded)
    })()
    return () => { cancelled = true }
  }, [optionSpecs, api])

  // A field's own static options win; otherwise whatever was fetched for it.
  const optionsFor = (f) => f.options || remoteOptions[f.key] || []

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
      // The table cell resolves through the SAME options the editor uses, so a
      // column shows "Operations" rather than a raw uuid.
      const opts = field.options || remoteOptions[colKey] || []
      // Same label fallback as the editor's Select — a cell and its dropdown
      // disagreeing about an option's name is worse than either being wrong.
      const hit = opts.find((o) => String(o.value) === String(value))
      return <span className='capitalize'>{hit?.label ?? hit?.name ?? value ?? '—'}</span>
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
                {columns.map((c, i) => {
                  const cell = c.render ? c.render(row) : renderCell(row, c.key)
                  return (
                    <td key={c.key} className='px-4 py-3 align-top'>
                      {detailHref && i === 0
                        ? (
                          <Link href={detailHref(row)} className='font-semibold text-[#252525] hover:underline'>
                            {/* An empty first cell would render a zero-width link nobody
                                can click, so fall back to something aimable. */}
                            {cell || 'View'}
                          </Link>
                        )
                        : cell}
                    </td>
                  )
                })}
                {anyRowAction && (
                  <td className='px-4 py-3 whitespace-nowrap text-right'>
                    {renderRowExtra?.(row, load)}
                    {allowUpdate && rowAllows(row, 'canEdit') && <button type='button' className='text-xs font-semibold px-3 py-1 hover:bg-[#f3f3f3] rounded-md' onClick={() => setEditing(row)}>Edit</button>}
                    {allowDelete && rowAllows(row, 'canDelete') && <button type='button' className='text-xs font-semibold px-3 py-1 text-red-600 hover:bg-red-50 rounded-md' onClick={() => setDeleting(row)}>Delete</button>}
                    {row.actions?.restrictedReason && (
                      <span className='text-[11px] text-[#959595]' title={row.actions.restrictedReason}>Protected</span>
                    )}
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
          // Resolved options are PASSED IN. RecordPopup is a separate top-level
          // component, so it cannot see ResourceManager's scope — referencing
          // the resolver directly compiled fine and then threw the moment the
          // dialog opened.
          optionsFor={optionsFor}
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

// `optionsFor` defaults to the field's own static options, so a caller that does
// not pass it still renders — the prop is a resolver, not a requirement.
const RecordPopup = ({
  row, fields, submitting, onClose, onSubmit, optionsFor = (f) => f.options || [],
}) => {
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
                options={optionsFor(f)}
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
