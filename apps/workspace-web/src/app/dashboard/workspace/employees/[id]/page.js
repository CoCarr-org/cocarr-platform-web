'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { workspaceApi, platformApi, identityApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'
import {
  Row, Card, BackLink, errMsg, fmtDate, personName,
} from '@cocarr/datagrid'

// ONE EMPLOYEE, and everything the platform knows about them.
//
// The list answers "who works here"; this answers "who is this person" — which
// is the question somebody actually arrives with, and it spans three services:
// Workspace owns the record and their documents, IAM owns what they may do, and
// the onboarding lifecycle sits across both. Making somebody assemble that from
// three screens is how the wrong person gets approved.
//
// WHAT MAY BE DONE HERE COMES FROM THE SERVER. The API returns an `actions`
// object per employee, so the buttons are what it will accept — the platform
// owner's record refuses edits and this page shows why rather than offering a
// button that 409s. The client re-derives nothing.
//
// Each panel loads independently and fails independently. A missing role
// lookup must not blank out the profile somebody came here to read.
//
// THE PRINCIPAL IS NOT THE FIREBASE UID. IAM keys role assignments on the
// Identity Service's own uuid; `employee.firebaseUid` is the authentication
// detail underneath it, and the two are different strings. Querying assignments
// by the Firebase uid returns an empty list for somebody who genuinely holds
// roles — a wrong answer that looks exactly like a right one, which is the
// worst kind. So the uid is resolved to an identity id first, and when that
// resolution fails the panel says it could not check rather than reporting
// "no roles".

const STAGE_LABEL = {
  profile: 'Profile', documents: 'Documents', review: 'Review', approved: 'Approved',
}
const STATUS_PILL = {
  active: 'bg-green-100 text-green-700',
  onboarding: 'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-700',
  terminated: 'bg-gray-200 text-gray-600',
}
const DOC_PILL = {
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}

const fullName = (e) => personName(e) || '—'

