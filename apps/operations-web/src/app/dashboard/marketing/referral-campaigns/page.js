'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast, InfoToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'

// Marketing > Referral Campaigns. Configure the reward points, campaign window
// and eligibility toggles without an app release (the referral module reads the
// single active campaign; a built-in default applies when none is configured).
//   GET  /admin/referral-campaigns
//   POST /admin/referral-campaigns
//   PUT  /admin/referral-campaigns/:id

const input = 'w-full border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

const Field = ({ label, hint, children }) => (
  <div className='mb-4'>
    <label className='block text-xs font-semibold text-[#454545] mb-1.5'>{label}</label>
    {children}
    {hint && <p className='text-[11px] text-[#959595] mt-1'>{hint}</p>}
  </div>
)

const Toggle = ({ label, checked, onChange }) => (
  <label className='flex items-center gap-2 mb-3 cursor-pointer select-none'>
    <input type='checkbox' checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
    <span className='text-sm text-[#454545]'>{label}</span>
  </label>
)

// Mirrors the referral_campaigns defaults on the backend.
const EMPTY = {
  name: 'Referral campaign',
  active: true,
  startDate: '',
  endDate: '',
  referrerSignupPoints: 100,
  refereeSignupPoints: 100,
  referrerFirstBookingPoints: 200,
  refereeFirstBookingPoints: 100,
  firstBookingRewardEnabled: true,
  fraudChecksEnabled: true,
}

const toDateInput = (d) => {
  if (!d) return ''
  try { return new Date(d).toISOString().slice(0, 10) } catch { return '' }
}

