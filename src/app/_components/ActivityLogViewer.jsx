'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import { getDateTimeFormat } from '@/app/_helpers/utils'
import Pagination from '@/app/_components/Pagination'

const ACTION_STYLE = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
}

// Renders a log entry's `changes` JSON as a short human-readable summary —
// {field: {from, to}} for updates, {created: {...}} / {deleted: {...}} for
// create/delete.
function summarizeChanges(log) {
  const changes = log.changes
  if (!changes) return '—'

  if (log.action === 'create' && changes.created) {
    return 'Created'
  }
  if (log.action === 'delete' && changes.deleted) {
    return 'Deleted'
  }
  const fields = Object.keys(changes).filter((k) => k !== 'created' && k !== 'deleted')
  if (fields.length === 0) return '—'
  return fields.map((field) => `${field}: ${changes[field]?.from ?? '—'} → ${changes[field]?.to ?? '—'}`).join(', ')
}

// Shared by Administration and Audit's "Activity Logs" items (per the
// requested nav tree, the same underlying log feed is listed in both).
export default function ActivityLogViewer({ entityType }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const limit = 20

  async function getLogs() {
    try {
      setLoading(true)
      let query = `offset=${offset}&limit=${limit}`
      if (entityType) query += `&entityType=${entityType}`
      const res = await authAxios.get(`/admin/activity-logs?${query}`)
      setLogs(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
    } catch (error) {
      console.log(error)
      ErrorToast('Could not load activity logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { getLogs() }, [offset, entityType])

  return (
    <div className='py-4'>
      <div className='flex justify-end px-2 mb-2'>
        <Pagination count={count} offset={offset} setOffset={setOffset} />
      </div>
      <div className='overflow-hidden rounded-md border border-gray-100 shadow-xs shadow-gray-200 bg-white'>
        {loading && <p className='px-6 py-4 text-sm text-[#757575]'>Loading…</p>}
        {!loading && logs.length === 0 && <p className='px-6 py-4 text-sm text-[#757575]'>No activity recorded yet.</p>}
        {logs.map((log) => (
          <div key={log.id} className='border-b border-gray-100 last:border-b-0 px-6 py-3'>
            <div className='flex items-center justify-between mb-1'>
              <div className='flex items-center gap-2'>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${ACTION_STYLE[log.action] || 'bg-gray-100 text-[#757575]'}`}>{log.action}</span>
                <span className='text-sm font-medium'>{log.entityType}</span>
                {log.entityId && <span className='text-xs text-[#757575]'>#{log.entityId}</span>}
              </div>
              <span className='text-xs text-[#757575]'>{getDateTimeFormat(log.createdAt)}</span>
            </div>
            <p className='text-xs text-[#454545]'>{log.adminName || 'Unknown admin'} — {summarizeChanges(log)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
