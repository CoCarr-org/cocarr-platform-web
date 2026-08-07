'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { platformApi, workspaceApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'

// THE APPROVER'S INBOX — everything waiting on this person's signature.
//
// It asks IAM for `/approval-requests/mine`, which resolves who may sign the
// step each request is sitting on. There is no permission gate on this page and
// deliberately so: an approver's right to act is decided per STEP by the chain,
// not by holding a permission on a screen. Someone with nothing to sign sees an
// empty inbox, which is the correct answer rather than a refusal.
//
// APPROVING AN ONBOARDING REQUEST IS TWO CALLS, and the order is load-bearing:
//   1. IAM records the signature      POST /approval-requests/:id/decide
//   2. workspace-api does the deed    POST /onboarding/:id/approve
// Never the reverse. workspace-api REFUSES step 2 unless IAM already says
// approved, so a failure between them leaves a signed request and no employee —
// recoverable by retrying step 2 — rather than an employee nobody approved.

const errMsg = (e, fallback) => e?.response?.data?.error?.message || e?.response?.data?.error || fallback

const TYPE_LABEL = {
  'workspace.onboarding.approval': 'Employee onboarding',
  'workspace.accessRequest': 'Access request',
}

function ResetLinkPanel({ result, onDismiss }) {
  const [copied, setCopied] = useState(false)
  if (!result) return null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.resetLink)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch (_) { ErrorToast('Could not copy — select the link and copy it manually.') }
  }
  return (
    <div className='border-2 border-green-500 bg-green-50 rounded-md p-5 mb-5'>
      <p className='font-bold text-sm text-green-900'>
        Approved — employee code {result.employeeCode}
      </p>
      {result.resetLink ? (
        <>
          <p className='text-xs text-green-900 mt-2 leading-relaxed'>
            <strong>Copy this link now and give it to them.</strong> It is shown once and cannot be
            retrieved again — it is the only way they can set a password and sign in.
          </p>
          <div className='flex gap-2 mt-3'>
            <input readOnly value={result.resetLink} onFocus={(e) => e.target.select()}
              className='flex-1 text-[11px] font-mono border border-green-300 rounded px-3 py-2 bg-white' />
            <button type='button' onClick={copy} className='btn-md shrink-0'>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </>
      ) : (
        <p className='text-xs text-amber-800 mt-2 leading-relaxed'>
          No staff login was created — Firebase is not configured on the Workspace service. The
          employee is active but cannot sign in until a login is created for them.
        </p>
      )}
      <button type='button' onClick={onDismiss} className='text-xs text-green-800 underline mt-3'>
        Done — I have saved the link
      </button>
    </div>
  )
}

