'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { workspaceApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'
import {
  Row, Card, Pill, BackLink, errMsg, fmtDateTime, personName,
} from '@cocarr/datagrid'

// ONE ACCESS REQUEST — and, crucially, whether the access was actually granted.
//
// THE DECISION AND THE GRANT ARE TWO DIFFERENT FACTS. The API records the human
// decision whatever happens next; if the IAM write then fails, the request is
// `approved` with `iamApplied: false` and NOBODY GOT ACCESS. A screen showing
// only the status would read that as done — the exact misreading the backend
// splits the two fields to prevent. So `iamApplied` is given equal weight here,
// and an approved-but-unapplied request offers the retry rather than hiding it.

export default function AccessRequestDetail() {
  const { id } = useParams()
  const [row, setRow] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const canUpdate = useCan('workspace.accessRequests.update')

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/access-requests/${id}`)
      const data = res.data?.data || res.data
      setRow(data)
      setError(null)
      if (data?.employeeId) {
        workspaceApi().get(`/employees/${data.employeeId}`)
          .then((r) => setEmployee(r.data?.data || r.data))
          .catch(() => setEmployee('unavailable'))
      }
    } catch (e) { setError(errMsg(e, 'Could not load this request')) }
  }, [id])

  useEffect(() => { load() }, [load])

  const decide = async (status) => {
    if (status === 'rejected' && !note.trim()
      && !window.confirm('Reject with no note? The requester will not be told why.')) return
    setBusy(true)
    try {
      const res = await workspaceApi().post(`/access-requests/${id}/decide`, { status, note: note.trim() || undefined })
      const body = res.data?.data || res.data
      // Report what actually happened, not what was asked for. An approval
      // whose grant failed is not a success and must not be announced as one.
      if (status === 'approved' && body?.iamApplied === false) {
        ErrorToast(`Decision recorded, but access was NOT granted: ${body.iamError || 'IAM did not apply it'}`)
      } else {
        InfoToast(status === 'approved' ? 'Approved and access granted' : 'Rejected')
      }
      setNote('')
      await load()
    } catch (e) { ErrorToast(errMsg(e, 'Could not record the decision')) } finally { setBusy(false) }
  }

  const retryApply = async () => {
    setBusy(true)
    try {
      await workspaceApi().post(`/access-requests/${id}/apply`)
      InfoToast('Access granted')
      await load()
    } catch (e) { ErrorToast(errMsg(e, 'Could not grant the access')) } finally { setBusy(false) }
  }

  if (error) {
    return (
      <div className='max-w-3xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>{error}</p>
        <BackLink href='/dashboard/workspace/access-requests'>Access requests</BackLink>
      </div>
    )
  }
  if (!row) return <div className='p-8 text-sm text-[#757575]'>Loading…</div>

  const target = row.target || {}
  const tone = { approved: 'good', rejected: 'bad', pending: 'warn' }[row.status] || 'neutral'
  const approvedNotApplied = row.status === 'approved' && !row.iamApplied

  return (
    <div className='max-w-3xl mx-auto pb-10'>
      <BackLink href='/dashboard/workspace/access-requests'>Access requests</BackLink>
      <Header
        title={target.roleKey || target.module || 'Access request'}
        parent={employee && employee !== 'unavailable' ? personName(employee) : 'Access request'}
      />

      <div className='mt-1'>
        <Card title='Status'>
          <div className='flex items-center gap-3 flex-wrap'>
            <Pill tone={tone}>{row.status}</Pill>
            {row.status === 'approved' && (
              <Pill tone={row.iamApplied ? 'good' : 'bad'}>
                {row.iamApplied ? 'access granted' : 'access NOT granted'}
              </Pill>
            )}
          </div>

          {approvedNotApplied && (
            <div className='mt-3 text-[11px] text-red-800 bg-red-50 border border-red-200 rounded px-3 py-2'>
              <p className='font-semibold mb-1'>This was approved, but nobody actually got access.</p>
              <p>
                The decision is recorded; the IAM grant did not go through. Common causes: the
                employee has no staff login yet, so there is no principal to grant to, or the
                request names no role. Fix the cause, then retry — the decision stands and does
                not need making again.
              </p>
              {canUpdate && (
                <button type='button' disabled={busy} onClick={retryApply} className='btn-md mt-2'>
                  Retry granting access
                </button>
              )}
            </div>
          )}

          <div className='mt-3'>
            <Row label='Requested'>{fmtDateTime(row.createdAt)}</Row>
            {row.decidedAt && <Row label='Decided'>{fmtDateTime(row.decidedAt)}</Row>}
            {row.decisionNote && <Row label='Decision note'>{row.decisionNote}</Row>}
          </div>
        </Card>

        <Card title='Requested for'>
          <Row label='Employee'>
            {employee && employee !== 'unavailable'
              ? (
                <Link href={`/dashboard/workspace/employees/${row.employeeId}`} className='hover:underline'>
                  {personName(employee)}
                </Link>
              )
              : employee === 'unavailable'
                ? <span className='text-amber-700'>Could not load the employee</span>
                : 'Loading…'}
          </Row>
          {employee && employee !== 'unavailable' && (
            <Row label='Staff login'>
              {employee.firebaseUid
                ? <span className='text-green-700'>Created</span>
                : <span className='text-amber-700'>Not created yet — access cannot be granted until it is</span>}
            </Row>
          )}
        </Card>

        <Card title='What was asked for'>
          <Row label='Role'>{target.roleKey || target.roleId}</Row>
          <Row label='Product'>{target.product}</Row>
          <Row label='Portal'>{target.portal}</Row>
          <Row label='Module'>{target.module}</Row>
          <Row label='Permission'>{target.permission}</Row>
          {!target.roleKey && !target.roleId && (
            <p className='text-[11px] text-amber-700 mt-2'>
              This request names no role. Access is granted by assigning a role, so it cannot be
              applied as it stands.
            </p>
          )}
          {row.reason && (
            <div className='mt-3 pt-3 border-t border-gray-50'>
              <p className='text-[11px] text-[#959595] mb-1'>Reason given</p>
              <p className='text-sm text-[#252525] whitespace-pre-wrap'>{row.reason}</p>
            </div>
          )}
        </Card>

        {canUpdate && row.status === 'pending' && (
          <Card title='Decision'>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder='Note (optional for approval, worth giving for a rejection)'
              rows={3}
              className='w-full text-sm border border-gray-200 rounded-md px-3 py-2 text-[#151515]'
            />
            <div className='flex gap-3 mt-3'>
              <button type='button' disabled={busy} onClick={() => decide('approved')} className='btn-md'>
                Approve &amp; grant
              </button>
              <button
                type='button' disabled={busy} onClick={() => decide('rejected')}
                className='text-xs font-semibold text-red-600 hover:underline disabled:opacity-40'
              >
                Reject
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
