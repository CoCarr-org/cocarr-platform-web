'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Popup, SettingsPlaceholder, SettingsSectionLayout } from '@cocarr/ui'
import { ResourceManager } from '@cocarr/datagrid'
import { Input } from '@cocarr/forms'
import { getDateTimeFormat } from '@cocarr/shared-utils'

// API keys can't use ResourceManager: the secret is returned once on create
// and must be surfaced immediately, and keys are revoked rather than edited.
const ApiKeys = () => {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [issued, setIssued] = useState(null)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')

  async function load() {
    try {
      setLoading(true)
      const res = await coreApi().get('/admin/api-keys?limit=50')
      setKeys(res.data?.data || [])
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load API keys')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const create = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await coreApi().post('/admin/api-keys', { name })
      setIssued(res.data)
      setCreating(false)
      setName('')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not create key')
    } finally { setBusy(false) }
  }

  const revoke = async (id) => {
    try {
      await coreApi().delete(`/admin/api-keys/${id}`)
      InfoToast('Key revoked')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not revoke key')
    }
  }

  return (
    <div className='py-4'>
      <div className='flex justify-between items-center mb-3 px-1'>
        <p className='text-xs text-[#757575] max-w-lg'>
          Keys are shown once at creation and stored only as a hash — they cannot be retrieved later. <strong>Nothing authenticates with these yet</strong>; issuing a key does not currently grant API access.
        </p>
        <button type='button' className='btn-md' onClick={() => setCreating(true)}>+ New Key</button>
      </div>
      <div className='overflow-hidden rounded-md border border-gray-100 bg-white'>
        {loading && <p className='px-6 py-4 text-sm text-[#757575]'>Loading…</p>}
        {!loading && keys.length === 0 && <p className='px-6 py-4 text-sm text-[#757575]'>No API keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className='border-b border-gray-100 last:border-b-0 flex justify-between items-center px-6 py-3'>
            <div>
              <p className='text-sm font-semibold'>{k.name}</p>
              <p className='text-xs text-[#757575]'>{k.prefix}… · created {getDateTimeFormat(k.createdAt)}{k.createdByName ? ` by ${k.createdByName}` : ''}</p>
            </div>
            {k.revokedAt
              ? <span className='text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-[#757575]'>Revoked</span>
              : <button type='button' className='text-xs font-semibold text-red-600 px-3 py-1 hover:bg-red-50 rounded-md' onClick={() => revoke(k.id)}>Revoke</button>}
          </div>
        ))}
      </div>

      {creating && (
        <Popup onClose={() => setCreating(false)} title='New API key' submitTitle='Create' formName='apiKeyForm' submitting={busy}>
          <form id='apiKeyForm' className='w-full' onSubmit={create}>
            <label className='text-xs text-[#757575] block mb-1'>Key name *</label>
            <Input value={name} setValue={setName} placeholder='e.g. Partner integration' required />
          </form>
        </Popup>
      )}

      {issued && (
        <Popup onClose={() => setIssued(null)} title='Copy your key now' submitTitle='Done' formName='issuedKeyForm'>
          <form id='issuedKeyForm' onSubmit={(e) => { e.preventDefault(); setIssued(null) }}>
            <p className='text-sm mb-2'>{issued.warning}</p>
            <input readOnly className='text-input w-full text-xs' value={issued.key} onFocus={(e) => e.target.select()} />
          </form>
        </Popup>
      )}
    </div>
  )
}

export default function SecuritySettings() {
  return (
    <SettingsSectionLayout
      title='Security'
      items={[
        { key: 'api-keys', label: 'API Keys', content: <ApiKeys /> },
        {
          key: 'ip-whitelist', label: 'IP Whitelist',
          content: (
            <ResourceManager
              endpoint='/admin/ip-whitelist'
              searchPlaceholder='Search IPs'
              createLabel='+ Add IP'
              emptyText='No IPs whitelisted. Note: nothing enforces this list yet — adding an entry does not restrict access.'
              columns={[
                { key: 'label', label: 'Label' },
                { key: 'ipAddress', label: 'IP Address' },
                { key: 'isActive', label: 'Active' },
                { key: 'createdAt', label: 'Added' },
              ]}
              fields={[
                { key: 'label', label: 'Label', type: 'text', required: true },
                { key: 'ipAddress', label: 'IP address', type: 'text', required: true, placeholder: '203.0.113.4' },
                { key: 'isActive', label: 'Active', type: 'boolean' },
              ]}
            />
          ),
        },
        {
          key: 'login-history', label: 'Login History',
          content: (
            <ResourceManager
              endpoint='/admin/login-history'
              readOnly
              searchPlaceholder='Search by admin or IP'
              emptyText='No sign-ins recorded yet. Nothing writes to this table until the auth middleware is updated to record sessions.'
              columns={[
                { key: 'adminName', label: 'Admin' },
                { key: 'adminEmail', label: 'Email' },
                { key: 'ipAddress', label: 'IP' },
                { key: 'success', label: 'Success' },
                { key: 'createdAt', label: 'When' },
              ]}
              fields={[]}
            />
          ),
        },
        { key: 'mfa', label: 'Two-Factor Auth', content: <SettingsPlaceholder title='Two-Factor Authentication' description='Admin sign-in is handled entirely by Firebase Authentication — MFA would be enabled in the Firebase console, not here.' /> },
        { key: 'sessions', label: 'Session Timeout', content: <SettingsPlaceholder title='Session Timeout' description='Session lifetime is governed by Firebase ID-token expiry and the refresh logic in the dashboard layout. No configurable timeout exists.' /> },
      ]}
    />
  )
}
