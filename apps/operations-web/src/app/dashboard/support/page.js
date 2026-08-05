'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header, Popup } from '@cocarr/ui'
import { Input, Select } from '@cocarr/forms'
import { getDateTimeFormat } from '@cocarr/shared-utils'

const STATUS = [
  { value: 'open', name: 'Open' },
  { value: 'pending', name: 'Pending' },
  { value: 'resolved', name: 'Resolved' },
  { value: 'closed', name: 'Closed' },
]
const PRIORITY = [
  { value: 'low', name: 'Low' },
  { value: 'medium', name: 'Medium' },
  { value: 'high', name: 'High' },
  { value: 'urgent', name: 'Urgent' },
]

const STATUS_STYLE = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-[#757575]',
}
const PRIORITY_STYLE = {
  low: 'text-[#959595]', medium: 'text-blue-600', high: 'text-amber-600', urgent: 'text-red-600',
}

export default function SupportCenter() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    try {
      setLoading(true)
      let q = 'limit=50'
      if (search) q += `&search=${encodeURIComponent(search)}`
      if (statusFilter) q += `&status=${statusFilter}`
      const res = await coreApi().get(`/admin/tickets?${q}`)
      setTickets(res.data?.data || [])
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, statusFilter])

  const onCreate = async (e, values) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await coreApi().post('/admin/tickets', values)
      InfoToast('Ticket created')
      setCreating(false)
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Support Center'} RightContent={() => (
        <button type='button' className='btn-md' onClick={() => setCreating(true)}>+ New Ticket</button>
      )} />

      <div className='flex gap-3 items-center py-4 px-1'>
        <input className='text-input max-w-xs' placeholder='Search tickets' value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className='text-input' value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value=''>All statuses</option>
          {STATUS.map((s) => <option key={s.value} value={s.value}>{s.name}</option>)}
        </select>
      </div>

      <div className='overflow-hidden rounded-md border border-gray-100 shadow-xs shadow-gray-200 bg-white'>
        {loading && <p className='px-6 py-4 text-sm text-[#757575]'>Loading…</p>}
        {!loading && tickets.length === 0 && <p className='px-6 py-4 text-sm text-[#757575]'>No tickets yet.</p>}
        {tickets.map((t) => (
          <button
            key={t.id}
            type='button'
            onClick={() => setSelected(t.id)}
            className='w-full text-left border-b border-gray-100 last:border-b-0 flex justify-between items-center px-6 py-4 hover:bg-[#fafafa]'
          >
            <div>
              <p className='text-sm font-semibold tracking-tight'>{t.subject}</p>
              <p className='text-xs text-[#757575]'>
                {t.ticketNumber} · {t.category || 'uncategorised'} · {getDateTimeFormat(t.createdAt)}
              </p>
            </div>
            <div className='flex items-center gap-3 shrink-0'>
              <span className={`text-xs font-semibold ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[t.status]}`}>{t.status}</span>
            </div>
          </button>
        ))}
      </div>

      {selected && <TicketThread id={selected} onClose={() => setSelected(null)} onChanged={load} />}
      {creating && <CreateTicketPopup submitting={submitting} onClose={() => setCreating(false)} onSubmit={onCreate} />}
    </div>
  )
}

