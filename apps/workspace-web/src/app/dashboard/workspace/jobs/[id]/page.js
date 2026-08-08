'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { workspaceApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'
import {
  Row, Card, Pill, BackLink, ResourceManager, useLookup, errMsg, fmtDate,
} from '@cocarr/datagrid'

// ONE JOB POSTING — its details, the approval controls, and every application
// that arrived for it. Applications are candidate rows filtered to this posting,
// so this is the per-job view of the pipeline; opening one goes to the full
// application detail.

const STATUS_TONE = { draft: 'neutral', pending_approval: 'warn', published: 'good', closed: 'bad' }
const STATUS_LABEL = { draft: 'Draft', pending_approval: 'Waiting for approval', published: 'Active', closed: 'Closed' }

export default function JobDetail() {
  const { id } = useParams()
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const canUpdate = useCan('workspace.recruitment.update')
  const canApprove = useCan('workspace.recruitment.approve')
  const deptName = useLookup('workspace', '/departments', 'name')

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/job-postings/${id}`)
      setJob(res.data?.data || res.data)
      setError(null)
    } catch (e) { setError(errMsg(e, 'Could not load this job')) }
  }, [id])
  useEffect(() => { load() }, [load])

  const run = (fn, ok) => async () => {
    setBusy(true)
    try { await fn(); if (ok) InfoToast(ok); await load() }
    catch (e) { ErrorToast(errMsg(e, 'Action failed')) } finally { setBusy(false) }
  }
  const submit = run(() => workspaceApi().post(`/job-postings/${id}/submit`), 'Submitted for approval')
  const approve = run(() => workspaceApi().post(`/job-postings/${id}/approve`), 'Approved — now live')
  const reject = () => {
    const note = window.prompt('Reason for sending back to draft:')
    if (note === null) return
    run(() => workspaceApi().post(`/job-postings/${id}/reject`, { note }), 'Sent back to draft')()
  }
  const close = run(() => workspaceApi().post(`/job-postings/${id}/status`, { status: 'closed' }), 'Closed')
  const reopen = run(() => workspaceApi().post(`/job-postings/${id}/status`, { status: 'draft' }), 'Reopened as draft')

  if (error) {
    return (
      <div className='max-w-4xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>{error}</p>
        <BackLink href='/dashboard/workspace/jobs'>Jobs</BackLink>
      </div>
    )
  }
  if (!job) return <div className='p-8 text-sm text-[#757575]'>Loading…</div>

  return (
    <div className='max-w-4xl mx-auto pb-12'>
      <BackLink href='/dashboard/workspace/jobs'>Jobs</BackLink>
      <Header title={job.title} parent={job.department || 'Job posting'} />

      <Card title='Status'>
        <div className='flex items-center gap-2 mb-3'>
          <Pill tone={STATUS_TONE[job.status] || 'neutral'}>{STATUS_LABEL[job.status] || job.status}</Pill>
          {typeof job.applicationCount === 'number' && (
            <span className='text-xs text-[#757575]'>{job.applicationCount} application(s)</span>
          )}
        </div>
        {job.approvalNote && job.status === 'draft' && (
          <p className='text-xs text-red-600 mb-3'>Returned for changes: {job.approvalNote}</p>
        )}
        <div className='flex gap-2 flex-wrap pt-3 border-t border-gray-50'>
          {job.status === 'draft' && canUpdate && <button type='button' disabled={busy} onClick={submit} className='btn-md'>Submit for approval</button>}
          {job.status === 'pending_approval' && canApprove && (
            <>
              <button type='button' disabled={busy} onClick={approve} className='btn-md'>Approve &amp; publish</button>
              <button type='button' disabled={busy} onClick={reject} className='text-xs font-semibold text-red-600 hover:underline px-3'>Reject</button>
            </>
          )}
          {job.status === 'pending_approval' && !canApprove && <span className='text-xs text-[#9a9a9a]'>Waiting for an approver.</span>}
          {job.status === 'published' && canUpdate && <button type='button' disabled={busy} onClick={close} className='text-xs font-semibold text-red-600 hover:underline px-3'>Close role</button>}
          {job.status === 'closed' && canUpdate && <button type='button' disabled={busy} onClick={reopen} className='btn-md'>Reopen (draft)</button>}
        </div>
      </Card>

      <Card title='Details'>
        <Row label='Department'>{job.department || deptName(job.departmentId)}</Row>
        <Row label='Location'>{job.location}</Row>
        <Row label='Type'>{job.employmentType}</Row>
        <Row label='Experience'>{job.experience}</Row>
        <Row label='Openings'>{job.openings}</Row>
        <Row label='Closes'>{job.closesAt ? fmtDate(job.closesAt) : '—'}</Row>
        <Row label='Public link'>/roles/{job.slug}</Row>
      </Card>

      {(job.summary || job.description || job.responsibilities || job.requirements) && (
        <Card title='Description'>
          {job.summary && <p className='text-sm font-medium text-[#252525] mb-2'>{job.summary}</p>}
          {job.description && <p className='text-sm text-[#555] whitespace-pre-wrap mb-3'>{job.description}</p>}
          {job.responsibilities && (
            <>
              <p className='text-xs font-semibold text-[#757575] mt-2'>Responsibilities</p>
              <p className='text-sm text-[#555] whitespace-pre-wrap'>{job.responsibilities}</p>
            </>
          )}
          {job.requirements && (
            <>
              <p className='text-xs font-semibold text-[#757575] mt-2'>Requirements</p>
              <p className='text-sm text-[#555] whitespace-pre-wrap'>{job.requirements}</p>
            </>
          )}
        </Card>
      )}

      <div className='mt-2'>
        <p className='px-1 text-sm font-semibold text-[#252525] mb-1'>Applications</p>
        <ResourceManager
          api='workspace'
          permission='workspace.recruitment'
          searchPlaceholder='Search applicants'
          endpoint='/candidates'
          extraQuery={`jobPostingId=${id}`}
          detailHref={(row) => `/dashboard/workspace/candidates/${row.id}`}
          columns={[
            { key: 'firstName', label: 'First' },
            { key: 'lastName', label: 'Last' },
            { key: 'email', label: 'Email' },
            { key: 'stage', label: 'Stage' },
            { key: 'createdAt', label: 'Applied' },
          ]}
          fields={[]}
          readOnly
        />
      </div>
    </div>
  )
}
