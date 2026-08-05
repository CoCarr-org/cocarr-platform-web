'use client'
import React, { useEffect, useMemo, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast, InfoToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-50 text-blue-600',
  sending: 'bg-amber-50 text-amber-700',
  sent: 'bg-green-50 text-green-700',
  partial: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-600',
}

const Badge = ({ status }) => (
  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
    {status}
  </span>
)

const Field = ({ label, hint, children }) => (
  <div className='mb-4'>
    <label className='block text-xs font-semibold text-[#454545] mb-1.5'>{label}</label>
    {children}
    {hint && <p className='text-[11px] text-[#959595] mt-1'>{hint}</p>}
  </div>
)

const input = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

const EMPTY = {
  name: '', channels: ['email'], emailSubject: '', emailBody: '', smsBody: '',
  audienceSegment: 'all', audienceFilters: {}, scheduledAt: '',
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ segments: [], transports: {} })
  const [editing, setEditing] = useState(null)   // null = list view
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cities, setCities] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAxios.get('/admin/campaigns')
      setCampaigns(res.data?.data || [])
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load campaigns')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load()
    authAxios.get('/admin/campaigns/segments')
      .then((r) => setMeta(r.data || { segments: [], transports: {} }))
      .catch(() => {})
    // Only needed by the "by city" segment, but cheap and avoids a second
    // spinner inside the audience picker.
    authAxios.get('/city').then((r) => setCities(r.data?.data || r.data || [])).catch(() => {})
  }, [])

  const segment = useMemo(
    () => meta.segments.find((s) => s.key === editing?.audienceSegment),
    [meta.segments, editing?.audienceSegment],
  )

  const set = (patch) => setEditing((prev) => ({ ...prev, ...patch }))
  const setFilter = (key, value) => setEditing((prev) => ({
    ...prev, audienceFilters: { ...prev.audienceFilters, [key]: value },
  }))

  const toggleChannel = (channel) => {
    const has = editing.channels.includes(channel)
    set({ channels: has ? editing.channels.filter((c) => c !== channel) : [...editing.channels, channel] })
  }

  // Recipient counts change with the segment, so the preview is cleared
  // whenever it does — a stale count next to a Send button is dangerous.
  useEffect(() => { setPreview(null) }, [editing?.audienceSegment, editing?.audienceFilters])

  const runPreview = async () => {
    setPreviewing(true)
    try {
      const res = await authAxios.post('/admin/campaigns/audience-preview', {
        audienceSegment: editing.audienceSegment,
        audienceFilters: editing.audienceFilters,
      })
      setPreview(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not count recipients')
    } finally { setPreviewing(false) }
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = { ...editing, channels: editing.channels.join(',') }
      if (editing.id) await authAxios.put(`/admin/campaigns/${editing.id}`, payload)
      else await authAxios.post('/admin/campaigns', payload)
      InfoToast('Campaign saved')
      setEditing(null); setPreview(null); load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not save campaign')
    } finally { setSaving(false) }
  }

  const send = async (campaign) => {
    const count = preview?.total
    const warning = count === undefined
      ? `Send "${campaign.name}" now? This cannot be undone.`
      : `Send "${campaign.name}" to ${count} recipient(s) now? This cannot be undone.`
    if (!window.confirm(warning)) return
    try {
      await authAxios.post(`/admin/campaigns/${campaign.id}/send`)
      InfoToast('Campaign sent')
      setEditing(null); load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Send failed')
    }
  }

  const remove = async (campaign) => {
    if (!window.confirm(`Delete "${campaign.name}"?`)) return
    try {
      await authAxios.delete(`/admin/campaigns/${campaign.id}`)
      InfoToast('Campaign deleted'); load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not delete campaign')
    }
  }

  const openNew = () => { setPreview(null); setEditing({ ...EMPTY }) }
  const openEdit = (c) => {
    setPreview(null)
    setEditing({
      ...c,
      channels: String(c.channels || '').split(',').filter(Boolean),
      audienceFilters: c.audienceFilters || {},
      scheduledAt: c.scheduledAt ? String(c.scheduledAt).slice(0, 10) : '',
    })
  }

  // ── List view ───────────────────────────────────────────────
  if (!editing) {
    return (
      <div className='max-w-7xl mx-auto'>
        <Header title='Email / SMS Campaigns' RightContent={() => (
          <button onClick={openNew} className='bg-[#ECC032] text-black text-sm font-semibold px-4 py-2 rounded-md'>
            + New Campaign
          </button>
        )} />

        {!meta.transports.email && !meta.transports.sms && !loading && (
          <div className='bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md px-4 py-3 my-4'>
            Neither email nor SMS is configured on the server. Campaigns can be drafted but not sent.
          </div>
        )}

        <div className='bg-white border border-gray-100 rounded-md mt-4 overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='text-left text-[11px] uppercase tracking-tight text-[#757575] border-b border-gray-100'>
                <th className='px-4 py-3 font-semibold'>Name</th>
                <th className='px-4 py-3 font-semibold'>Channels</th>
                <th className='px-4 py-3 font-semibold'>Audience</th>
                <th className='px-4 py-3 font-semibold'>Status</th>
                <th className='px-4 py-3 font-semibold'>Results</th>
                <th className='px-4 py-3 font-semibold'>Created</th>
                <th className='px-4 py-3'></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className='px-4 py-6 text-[#757575]'>Loading…</td></tr>}
              {!loading && campaigns.length === 0 && (
                <tr><td colSpan={7} className='px-4 py-6 text-[#757575]'>
                  No campaigns yet. Create one to get started.
                </td></tr>
              )}
              {campaigns.map((c) => (
                <tr key={c.id} className='border-b border-gray-50 last:border-b-0'>
                  <td className='px-4 py-3 font-medium'>{c.name}</td>
                  <td className='px-4 py-3 text-xs text-[#757575] uppercase'>{String(c.channels || '').split(',').join(' + ')}</td>
                  <td className='px-4 py-3 text-xs text-[#757575]'>
                    {meta.segments.find((s) => s.key === c.audienceSegment)?.label || c.audienceSegment}
                  </td>
                  <td className='px-4 py-3'><Badge status={c.status} /></td>
                  <td className='px-4 py-3 text-xs text-[#757575]'>
                    {c.status === 'draft' || c.status === 'scheduled' ? '—' : (
                      <>
                        {c.emailSent > 0 && <span>{c.emailSent} email </span>}
                        {c.smsSent > 0 && <span>{c.smsSent} SMS </span>}
                        {(c.emailFailed > 0 || c.smsFailed > 0) &&
                          <span className='text-red-500'>· {c.emailFailed + c.smsFailed} failed</span>}
                      </>
                    )}
                  </td>
                  <td className='px-4 py-3 text-xs text-[#959595]'>
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className='px-4 py-3 text-right whitespace-nowrap'>
                    <button onClick={() => openEdit(c)} className='text-xs font-semibold text-[#454545] mr-3'>
                      {['sent', 'sending', 'partial'].includes(c.status) ? 'View' : 'Edit'}
                    </button>
                    <button onClick={() => remove(c)} className='text-xs font-semibold text-red-500'>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Builder ────────────────────────────────────────────────
  const locked = ['sent', 'sending', 'partial'].includes(editing.status)
  const hasEmail = editing.channels.includes('email')
  const hasSms = editing.channels.includes('sms')

  return (
    <div className='max-w-5xl mx-auto pb-10'>
      <Header title={editing.id ? editing.name || 'Campaign' : 'New Campaign'} RightContent={() => (
        <button onClick={() => { setEditing(null); setPreview(null) }} className='text-sm font-semibold text-[#454545]'>
          ← Back to campaigns
        </button>
      )} />

      {locked && (
        <div className='bg-gray-50 border border-gray-200 text-[#454545] text-xs rounded-md px-4 py-3 my-4'>
          This campaign has already been sent, so it is read-only — the stored copy is the record of what recipients received.
        </div>
      )}

      {/* 1. Basics + channels */}
      <div className='bg-white border border-gray-100 rounded-md p-5 my-4'>
        <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>1 · Campaign</p>

        <Field label='Campaign name' hint='Internal only — recipients never see this.'>
          <input className={input} disabled={locked} value={editing.name}
            onChange={(e) => set({ name: e.target.value })} placeholder='e.g. Diwali weekend offer' />
        </Field>

        <Field label='Channels' hint='Pick one or both. Each channel gets its own content below.'>
          <div className='flex gap-3'>
            {[
              { key: 'email', label: 'Email', available: meta.transports.email },
              { key: 'sms', label: 'SMS', available: meta.transports.sms },
            ].map((ch) => (
              <button key={ch.key} type='button' disabled={locked} onClick={() => toggleChannel(ch.key)}
                className={`px-4 py-2 rounded-md text-sm font-semibold border ${
                  editing.channels.includes(ch.key)
                    ? 'bg-[#ECC032] border-[#ECC032] text-black'
                    : 'bg-white border-gray-200 text-[#757575]'}`}>
                {ch.label}
                {!ch.available && <span className='ml-1.5 text-[10px] font-normal'>(not configured)</span>}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {/* 2. Audience */}
      <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
        <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>2 · Audience</p>

        <Field label='Who should receive this?' hint={segment?.description}>
          <select className={input} disabled={locked} value={editing.audienceSegment}
            onChange={(e) => set({ audienceSegment: e.target.value, audienceFilters: {} })}>
            {meta.segments.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>

        {/* Segment-specific inputs, driven by the backend's param descriptors. */}
        {(segment?.params || []).map((p) => (
          <Field key={p.key} label={p.label}>
            {p.type === 'city' ? (
              <select className={input} disabled={locked} value={editing.audienceFilters[p.key] || ''}
                onChange={(e) => setFilter(p.key, e.target.value)}>
                <option value=''>Select a city…</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <input className={input} disabled={locked} type={p.type === 'number' ? 'number' : p.type}
                value={editing.audienceFilters[p.key] ?? p.default ?? ''}
                onChange={(e) => setFilter(p.key, e.target.value)} />
            )}
          </Field>
        ))}

        <div className='flex items-center gap-3 mt-2'>
          <button type='button' onClick={runPreview} disabled={previewing}
            className='border border-gray-200 text-sm font-semibold px-4 py-2 rounded-md'>
            {previewing ? 'Counting…' : 'Preview recipients'}
          </button>
          {preview && (
            <p className='text-xs text-[#454545]'>
              <span className='font-semibold'>{preview.total}</span> user(s) match ·{' '}
              {hasEmail && <>{preview.reachableByEmail} reachable by email{preview.missingEmail > 0 && ` (${preview.missingEmail} have no address)`} </>}
              {hasEmail && hasSms && ' · '}
              {hasSms && <>{preview.reachableBySms} reachable by SMS{preview.missingPhone > 0 && ` (${preview.missingPhone} have no number)`}</>}
            </p>
          )}
        </div>
      </div>

      {/* 3. Content, one block per selected channel */}
      {hasEmail && (
        <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
          <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>3 · Email content</p>
          <Field label='Subject'>
            <input className={input} disabled={locked} value={editing.emailSubject || ''}
              onChange={(e) => set({ emailSubject: e.target.value })} placeholder='Your weekend ride is 20% off' />
          </Field>
          <Field label='Body (HTML allowed)' hint='Use {{name}}, {{email}} or {{phone}} to personalise. Unknown tags are removed before sending.'>
            <textarea className={`${input} min-h-[200px] font-mono text-xs`} disabled={locked}
              value={editing.emailBody || ''} onChange={(e) => set({ emailBody: e.target.value })}
              placeholder={'<p>Hi {{name}},</p>\n<p>…</p>'} />
          </Field>
        </div>
      )}

      {hasSms && (
        <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
          <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>
            {hasEmail ? '4' : '3'} · SMS content
          </p>
          <Field label='Message'
            hint={`${(editing.smsBody || '').length} characters · ${Math.max(1, Math.ceil((editing.smsBody || '').length / 160))} SMS segment(s). Must match your DLT-approved MSG91 template.`}>
            <textarea className={`${input} min-h-[100px]`} disabled={locked} value={editing.smsBody || ''}
              onChange={(e) => set({ smsBody: e.target.value })} placeholder='Hi {{name}}, 20% off your next COCARR ride this weekend.' />
          </Field>
        </div>
      )}

      {/* 4. Schedule + actions */}
      {!locked && (
        <div className='bg-white border border-gray-100 rounded-md p-5'>
          <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-4'>Schedule &amp; send</p>
          <Field label='Schedule for (optional)'
            hint='Setting a date marks the campaign as scheduled. There is no scheduler running yet — it still has to be sent manually.'>
            <input type='date' className={input} value={editing.scheduledAt || ''}
              onChange={(e) => set({ scheduledAt: e.target.value })} />
          </Field>

          <div className='flex items-center gap-3 mt-5'>
            <button onClick={save} disabled={saving}
              className='bg-[#ECC032] text-black text-sm font-semibold px-5 py-2 rounded-md'>
              {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Save draft'}
            </button>
            {editing.id && (
              <button onClick={() => send(editing)}
                className='border border-red-200 text-red-600 text-sm font-semibold px-5 py-2 rounded-md'>
                Send now
              </button>
            )}
            {!editing.id && <p className='text-xs text-[#959595]'>Save the draft before you can send it.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