export default function ReferralCampaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)  // null = list view; object = form
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/referral-campaigns')
      setCampaigns(res.data?.data || res.data || [])
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load campaigns')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => setEditing({ ...EMPTY })
  const openEdit = (c) => setEditing({
    ...EMPTY, ...c,
    startDate: toDateInput(c.startDate),
    endDate: toDateInput(c.endDate),
  })

  const setField = (key, value) => setEditing((e) => ({ ...e, [key]: value }))
  const setNum = (key, value) => setField(key, value === '' ? '' : Math.max(0, parseInt(value, 10) || 0))

  const save = async () => {
    if (!editing.name?.trim()) { ErrorToast('Give the campaign a name'); return }
    setSaving(true)
    try {
      const body = {
        ...editing,
        startDate: editing.startDate || null,
        endDate: editing.endDate || null,
      }
      if (editing.id) await coreApi().put(`/admin/referral-campaigns/${editing.id}`, body)
      else await coreApi().post('/admin/referral-campaigns', body)
      InfoToast(editing.id ? 'Campaign updated' : 'Campaign created')
      setEditing(null)
      load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not save campaign')
    } finally { setSaving(false) }
  }

  // ── Form view ──
  if (editing) {
    return (
      <div className='max-w-3xl mx-auto pb-10'>
        <Header title={editing.id ? 'Edit campaign' : 'New campaign'} RightContent={() => null} />

        <div className='bg-white border border-gray-100 rounded-md px-5 py-5 mt-3'>
          <Field label='Campaign name'>
            <input className={input} value={editing.name} onChange={(e) => setField('name', e.target.value)} />
          </Field>

          <div className='grid grid-cols-2 gap-4'>
            <Field label='Starts (optional)' hint='Empty = starts immediately'>
              <input type='date' className={input} value={editing.startDate} onChange={(e) => setField('startDate', e.target.value)} />
            </Field>
            <Field label='Ends (optional)' hint='Empty = open-ended'>
              <input type='date' className={input} value={editing.endDate} onChange={(e) => setField('endDate', e.target.value)} />
            </Field>
          </div>

          <p className='text-xs font-semibold text-[#454545] mt-2 mb-3'>Reward points</p>
          <div className='grid grid-cols-2 gap-4'>
            <Field label='Referrer — sign-up'>
              <input type='number' min='0' className={input} value={editing.referrerSignupPoints} onChange={(e) => setNum('referrerSignupPoints', e.target.value)} />
            </Field>
            <Field label='Referee — sign-up'>
              <input type='number' min='0' className={input} value={editing.refereeSignupPoints} onChange={(e) => setNum('refereeSignupPoints', e.target.value)} />
            </Field>
            <Field label='Referrer — first booking'>
              <input type='number' min='0' className={input} value={editing.referrerFirstBookingPoints} onChange={(e) => setNum('referrerFirstBookingPoints', e.target.value)} />
            </Field>
            <Field label='Referee — first booking'>
              <input type='number' min='0' className={input} value={editing.refereeFirstBookingPoints} onChange={(e) => setNum('refereeFirstBookingPoints', e.target.value)} />
            </Field>
          </div>

          <p className='text-xs font-semibold text-[#454545] mt-2 mb-3'>Rules</p>
          <Toggle label='Campaign active' checked={editing.active} onChange={(v) => setField('active', v)} />
          <Toggle label='First-booking reward enabled' checked={editing.firstBookingRewardEnabled} onChange={(v) => setField('firstBookingRewardEnabled', v)} />
          <Toggle label='Fraud checks enabled' checked={editing.fraudChecksEnabled} onChange={(v) => setField('fraudChecksEnabled', v)} />

          <div className='flex gap-3 mt-5'>
            <button
              onClick={save}
              disabled={saving}
              className='bg-[#ECC032] text-black text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-60'
            >
              {saving ? 'Saving…' : (editing.id ? 'Save changes' : 'Create campaign')}
            </button>
            <button
              onClick={() => setEditing(null)}
              disabled={saving}
              className='border border-gray-200 text-sm text-[#454545] px-5 py-2 rounded-md'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ──
  return (
    <div className='max-w-7xl mx-auto pb-10'>
      <Header
        title='Referral Campaigns'
        RightContent={() => (
          <button onClick={openNew} className='bg-[#ECC032] text-black text-sm font-semibold px-4 py-2 rounded-md'>
            + New campaign
          </button>
        )}
      />

      <p className='text-xs text-[#757575] px-1 pt-3'>
        The most recent <span className='font-semibold'>active</span> campaign within its date window is the one
        applied. When none is configured, the built-in default (100/100 sign-up, 200/100 first booking) is used.
      </p>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && campaigns.length === 0 && (
        <div className='bg-white border border-gray-100 rounded-md px-5 py-8 text-center mt-3'>
          <p className='text-sm text-[#757575]'>No campaigns yet — the default reward rules are in effect.</p>
        </div>
      )}

      {!loading && campaigns.length > 0 && (
        <div className='overflow-x-auto mt-3'>
          <table className='w-full'>
            <thead className='bg-[#f9f9f9]'>
              <tr>
                <td><p>Name</p></td>
                <td><p>Status</p></td>
                <td><p>Sign-up (referrer/referee)</p></td>
                <td><p>First booking (referrer/referee)</p></td>
                <td><p>Window</p></td>
                <td><p></p></td>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className='hover:bg-[#fafafa]'>
                  <td><p className='text-sm font-medium my-0'>{c.name}</p></td>
                  <td>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${c.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td><p className='text-sm my-0'>{c.referrerSignupPoints} / {c.refereeSignupPoints}</p></td>
                  <td>
                    <p className='text-sm my-0'>
                      {c.firstBookingRewardEnabled ? `${c.referrerFirstBookingPoints} / ${c.refereeFirstBookingPoints}` : '—'}
                    </p>
                  </td>
                  <td>
                    <p className='text-xs my-0 text-[#555]'>
                      {toDateInput(c.startDate) || 'now'} → {toDateInput(c.endDate) || 'open'}
                    </p>
                  </td>
                  <td>
                    <button onClick={() => openEdit(c)} className='text-xs text-[#ECC032] font-semibold whitespace-nowrap'>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
