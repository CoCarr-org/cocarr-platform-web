'use client'
import React, { useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast } from '@cocarr/notifications'
import { SettingsSectionLayout } from '@cocarr/ui'
import { ResourceManager } from '@cocarr/datagrid'

const fmtUptime = (s) => {
  if (!s && s !== 0) return '—'
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`
}

const HealthOverview = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const res = await coreApi().get('/admin/system-health')
      setData(res.data)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load system health')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  if (loading) return <p className='px-6 py-4 text-sm text-[#757575]'>Loading…</p>
  if (!data) return null

  const row = (label, value) => (
    <div className='flex justify-between py-2 border-b border-gray-50 last:border-b-0'>
      <span className='text-sm text-[#757575]'>{label}</span>
      <span className='text-sm font-medium'>{value}</span>
    </div>
  )

  return (
    <div className='py-4'>
      <div className='flex items-center gap-3 mb-4'>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${data.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {data.status === 'healthy' ? 'Healthy' : 'Degraded'}
        </span>
        <button type='button' className='btn-md-disabled' onClick={load}>Refresh</button>
      </div>
      <div className='grid md:grid-cols-2 gap-4'>
        <div className='bg-white border border-gray-100 rounded-md p-5'>
          <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>Process</p>
          {row('Uptime', fmtUptime(data.uptimeSeconds))}
          {row('Node', data.nodeVersion)}
          {row('Platform', data.platform)}
          {row('Memory (RSS)', `${data.memory?.rssMb} MB`)}
          {row('Heap used', `${data.memory?.heapUsedMb} MB`)}
        </div>
        <div className='bg-white border border-gray-100 rounded-md p-5'>
          <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>Services</p>
          {row('Database', data.database?.connected ? 'Connected' : `Error: ${data.database?.error || 'unknown'}`)}
          {row('System memory free', `${data.memory?.systemFreeMb} / ${data.memory?.systemTotalMb} MB`)}
          {row('Webhooks logged', data.webhooks?.total ?? 0)}
          {row('Webhook failures', data.webhooks?.failed ?? 0)}
          {(data.jobs || []).map((j) => row(j.name, j.configured ? 'Configured' : 'Not configured'))}
        </div>
      </div>
    </div>
  )
}

export default function SystemHealth() {
  return (
    <SettingsSectionLayout
      title='System Health'
      items={[
        { key: 'overview', label: 'Overview', content: <HealthOverview /> },
        {
          key: 'webhooks', label: 'Webhook Logs',
          content: (
            <ResourceManager
              endpoint='/admin/webhook-logs'
              readOnly
              searchPlaceholder='Search by source or event'
              emptyText='No webhook calls logged yet. Nothing writes to this table until the webhook handlers are updated to record their calls.'
              columns={[
                { key: 'source', label: 'Source' },
                { key: 'event', label: 'Event' },
                { key: 'statusCode', label: 'Status' },
                { key: 'succeeded', label: 'OK' },
                { key: 'createdAt', label: 'When' },
              ]}
              fields={[]}
            />
          ),
        },
      ]}
    />
  )
}