const TicketThread = ({ id, onClose, onChanged }) => {
  const [data, setData] = useState(null)
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const res = await coreApi().get(`/admin/tickets/${id}`)
      setData(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load ticket')
    }
  }
  useEffect(() => { load() }, [id])

  const send = async () => {
    if (!reply.trim()) return
    setBusy(true)
    try {
      await coreApi().post(`/admin/tickets/${id}/messages`, { message: reply, isInternalNote: internal })
      setReply('')
      await load()
      onChanged?.()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not send reply')
    } finally {
      setBusy(false)
    }
  }

  const setField = async (field, value) => {
    setBusy(true)
    try {
      await coreApi().put(`/admin/tickets/${id}`, { [field]: value })
      await load()
      onChanged?.()
      InfoToast('Ticket updated')
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update ticket')
    } finally {
      setBusy(false)
    }
  }

  const t = data?.ticket
  return (
    <div className='bg-[#000000aa] fixed z-[999] w-full h-full left-0 top-0 flex justify-center items-center py-2'>
      <div className='w-[760px] max-w-full bg-white rounded-lg max-h-[90vh] flex flex-col'>
        <div className='flex px-8 py-4 justify-between items-center border-b-2 border-gray-100'>
          <div>
            <h3 className='text-[14px] font-semibold tracking-tight'>{t?.subject || 'Ticket'}</h3>
            <p className='text-xs text-[#757575]'>{t?.ticketNumber}</p>
          </div>
          <button type='button' className='btn-md-disabled' onClick={onClose}>Close</button>
        </div>

        {t && (
          <div className='flex gap-3 px-8 py-3 border-b border-gray-100 items-center'>
            <div>
              <label className='text-[10px] uppercase text-[#757575] block'>Status</label>
              <select className='text-input text-xs' value={t.status} disabled={busy} onChange={(e) => setField('status', e.target.value)}>
                {STATUS.map((s) => <option key={s.value} value={s.value}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className='text-[10px] uppercase text-[#757575] block'>Priority</label>
              <select className='text-input text-xs' value={t.priority} disabled={busy} onChange={(e) => setField('priority', e.target.value)}>
                {PRIORITY.map((s) => <option key={s.value} value={s.value}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className='flex-1 overflow-y-auto px-8 py-4'>
          {(data?.messages || []).length === 0 && <p className='text-sm text-[#757575]'>No messages yet.</p>}
          {(data?.messages || []).map((m) => (
            <div key={m.id} className={`mb-3 p-3 rounded-md ${m.isInternalNote ? 'bg-amber-50 border border-amber-200' : m.authorType === 'admin' ? 'bg-[#f5f5f5]' : 'bg-blue-50'}`}>
              <div className='flex justify-between items-center mb-1'>
                <p className='text-xs font-semibold'>
                  {m.authorName || m.authorType}
                  {m.isInternalNote && <span className='ml-2 text-[10px] uppercase text-amber-700'>Internal note</span>}
                </p>
                <p className='text-[11px] text-[#959595]'>{getDateTimeFormat(m.createdAt)}</p>
              </div>
              <p className='text-sm whitespace-pre-wrap'>{m.message}</p>
            </div>
          ))}
        </div>

        <div className='px-8 py-4 border-t-2 border-gray-50'>
          <textarea
            className='text-input w-full min-h-[80px] mb-2'
            placeholder='Write a reply…'
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className='flex justify-between items-center'>
            <label className='text-xs text-[#757575] flex items-center gap-2'>
              <input type='checkbox' checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              Internal note (not shown to the customer)
            </label>
            <button type='button' className='btn-md' disabled={busy || !reply.trim()} onClick={send}>
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const CreateTicketPopup = ({ submitting, onClose, onSubmit }) => {
  const [v, setV] = useState({ subject: '', description: '', category: '', priority: 'medium', userId: '' })
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }))
  return (
    <Popup onClose={onClose} title='New ticket' submitTitle='Create' formName='newTicketForm' submitting={submitting}>
      <form className='w-full' id='newTicketForm' onSubmit={(e) => onSubmit(e, v)}>
        <div className='mb-4'>
          <label className='text-xs text-[#757575] block mb-1'>Subject *</label>
          <Input value={v.subject} setValue={(x) => set('subject', x)} placeholder='Subject' required />
        </div>
        <div className='mb-4'>
          <label className='text-xs text-[#757575] block mb-1'>Description</label>
          <textarea className='text-input w-full min-h-[100px]' value={v.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className='mb-4'>
          <label className='text-xs text-[#757575] block mb-1'>Category</label>
          <Input value={v.category} setValue={(x) => set('category', x)} placeholder='e.g. billing' />
        </div>
        <div className='mb-4'>
          <label className='text-xs text-[#757575] block mb-1'>Priority</label>
          <Select options={PRIORITY} value={v.priority} setValue={(x) => set('priority', x)} customValue='value' customLabel='name' />
        </div>
        <div>
          <label className='text-xs text-[#757575] block mb-1'>Customer user ID (optional)</label>
          <Input value={v.userId} setValue={(x) => set('userId', x)} placeholder='Firebase uid' />
        </div>
      </form>
    </Popup>
  )
}
