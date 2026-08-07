'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { workspaceApi } from '@cocarr/api-sdk'
import { Header } from '@cocarr/ui'
import {
  Row, Card, Pill, BackLink, RelatedList, useLookup, errMsg, personName,
} from '@cocarr/datagrid'

// ONE TEAM, and who is on it.
//
// Employees carry a `teamId`, so membership is real data — but no endpoint
// serves it directly, and the team row itself only names a lead. The roster is
// therefore assembled here from the employee list.

export default function TeamDetail() {
  const { id } = useParams()
  const [row, setRow] = useState(null)
  const [error, setError] = useState(null)
  const [members, setMembers] = useState(null)
  const deptName = useLookup('workspace', '/departments', 'name')

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/teams/${id}`)
      setRow(res.data?.data || res.data)
      setError(null)
    } catch (e) { setError(errMsg(e, 'Could not load this team')) }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!id) return
    // There is no ?teamId= filter on the employees endpoint, so this pulls a
    // page and narrows it here. That is honest only while the org is small
    // enough to fit — the limit is deliberately high, and if it is ever hit the
    // right fix is a server-side filter, not a bigger number.
    workspaceApi().get('/employees?limit=500')
      .then((res) => {
        const all = res.data?.data || res.data || []
        setMembers(all.filter((e) => e.teamId === id))
      })
      .catch(() => setMembers('unavailable'))
  }, [id])

  if (error) {
    return (
      <div className='max-w-4xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>{error}</p>
        <BackLink href='/dashboard/workspace/teams'>Teams</BackLink>
      </div>
    )
  }
  if (!row) return <div className='p-8 text-sm text-[#757575]'>Loading…</div>

  const lead = Array.isArray(members) ? members.find((m) => m.id === row.leadEmployeeId) : null

  return (
    <div className='max-w-4xl mx-auto pb-10'>
      <BackLink href='/dashboard/workspace/teams'>Teams</BackLink>
      <Header title={row.name} parent={deptName(row.departmentId) || 'Team'} />

      <div className='mt-1'>
        <Card title='Details'>
          <div className='flex items-start justify-between gap-4 flex-wrap'>
            <div className='min-w-0'>
              <Row label='Department'>
                {row.departmentId
                  ? (
                    <Link href={`/dashboard/workspace/departments/${row.departmentId}`} className='hover:underline'>
                      {deptName(row.departmentId) || 'View department'}
                    </Link>
                  )
                  : <span className='text-[#959595]'>Not attached to a department</span>}
              </Row>
              <Row label='Lead'>
                {row.leadEmployeeId
                  ? (
                    <Link href={`/dashboard/workspace/employees/${row.leadEmployeeId}`} className='hover:underline'>
                      {personName(lead) || 'View employee'}
                    </Link>
                  )
                  : <span className='text-[#959595]'>No lead assigned</span>}
              </Row>
            </div>
            <Pill tone={row.isActive ? 'good' : 'neutral'}>{row.isActive ? 'active' : 'inactive'}</Pill>
          </div>
          {row.description && (
            <p className='text-sm text-[#252525] mt-3 pt-3 border-t border-gray-50 whitespace-pre-wrap'>
              {row.description}
            </p>
          )}
        </Card>

        <Card title={`Members${Array.isArray(members) ? ` (${members.length})` : ''}`}>
          <RelatedList items={members} empty='Nobody is on this team yet.'>
            {(m) => (
              <Link key={m.id} href={`/dashboard/workspace/employees/${m.id}`} className='flex items-center gap-3 py-1.5 hover:underline'>
                <span className='text-sm'>{personName(m)}</span>
                <span className='text-[11px] text-[#959595]'>{m.employeeCode || '—'}</span>
                {m.id === row.leadEmployeeId && <Pill tone='info'>lead</Pill>}
                <span className='ml-auto text-[11px] text-[#757575]'>{m.status}</span>
              </Link>
            )}
          </RelatedList>
          <p className='text-[11px] text-[#959595] mt-2'>
            Membership is set on the employee record, not here.
          </p>
        </Card>
      </div>
    </div>
  )
}
