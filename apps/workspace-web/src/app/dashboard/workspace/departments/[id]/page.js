'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { workspaceApi } from '@cocarr/api-sdk'
import { Header } from '@cocarr/ui'
import {
  Row, Card, Pill, BackLink, RelatedList, useLookup, errMsg, personName,
} from '@cocarr/datagrid'

// ONE DEPARTMENT, and what hangs off it.
//
// The edit dialog already holds every column on the row, so this page is not
// here to show them again — it is here for the three things the row does not
// contain: the teams inside it, the people in it, and where it sits in the
// hierarchy. Deleting a department with forty people in it is a different
// decision from deleting an empty one, and only this page makes that visible.

export default function DepartmentDetail() {
  const { id } = useParams()
  const [row, setRow] = useState(null)
  const [error, setError] = useState(null)
  const [teams, setTeams] = useState(null)
  const [people, setPeople] = useState(null)
  const [children, setChildren] = useState(null)
  const deptName = useLookup('workspace', '/departments', 'name')

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/departments/${id}`)
      setRow(res.data?.data || res.data)
      setError(null)
    } catch (e) { setError(errMsg(e, 'Could not load this department')) }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const rows = (r) => (r.status === 'fulfilled' ? (r.value.data?.data || r.value.data || []) : 'unavailable')
      const [t, p, d] = await Promise.allSettled([
        workspaceApi().get('/teams?limit=500'),
        // The employees endpoint filters by department server-side, so this is
        // the real membership rather than a page of everyone filtered locally.
        workspaceApi().get(`/employees?departmentId=${encodeURIComponent(id)}&limit=500`),
        workspaceApi().get('/departments?limit=500'),
      ])
      const allTeams = rows(t)
      setTeams(allTeams === 'unavailable' ? 'unavailable' : allTeams.filter((x) => x.departmentId === id))
      setPeople(rows(p))
      const allDepts = rows(d)
      setChildren(allDepts === 'unavailable' ? 'unavailable' : allDepts.filter((x) => x.parentDepartmentId === id))
    })()
  }, [id])

  if (error) {
    return (
      <div className='max-w-4xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>{error}</p>
        <BackLink href='/dashboard/workspace/departments'>Departments</BackLink>
      </div>
    )
  }
  if (!row) return <div className='p-8 text-sm text-[#757575]'>Loading…</div>

  const head = Array.isArray(people) ? people.find((p) => p.id === row.headEmployeeId) : null

  return (
    <div className='max-w-4xl mx-auto pb-10'>
      <BackLink href='/dashboard/workspace/departments'>Departments</BackLink>
      <Header title={row.name} parent={row.code || 'Department'} />

      <div className='mt-1'>
        <Card title='Details'>
          <div className='flex items-start justify-between gap-4 flex-wrap'>
            <div className='min-w-0'>
              <Row label='Code'>{row.code}</Row>
              <Row label='Reports into'>
                {row.parentDepartmentId
                  ? (
                    <Link href={`/dashboard/workspace/departments/${row.parentDepartmentId}`} className='hover:underline'>
                      {deptName(row.parentDepartmentId) || 'Parent department'}
                    </Link>
                  )
                  : <span className='text-[#959595]'>Nothing — this is a top-level department</span>}
              </Row>
              <Row label='Head'>
                {row.headEmployeeId
                  ? (
                    <Link href={`/dashboard/workspace/employees/${row.headEmployeeId}`} className='hover:underline'>
                      {personName(head) || 'View employee'}
                    </Link>
                  )
                  : <span className='text-[#959595]'>No head assigned</span>}
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

        <Card title={`Sub-departments${Array.isArray(children) ? ` (${children.length})` : ''}`}>
          <RelatedList items={children} empty='No departments sit under this one.'>
            {(c) => (
              <Link key={c.id} href={`/dashboard/workspace/departments/${c.id}`} className='flex items-center gap-3 py-1.5 hover:underline'>
                <span className='text-sm'>{c.name}</span>
                <span className='text-[11px] text-[#959595]'>{c.code}</span>
              </Link>
            )}
          </RelatedList>
        </Card>

        <Card
          title={`Teams${Array.isArray(teams) ? ` (${teams.length})` : ''}`}
          action={<Link href='/dashboard/workspace/teams' className='text-[11px] font-semibold text-[#757575] hover:underline'>All teams →</Link>}
        >
          <RelatedList items={teams} empty='No teams in this department yet.'>
            {(t) => (
              <Link key={t.id} href={`/dashboard/workspace/teams/${t.id}`} className='flex items-center gap-3 py-1.5 hover:underline'>
                <span className='text-sm'>{t.name}</span>
                {!t.isActive && <span className='text-[11px] text-[#959595]'>inactive</span>}
              </Link>
            )}
          </RelatedList>
        </Card>

        <Card title={`People${Array.isArray(people) ? ` (${people.length})` : ''}`}>
          <RelatedList items={people} empty='Nobody is assigned to this department.'>
            {(p) => (
              <Link key={p.id} href={`/dashboard/workspace/employees/${p.id}`} className='flex items-center gap-3 py-1.5 hover:underline'>
                <span className='text-sm'>{personName(p)}</span>
                <span className='text-[11px] text-[#959595]'>{p.employeeCode || '—'}</span>
                <span className='ml-auto text-[11px] text-[#757575]'>{p.status}</span>
              </Link>
            )}
          </RelatedList>
        </Card>
      </div>
    </div>
  )
}