export default function EmployeeDetail() {
  const { id } = useParams()

  const [emp, setEmp] = useState(null)
  const [error, setError] = useState(null)
  const [reports, setReports] = useState(null)
  const [docs, setDocs] = useState(null)
  const [onboarding, setOnboarding] = useState(null)
  // null = still loading, 'unavailable' = the lookup failed and we do not know.
  const [roles, setRoles] = useState(null)
  const [busy, setBusy] = useState(false)

  const canUpdate = useCan('workspace.employees.update')

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/employees/${id}`)
      setEmp(res.data)
      setError(null)
    } catch (e) { setError(errMsg(e, 'Could not load this employee')) }
  }, [id])

  useEffect(() => { load() }, [load])

  // Promise.allSettled, not Promise.all: one failing lookup must not take the
  // whole page with it. A person's profile is still worth reading when IAM is
  // briefly unreachable.
  useEffect(() => {
    if (!emp?.id) return
    ;(async () => {
      const [r, d, o] = await Promise.allSettled([
        workspaceApi().get(`/employees/${emp.id}/reports`),
        workspaceApi().get(`/employees/${emp.id}/documents`),
        workspaceApi().get(`/onboarding/${emp.id}`),
      ])
      setReports(r.status === 'fulfilled' ? (r.value.data?.data || r.value.data || []) : [])
      setDocs(d.status === 'fulfilled' ? (d.value.data?.data || d.value.data || []) : [])
      setOnboarding(o.status === 'fulfilled' ? o.value.data : null)

      // No staff login means there is no principal at all — a real, knowable
      // "none", not a failed lookup.
      if (!emp.firebaseUid) { setRoles([]); return }
      try {
        // The identity row may legitimately not exist yet: it is created when
        // the person first signs in. That is a 404, and it means no roles can
        // have been granted — so it answers "none", not "unavailable".
        let principal = null
        try {
          const idres = await identityApi().get(`/identity/${encodeURIComponent(emp.firebaseUid)}`)
          principal = idres.data?.id || null
        } catch (e) {
          if (e?.response?.status === 404) { setRoles([]); return }
          throw e
        }
        if (!principal) { setRoles([]); return }
        const res = await platformApi()
          .get(`/assignments/principal/${encodeURIComponent(principal)}?activeOnly=true`)
        setRoles(res.data?.data || res.data || [])
      } catch {
        setRoles('unavailable')
      }
    })()
  }, [emp?.id, emp?.firebaseUid])

  const setStatus = async (status) => {
    setBusy(true)
    try {
      await workspaceApi().post(`/employees/${emp.id}/status`, { status })
      InfoToast(`Marked ${status}`)
      await load()
    } catch (e) { ErrorToast(errMsg(e, 'Could not change the status')) } finally { setBusy(false) }
  }

  if (error) {
    return (
      <div className='max-w-4xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>{error}</p>
        <Link href='/dashboard/workspace/employees' className='text-xs underline mt-3 inline-block'>
          Back to employees
        </Link>
      </div>
    )
  }
  if (!emp) return <div className='p-8 text-sm text-[#757575]'>Loading…</div>

  // The server's answer, not a rule re-derived here.
  const actions = emp.actions || {}
  const protectedReason = actions.restrictedReason

  return (
    <div className='max-w-4xl mx-auto pb-10'>
      <BackLink href='/dashboard/workspace/employees'>Employees</BackLink>
      <Header title={fullName(emp)} parent={emp.designation?.title || 'Employee'} />

      <div className='mt-1'>
        <Card title='Identity'>
          <div className='flex items-start justify-between gap-4 flex-wrap'>
            <div className='min-w-0'>
              <Row label='Employee code'>
                {emp.employeeCode || <span className='text-[#959595]'>Issued at onboarding approval</span>}
              </Row>
              <Row label='Email'>{emp.email}</Row>
              <Row label='Phone'>{emp.phone}</Row>
              <Row label='Date of joining'>{fmtDate(emp.dateOfJoining)}</Row>
              <Row label='Staff login'>
                {emp.firebaseUid
                  ? <span className='text-green-700'>Created</span>
                  : <span className='text-amber-700'>Not created yet</span>}
              </Row>
            </div>
            <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[emp.status] || 'bg-gray-100 text-gray-600'}`}>
              {emp.status}
            </span>
          </div>

          {protectedReason && (
            <p className='text-[11px] text-purple-800 bg-purple-50 border border-purple-200 rounded px-3 py-2 mt-3'>
              {protectedReason} Their access cannot be edited or withdrawn here.
            </p>
          )}

          {canUpdate && actions.canSetStatus && emp.status !== 'onboarding' && (
            <div className='flex gap-2 mt-4 pt-4 border-t border-gray-50'>
              {emp.status !== 'active' && (
                <button type='button' disabled={busy} onClick={() => setStatus('active')} className='btn-md'>
                  Reactivate
                </button>
              )}
              {emp.status === 'active' && (
                <button type='button' disabled={busy} onClick={() => setStatus('suspended')}
                  className='text-xs font-semibold text-red-600 hover:underline disabled:opacity-40'>
                  Suspend
                </button>
              )}
            </div>
          )}
        </Card>

        <Card title='Position'>
          <Row label='Department'>{emp.department?.name}</Row>
          <Row label='Designation'>{emp.designation?.title}</Row>
          <Row label='Team'>{emp.team?.name}</Row>
          <Row label='Reports to'>
            {emp.manager
              ? (
                <Link href={`/dashboard/workspace/employees/${emp.manager.id}`} className='hover:underline'>
                  {fullName(emp.manager)}
                </Link>
              )
              : <span className='text-[#959595]'>Nobody — top of their line</span>}
          </Row>
        </Card>

        {emp.status === 'onboarding' && (
          <Card
            title='Onboarding'
            action={(
              <Link href='/dashboard/workspace/onboarding' className='text-[11px] font-semibold text-[#757575] hover:underline'>
                Open onboarding →
              </Link>
            )}
          >
            <Row label='Stage'>{STAGE_LABEL[emp.onboardingStage] || emp.onboardingStage}</Row>
            <Row label='Approval'>
              {onboarding?.approval?.status === 'approved' ? 'Approved — ready to issue code and login'
                : onboarding?.approval?.status === 'pending' ? 'Waiting for an approver'
                  : onboarding?.approval?.status === 'rejected' ? 'Rejected — fix and resubmit'
                    : onboarding?.approval?.status === 'unknown' ? 'Could not reach IAM to check'
                      : 'Not submitted yet'}
            </Row>
          </Card>
        )}

        <Card title={`Access${Array.isArray(roles) ? ` (${roles.length})` : ''}`}>
          {roles === null && <p className='text-xs text-[#959595]'>Loading…</p>}
          {roles === 'unavailable' && (
            <p className='text-xs text-amber-700'>
              Could not reach IAM, so their roles are unknown — this is not the same as having none.
            </p>
          )}
          {Array.isArray(roles) && roles.length === 0 && (
            <p className='text-xs text-[#757575]'>
              {emp.firebaseUid
                ? 'No roles assigned — they can sign in but will see an empty sidebar.'
                : 'No staff login yet, so there is no principal to grant access to.'}
            </p>
          )}
          {Array.isArray(roles) && roles.map((a) => (
            <div key={a.id} className='flex items-center gap-3 py-1.5'>
              <span className='text-sm'>{a.role?.name || a.roleId}</span>
              {a.role?.isSuperAdmin && (
                <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700'>
                  super admin
                </span>
              )}
              {a.expiresAt && (
                <span className='text-[11px] text-amber-700'>expires {fmtDate(a.expiresAt)}</span>
              )}
            </div>
          ))}
          <p className='text-[11px] text-[#959595] mt-2'>
            Roles are granted in Platform Administration → Roles &amp; Access.
          </p>
        </Card>

        <Card title={`Documents${docs ? ` (${docs.length})` : ''}`}>
          {docs === null && <p className='text-xs text-[#959595]'>Loading…</p>}
          {docs?.length === 0 && <p className='text-xs text-[#757575]'>No documents on file.</p>}
          {docs?.map((d) => (
            <div key={d.id} className='flex items-center gap-3 py-1.5'>
              <span className='text-sm truncate'>{d.fileName || '(unnamed)'}</span>
              <span className='text-[11px] text-[#959595]'>{d.type}</span>
              <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_PILL[d.status] || DOC_PILL.pending}`}>
                {d.status}
              </span>
            </div>
          ))}
        </Card>

        <Card title={`Direct reports${reports ? ` (${reports.length})` : ''}`}>
          {reports === null && <p className='text-xs text-[#959595]'>Loading…</p>}
          {reports?.length === 0 && <p className='text-xs text-[#757575]'>Nobody reports to them.</p>}
          {reports?.map((r) => (
            <Link key={r.id} href={`/dashboard/workspace/employees/${r.id}`}
              className='flex items-center gap-3 py-1.5 hover:underline'>
              <span className='text-sm'>{fullName(r)}</span>
              <span className='text-[11px] text-[#959595]'>{r.employeeCode || '—'}</span>
              <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[r.status] || ''}`}>
                {r.status}
              </span>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  )
}
