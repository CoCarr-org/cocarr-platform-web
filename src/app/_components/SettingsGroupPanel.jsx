'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

// Editor for one platform-settings group (General, Business, Payments,
// Notifications, Storage, Maintenance). Rows are defined server-side in
// platformSettingDefaults.js and lazily created on first read.
export default function SettingsGroupPanel({ group, title, note }) {
  const [settings, setSettings] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  async function load() {
    try {
      setLoading(true)
      const res = await authAxios.get(`/admin/platform-settings/${group}`)
      const rows = res.data?.settings || []
      setSettings(rows)
      const v = {}
      rows.forEach((r) => { v[r.key] = r.value ?? '' })
      setValues(v)
      setDirty(false)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load settings')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [group])

  const set = (k, v) => { setValues((p) => ({ ...p, [k]: v })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try {
      await authAxios.put(`/admin/platform-settings/${group}`, { values })
      InfoToast('Settings saved')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not save settings')
    } finally { setSaving(false) }
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={title} RightContent={() => (
        <button type='button' className='btn-md-disabled' disabled={!dirty || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      )} />
      {note && <p className='text-xs text-[#757575] px-1 pt-3'>{note}</p>}

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && (
        <div className='bg-white border border-gray-100 rounded-md mt-4 divide-y divide-gray-100'>
          {settings.map((s) => (
            <div key={s.key} className='flex justify-between items-start gap-6 px-6 py-4'>
              <div className='min-w-0'>
                <p className='text-sm font-medium'>{s.label}</p>
                {s.description && <p className='text-xs text-[#959595] mt-0.5'>{s.description}</p>}
              </div>
              <div className='w-[320px] shrink-0'>
                {s.valueType === 'boolean' ? (
                  <div className='flex gap-2'>
                    <button type='button' onClick={() => set(s.key, 'true')}
                      className={`px-4 py-2 rounded-md text-xs font-semibold ${String(values[s.key]) === 'true' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-[#757575]'}`}>On</button>
                    <button type='button' onClick={() => set(s.key, 'false')}
                      className={`px-4 py-2 rounded-md text-xs font-semibold ${String(values[s.key]) !== 'true' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-[#757575]'}`}>Off</button>
                  </div>
                ) : s.valueType === 'textarea' ? (
                  <textarea className='text-input w-full min-h-[80px]' value={values[s.key] ?? ''} onChange={(e) => set(s.key, e.target.value)} />
                ) : (
                  <input className='text-input w-full' type={s.valueType === 'number' ? 'number' : 'text'}
                    value={values[s.key] ?? ''} onChange={(e) => set(s.key, e.target.value)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