function Row({ request, onDone }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [approved, setApproved] = useState(null)
  const [warning, setWarning] = useState(null)

  const steps = [...(request.approvalChain?.steps || [])].sort((a, b) => a.stepOrder - b.stepOrder)
  const step = steps.find((s) => s.stepOrder === request.currentStepOrder)
  const isOnboarding = request.requestType === 'workspace.onboarding.approval'

  const decide = async (decision) => {
    setBusy(true); setWarning(null)
    try {
      const res = await platformApi().post(`/approval-requests/${request.id}/decide`, { decision, note: note || null })
      const outcome = res.data?.status

      if (decision === 'rejected') {
        InfoToast('Rejected'); await onDone(); return
      }
      if (outcome !== 'approved') {
        // A middle step cleared; someone else signs next.
        InfoToast('Approved — passed to the next approver'); await onDone(); return
      }

      // Final step cleared. For onboarding, IAM's approval is the permission to
      // act, not the act itself — workspace-api still has to mint the code and
      // the login, and it is the only thing that can hand back the reset link.
      if (isOnboarding) {
        try {
          const done = await workspaceApi().post(`/onboarding/${request.subjectId}/approve`, {})
          setApproved(done.data)
        } catch (e) {
          // The signature is recorded; only the side effect failed. Say exactly
          // that, because the fix is to retry the second call — not to approve
          // again, which IAM would now refuse.
          setWarning(
            `Your approval was recorded, but creating the employee failed: ${errMsg(e, 'unknown error')}. `
            + 'Open Onboarding and use Approve there to finish — you do not need to approve again.',
          )
        }
      } else {
        InfoToast('Approved')
      }
      await onDone()
    } catch (e) {
      ErrorToast(errMsg(e, 'Could not record your decision'))
    } finally { setBusy(false) }
  }

  return (
    <div className='bg-white border border-gray-100 rounded-md px-5 py-4 mb-3'>
      <ResetLinkPanel result={approved} onDismiss={() => setApproved(null)} />

      {warning && (
        <div className='border-2 border-amber-400 bg-amber-50 text-amber-900 text-xs rounded-md px-4 py-3 mb-3 leading-relaxed'>
          {warning}
        </div>
      )}

      <div className='flex items-start justify-between gap-3 flex-wrap'>
        <div className='min-w-0'>
          <p className='font-semibold text-sm'>{request.summary || request.subjectId}</p>
          <p className='text-[11px] text-[#959595] mt-0.5'>
            {TYPE_LABEL[request.requestType] || request.requestType}
            {step ? ` · awaiting "${step.name}"` : ''}
            {steps.length > 1 ? ` · step ${request.currentStepOrder} of ${steps.length}` : ''}
          </p>
          {request.metadata?.email && (
            <p className='text-[11px] text-[#959595]'>{request.metadata.email}</p>
          )}
        </div>
        <span className='shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'>
          pending
        </span>
      </div>

      {request.decisions?.length > 0 && (
        <div className='mt-3 pt-3 border-t border-gray-50'>
          {request.decisions.map((d) => (
            <p key={d.id} className='text-[11px] text-[#757575]'>
              {d.stepName || `Step ${d.stepOrder}`}: <strong>{d.decision}</strong>
              {d.note ? ` — ${d.note}` : ''}
            </p>
          ))}
        </div>
      )}

      <div className='mt-3 pt-3 border-t border-gray-50 flex flex-wrap items-end gap-2'>
        <label className='block flex-1 min-w-[12rem]'>
          <span className='block text-[11px] text-[#757575] mb-1'>Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)}
            placeholder='Why you are approving or rejecting'
            className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full outline-none focus:border-gray-400' />
        </label>
        <button type='button' disabled={busy} onClick={() => decide('approved')} className='btn-md shrink-0'>
          {busy ? 'Working…' : 'Approve'}
        </button>
        <button type='button' disabled={busy} onClick={() => decide('rejected')}
          className='shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-40 pb-2'>
          Reject
        </button>
      </div>
      {isOnboarding && (
        <p className='text-[11px] text-[#959595] mt-2'>
          Approving the final step issues this employee&apos;s code and staff login, and shows their
          password-reset link once.
        </p>
      )}
    </div>
  )
}

export default function WorkspaceApprovals() {
  const [rows, setRows] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await platformApi().get('/approval-requests/mine')
      setRows(res.data?.data || [])
    } catch (e) { ErrorToast(errMsg(e, 'Could not load your approvals')); setRows([]) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className='max-w-4xl mx-auto pb-10'>
      <Header title='Approvals' RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3 mb-5'>
        Everything waiting on your signature. What appears here is decided by the approval chain each
        request is walking — you see a request only while it sits on a step you may sign.
      </p>

      {rows === null && <p className='text-sm text-[#757575] px-1'>Loading…</p>}

      {rows && rows.length === 0 && (
        <p className='text-sm text-[#757575] bg-white border border-gray-100 rounded-md px-5 py-6'>
          Nothing is waiting on you.
        </p>
      )}

      {rows && rows.map((r) => <Row key={r.id} request={r} onDone={load} />)}
    </div>
  )
}
