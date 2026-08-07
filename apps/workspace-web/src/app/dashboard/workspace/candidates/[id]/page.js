'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { workspaceApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'
import {
  Row, Card, Pill, BackLink, useLookup, errMsg, fmtDate, personName,
} from '@cocarr/datagrid'

// ONE CANDIDATE, and where they are in the pipeline.
//
// The list can show a stage; it cannot move somebody through one, and it
// cannot show that moving to `hired` is not a stage change at all — it creates
// an employee record. That asymmetry is the reason this page exists.

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected']
// The ordered pipeline. `rejected` is deliberately not on it: it is an exit
// from the pipeline, not a step along it, and drawing it as the far end would
// suggest every candidate is travelling towards it.
const PIPELINE = ['applied', 'screening', 'interview', 'offer', 'hired']

export default function CandidateDetail() {
  const { id } = useParams()
  const [row, setRow] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const canUpdate = useCan('workspace.recruitment.update')
  const deptName = useLookup('workspace', '/departments', 'name')
  const desigName = useLookup('workspace', '/designations', 'title')

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/candidates/${id}`)
      setRow(res.data?.data || res.data)
      setError(null)
    } catch (e) { setError(errMsg(e, 'Could not load this candidate')) }
  }, [id])

  useEffect(() => { load() }, [load])

  const advance = async (stage) => {
    setBusy(true)
    try {
      await workspaceApi().post(`/candidates/${id}/advance`, { stage })
      InfoToast(`Moved to ${stage}`)
      await load()
    } catch (e) { ErrorToast(errMsg(e, 'Could not change the stage')) } finally { setBusy(false) }
  }

  // Hiring is not a stage change with a different label — it creates an
  // employee in onboarding and links the two records, and it cannot be undone
  // from here. So it is confirmed, and named for what it does.
  const hire = async () => {
    if (!window.confirm(
      'This creates an employee record in onboarding, seeded from this candidate, '
      + 'and marks the candidate hired. It cannot be undone here. Continue?',
    )) return
    setBusy(true)
    try {
      const res = await workspaceApi().post(`/candidates/${id}/hire`)
      const emp = res.data?.data || res.data
      InfoToast('Employee created — onboarding started')
      await load()
      if (emp?.id) window.location.href = `/dashboard/workspace/employees/${emp.id}`
    } catch (e) { ErrorToast(errMsg(e, 'Could not hire this candidate')) } finally { setBusy(false) }
  }

  if (error) {
    return (
      <div className='max-w-4xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>{error}</p>
        <BackLink href='/dashboard/workspace/candidates'>Candidates</BackLink>
      </div>
    )
  }
  if (!row) return <div className='p-8 text-sm text-[#757575]'>Loading…</div>

  const atIndex = PIPELINE.indexOf(row.stage)
  const isClosed = row.stage === 'hired' || row.stage === 'rejected'

  return (
    <div className='max-w-4xl mx-auto pb-10'>
      <BackLink href='/dashboard/workspace/candidates'>Candidates</BackLink>
      <Header title={personName(row) || 'Candidate'} parent={row.positionTitle || 'Candidate'} />

      <div className='mt-1'>
        <Card title='Pipeline'>
          <div className='flex items-center gap-1 flex-wrap mb-4'>
            {PIPELINE.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span className='text-[#d5d5d5] text-xs'>›</span>}
                <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${
                  row.stage === s ? 'bg-[#252525] text-white'
                    : atIndex > i ? 'bg-gray-100 text-[#757575]' : 'text-[#c5c5c5]'
                }`}
                >
                  {s}
                </span>
              </React.Fragment>
            ))}
            {row.stage === 'rejected' && <span className='ml-2'><Pill tone='bad'>rejected</Pill></span>}
          </div>

          {canUpdate && !isClosed && (
            <div className='flex gap-2 flex-wrap pt-3 border-t border-gray-50'>
              {STAGES.filter((s) => s !== row.stage && s !== 'hired').map((s) => (
                <button
                  key={s} type='button' disabled={busy} onClick={() => advance(s)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-40 ${
                    s === 'rejected' ? 'text-red-600 hover:bg-red-50' : 'hover:bg-[#f3f3f3]'
                  }`}
                >
                  {s === 'rejected' ? 'Reject' : `Move to ${s}`}
                </button>
              ))}
              <button type='button' disabled={busy} onClick={hire} className='btn-md ml-auto'>
                Hire → create employee
              </button>
            </div>
          )}

          {row.stage === 'hired' && (
            <p className='text-xs text-[#757575] pt-3 border-t border-gray-50'>
              Hired.{' '}
              {row.convertedEmployeeId
                ? (
                  <Link href={`/dashboard/workspace/employees/${row.convertedEmployeeId}`} className='font-semibold hover:underline'>
                    Open their employee record →
                  </Link>
                )
                : 'No employee record is linked, which should not happen — the hire may have half-completed.'}
            </p>
          )}
          {row.stage === 'rejected' && (
            <p className='text-xs text-[#757575] pt-3 border-t border-gray-50'>
              This candidate was rejected and is out of the pipeline.
            </p>
          )}
        </Card>

        <Card title='Contact'>
          <Row label='Email'>{row.email}</Row>
          <Row label='Phone'>{row.phone}</Row>
          <Row label='Source'>{row.source}</Row>
          <Row label='Applied'>{fmtDate(row.createdAt)}</Row>
        </Card>

        <Card title='Role applied for'>
          <Row label='Position'>{row.positionTitle}</Row>
          <Row label='Department'>{deptName(row.departmentId)}</Row>
          <Row label='Designation'>{desigName(row.designationId)}</Row>
        </Card>

        <Card title='Notes'>
          {row.notes
            ? <p className='text-sm text-[#252525] whitespace-pre-wrap'>{row.notes}</p>
            : <p className='text-xs text-[#757575]'>No notes recorded.</p>}
        </Card>
      </div>
    </div>
  )
}
