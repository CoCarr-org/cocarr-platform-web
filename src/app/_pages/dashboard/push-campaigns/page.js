'use client'
import React, { useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { InfoToast, ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'
import ResourceManager from '@/app/_components/ResourceManager'

const AUDIENCE = [{ value: 'all', name: 'All' }, { value: 'rider', name: 'Rider' }, { value: 'host', name: 'Host' }]

export default function PushCampaigns() {
  const [busy, setBusy] = useState(null)

  // The backend deliberately returns 501 here: fcmService sends to a single
  // device token, so a real broadcast needs audience token collection and
  // batching first. Marking a campaign "sent" without sending would be worse
  // than failing loudly.
  const send = async (row, reload) => {
    setBusy(row.id)
    try {
      await authAxios.post(`/admin/push-campaigns/${row.id}/send`)
      InfoToast('Campaign sent')
      await reload()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not send campaign')
    } finally { setBusy(null) }
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <Header title={'Push Notifications'} RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3'>
        Compose and store campaigns. <strong>Broadcast sending is not implemented</strong> — the notification service targets one device at a time, so pressing Send returns a clear error rather than silently marking it sent.
      </p>
      <ResourceManager
        endpoint='/admin/push-campaigns'
        searchPlaceholder='Search campaigns'
        createLabel='+ New Campaign'
        emptyText='No campaigns yet.'
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'audience', label: 'Audience' },
          { key: 'status', label: 'Status' },
          { key: 'sentAt', label: 'Sent' },
        ]}
        fields={[
          { key: 'title', label: 'Title', type: 'text', required: true },
          { key: 'body', label: 'Message', type: 'textarea', required: true },
          { key: 'audience', label: 'Audience', type: 'select', options: AUDIENCE },
          { key: 'scheduledAt', label: 'Schedule for', type: 'date' },
        ]}
        renderRowExtra={(row, reload) => (
          row.status === 'draft' ? (
            <button type='button' disabled={busy === row.id}
              className='text-xs font-semibold px-3 py-1 rounded-md hover:bg-[#f3f3f3]'
              onClick={() => send(row, reload)}>
              {busy === row.id ? 'Sending…' : 'Send'}
            </button>
          ) : null
        )}
      />
    </div>
  )
}
