'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { workspaceApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'

// EMPLOYEE ONBOARDING — hire -> profile -> documents -> review -> approve.
//
// Deliberately not a ListScreen. Everything else in Workspace is CRUD over one
// table; this is a workflow with a server-enforced order, and its last step has
// a side effect that cannot be repeated: approval mints the EMP code, creates
// the Firebase staff login and returns a password-reset link EXACTLY ONCE.
// There is no re-fetch endpoint for that link, so the UI has to treat it as the
// most important thing on the screen rather than a toast that scrolls away.
//
// The stage order is owned by the API (onboardingService.ORDER) and re-checked
// on every call there. This mirrors it to draw the tracker and to disable a
// button the server would refuse — it never decides anything on its own.

const STAGES = ['profile', 'documents', 'review', 'approved']
const STAGE_LABEL = {
  profile: 'Profile',
  documents: 'Documents',
  review: 'Review',
  approved: 'Approved',
}
const STAGE_HELP = {
  profile: 'Capture the employee’s details — department, designation, team, reporting line.',
  documents: 'Collect and verify their paperwork. Nothing here blocks approval; it is a checklist for the reviewer.',
  review: 'Last look before approval. Approving is what issues their staff login.',
  approved: 'Onboarding complete. The employee is active.',
}

const DOC_TYPES = [
  { value: 'id_proof', label: 'ID proof' },
  { value: 'address_proof', label: 'Address proof' },
  { value: 'offer_letter', label: 'Offer letter' },
  { value: 'contract', label: 'Contract' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
]

const DOC_PILL = {
  verified: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}

const fullName = (e) => [e?.firstName, e?.lastName].filter(Boolean).join(' ') || e?.email || '—'
const errMsg = (e, fallback) => e?.response?.data?.error?.message || e?.response?.data?.error || fallback

function StageTracker({ stage }) {
  const at = STAGES.indexOf(stage)
  return (
    <div className='flex items-center gap-1 flex-wrap'>
      {STAGES.map((s, i) => {
        const done = i < at
        const here = i === at
        return (
          <React.Fragment key={s}>
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                here ? 'bg-gray-900 text-white'
                  : done ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {STAGE_LABEL[s]}
            </span>
            {i < STAGES.length - 1 && <span className='text-gray-300 text-xs'>›</span>}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// The reset link is the ONLY way a new employee can ever sign in — the backend
// returns it once and cannot regenerate it here. So it gets a panel that stays
// put, a copy button, and a warning, rather than a toast.
function ResetLinkPanel({ result, onDismiss }) {
  const [copied, setCopied] = useState(false)
  if (!result) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.resetLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) { ErrorToast('Could not copy — select the link and copy it manually.') }
  }

  return (
    <div className='border-2 border-green-500 bg-green-50 rounded-md p-5 mb-5'>
      <p className='font-bold text-sm text-green-900'>
        {fullName(result.employee)} is approved — employee code {result.employeeCode}
      </p>

      {result.resetLink ? (
        <>
          <p className='text-xs text-green-900 mt-2 leading-relaxed'>
            <strong>Copy this link now and give it to them.</strong> It is shown once and cannot be
            retrieved again from this screen — it is the only way they can set a password and sign in.
          </p>
          <div className='flex gap-2 mt-3'>
            <input
              readOnly
              value={result.resetLink}
              onFocus={(e) => e.target.select()}
              className='flex-1 text-[11px] font-mono border border-green-300 rounded px-3 py-2 bg-white'
            />
            <button type='button' onClick={copy} className='btn-md shrink-0'>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </>
      ) : (
        <p className='text-xs text-amber-800 mt-2 leading-relaxed'>
          No staff login was created — Firebase is not configured on the Workspace service, so there
          is no reset link. The employee is active but cannot sign in until a login is created for them.
        </p>
      )}

      <button type='button' onClick={onDismiss} className='text-xs text-green-800 underline mt-3'>
        Done — I have saved the link
      </button>
    </div>
  )
}

function Documents({ employeeId, canEdit }) {
  const [docs, setDocs] = useState(null)
  const [adding, setAdding] = useState({ type: 'id_proof', fileName: '', fileKey: '', note: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/employees/${employeeId}/documents`)
      setDocs(res.data?.data || res.data || [])
    } catch (e) { ErrorToast(errMsg(e, 'Could not load documents')) }
  }, [employeeId])

  useEffect(() => { setDocs(null); load() }, [load])

  const add = async () => {
    if (!adding.fileName.trim()) { ErrorToast('Give the document a name'); return }
    setBusy(true)
    try {
      await workspaceApi().post(`/employees/${employeeId}/documents`, adding)
      InfoToast('Document added')
      setAdding({ type: 'id_proof', fileName: '', fileKey: '', note: '' })
      await load()
    } catch (e) { ErrorToast(errMsg(e, 'Could not add the document')) } finally { setBusy(false) }
  }

  const setStatus = async (docId, status) => {
    setBusy(true)
    try {
      await workspaceApi().put(`/employees/${employeeId}/documents/${docId}/status`, { status })
      await load()
    } catch (e) { ErrorToast(errMsg(e, 'Could not update the document')) } finally { setBusy(false) }
  }

  return (
    <div className='mt-5'>
      <h4 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>Documents</h4>

      {docs === null && <p className='text-sm text-[#757575]'>Loading…</p>}
      {docs && docs.length === 0 && (
        <p className='text-sm text-[#757575] bg-white border border-gray-100 rounded-md px-4 py-3'>
          No documents yet.
        </p>
      )}

      {docs && docs.length > 0 && (
        <div className='bg-white border border-gray-100 rounded-md divide-y divide-gray-50'>
          {docs.map((d) => (
            <div key={d.id} className='px-4 py-3 flex items-center gap-3'>
              <div className='min-w-0'>
                <p className='text-sm font-semibold truncate'>{d.fileName || '(unnamed)'}</p>
                <p className='text-[11px] text-[#959595]'>
                  {DOC_TYPES.find((t) => t.value === d.type)?.label || d.type}
                  {d.note ? ` · ${d.note}` : ''}
                </p>
              </div>
              <span className={`ml-auto shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_PILL[d.status] || DOC_PILL.pending}`}>
                {d.status}
              </span>
              {canEdit && d.status !== 'verified' && (
                <button type='button' disabled={busy} onClick={() => setStatus(d.id, 'verified')}
                  className='shrink-0 text-xs font-semibold text-green-700 hover:underline disabled:opacity-40'>Verify</button>
              )}
              {canEdit && d.status !== 'rejected' && (
                <button type='button' disabled={busy} onClick={() => setStatus(d.id, 'rejected')}
                  className='shrink-0 text-xs font-semibold text-red-600 hover:underline disabled:opacity-40'>Reject</button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className='bg-white border border-gray-100 rounded-md px-4 py-4 mt-3'>
          <div className='flex flex-wrap items-end gap-2'>
            <label className='block'>
              <span className='block text-[11px] text-[#757575] mb-1'>Type</span>
              <select value={adding.type} onChange={(e) => setAdding({ ...adding, type: e.target.value })}
                className='border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400'>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className='block flex-1 min-w-[10rem]'>
              <span className='block text-[11px] text-[#757575] mb-1'>Name</span>
              <input value={adding.fileName} onChange={(e) => setAdding({ ...adding, fileName: e.target.value })}
                placeholder='passport.pdf'
                className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full outline-none focus:border-gray-400' />
            </label>
            <label className='block flex-1 min-w-[10rem]'>
              <span className='block text-[11px] text-[#757575] mb-1'>File key (optional)</span>
              <input value={adding.fileKey} onChange={(e) => setAdding({ ...adding, fileKey: e.target.value })}
                placeholder='storage key'
                className='border border-gray-200 rounded-md px-3 py-2 text-sm w-full outline-none focus:border-gray-400' />
            </label>
            <button type='button' onClick={add} disabled={busy} className='btn-md shrink-0'>Add</button>
          </div>
          <p className='text-[11px] text-[#959595] mt-2'>
            There is no file upload yet — the API stores a <code className='text-[11px]'>fileKey</code> the
            client supplies, so record the reference here until object storage is wired up.
          </p>
        </div>
      )}
    </div>
  )
}

function Detail({ employee, onChanged }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [approved, setApproved] = useState(null)
  const [dateOfJoining, setDateOfJoining] = useState('')

  const canEdit = useCan('workspace.employees.update')

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi().get(`/onboarding/${employee.id}`)
      setState(res.data)
    } catch (e) { ErrorToast(errMsg(e, 'Could not load onboarding state')) }
  }, [employee.id])

  useEffect(() => { setState(null); setApproved(null); load() }, [load])

  const advance = async () => {
    setBusy(true)
    try {
      const res = await workspaceApi().post(`/onboarding/${employee.id}/advance`, {})
      setState(res.data)
      InfoToast(`Moved to ${STAGE_LABEL[res.data.onboardingStage] || res.data.onboardingStage}`)
      onChanged?.()
    } catch (e) { ErrorToast(errMsg(e, 'Could not advance onboarding')) } finally { setBusy(false) }
  }

  // Hand it to the approval chain. From here HR cannot approve it themselves —
  // whoever the chain names signs it in Approvals, and only then does the
  // employee code and staff login get issued.
  const submit = async () => {
    setBusy(true)
    try {
      await workspaceApi().post(`/onboarding/${employee.id}/submit`, {})
      InfoToast('Submitted for approval')
      await load()
      onChanged?.()
    } catch (e) { ErrorToast(errMsg(e, 'Could not submit for approval')) } finally { setBusy(false) }
  }

  const approve = async () => {
    setBusy(true)
    try {
      const res = await workspaceApi().post(`/onboarding/${employee.id}/approve`,
        dateOfJoining ? { dateOfJoining } : {})
      setApproved(res.data)
      await load()
      onChanged?.()
    } catch (e) {
      // A Firebase failure here is a 502 and is NOT swallowed by the API — the
      // most common cause is the email already existing as a Firebase user.
      ErrorToast(errMsg(e, 'Could not approve'))
    } finally { setBusy(false) }
  }

  if (!state) return <p className='text-sm text-[#757575] px-1 py-4'>Loading…</p>

  const stage = state.onboardingStage
  const atReview = stage === 'review'
  const done = stage === 'approved'

  return (
    <div>
      <ResetLinkPanel result={approved} onDismiss={() => setApproved(null)} />

      <div className='bg-white border border-gray-100 rounded-md px-5 py-4'>
        <div className='flex items-start justify-between gap-3 flex-wrap'>
          <div>
            <p className='font-bold'>{fullName(employee)}</p>
            <p className='text-xs text-[#757575]'>{employee.email}</p>
            <p className='text-[11px] text-[#959595] mt-0.5'>
              {state.employeeCode
                ? <>Employee code <strong>{state.employeeCode}</strong></>
                : 'No employee code yet — issued at approval.'}
              {' · '}
              {state.firebaseLinked ? 'Staff login created' : 'No staff login yet'}
            </p>
          </div>
          <StageTracker stage={stage} />
        </div>

        <p className='text-xs text-[#454545] mt-3 leading-relaxed'>{STAGE_HELP[stage]}</p>

        {!done && canEdit && (
          <div className='mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-end gap-3'>
            {!atReview && (
              <button type='button' onClick={advance} disabled={busy} className='btn-md'>
                Move to {STAGE_LABEL[state.nextStage] || 'next stage'}
              </button>
            )}

            {/* At review the record goes to the approval chain. The server
                decides which of these is offered (canSubmit / canApprove) — the
                client never re-derives it, so this cannot disagree with what the
                API would accept. */}
            {atReview && state.canSubmit && (
              <>
                <button type='button' onClick={submit} disabled={busy} className='btn-md'>
                  Submit for approval
                </button>
                <p className='text-[11px] text-[#959595] basis-full'>
                  This hands the record to the approval chain. You cannot approve it yourself —
                  whoever the chain names signs it under <strong>Approvals</strong>, and the employee
                  code and staff login are issued then.
                </p>
              </>
            )}

            {atReview && state.approval?.status === 'pending' && (
              <p className='text-xs text-amber-700'>
                Waiting for approval. It is in the approver&apos;s inbox now.
              </p>
            )}

            {atReview && state.approval?.status === 'rejected' && (
              <p className='text-xs text-red-700 basis-full'>
                This was rejected. Fix what was flagged, then submit it again.
              </p>
            )}

            {atReview && state.canApprove && (
              <>
                <label className='block'>
                  <span className='block text-[11px] text-[#757575] mb-1'>Date of joining (optional)</span>
                  <input type='date' value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)}
                    className='border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-gray-400' />
                </label>
                <button type='button' onClick={approve} disabled={busy} className='btn-md'>
                  Issue code &amp; login
                </button>
                <p className='text-[11px] text-[#959595] basis-full'>
                  Approved by the chain. This mints the employee code, creates their Firebase staff
                  login and returns a password-reset link <strong>once</strong>. Defaults to today if
                  you leave the date blank.
                </p>
              </>
            )}

            {atReview && state.approval?.status === 'unknown' && (
              <p className='text-xs text-red-700 basis-full'>
                Could not reach IAM to check the approval state. Nothing can be issued until it
                answers — approving is refused rather than guessed at.
              </p>
            )}
          </div>
        )}

        {!done && !canEdit && (
          <p className='text-xs text-[#959595] mt-4 pt-4 border-t border-gray-100'>
            View only — you do not hold <code className='text-[11px]'>workspace.employees.update</code>.
          </p>
        )}
      </div>

      <Documents employeeId={employee.id} canEdit={canEdit && !done} />
    </div>
  )
}

export default function EmployeeOnboarding() {
  const [rows, setRows] = useState(null)
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    try {
      // Server-side filter: the queue is "employees still in onboarding", which
      // is what `status` means on the employee record.
      const res = await workspaceApi().get('/employees?status=onboarding&limit=100')
      const data = res.data?.data || []
      setRows(data)
      setSelected((cur) => (cur ? data.find((r) => r.id === cur.id) || null : null))
    } catch (e) { ErrorToast(errMsg(e, 'Could not load the onboarding queue')) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className='max-w-6xl mx-auto pb-10'>
      <Header title='Onboarding' RightContent={() => null} />
      <p className='text-xs text-[#757575] px-1 pt-3 mb-5'>
        Everyone hired but not yet active. Hire someone from <strong>Candidates</strong> and they appear
        here at the profile stage; approving them at the end issues their employee code and staff login.
      </p>

      <div className='grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-5'>
        <div>
          <h3 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>
            In onboarding {rows ? `(${rows.length})` : ''}
          </h3>

          {rows === null && <p className='text-sm text-[#757575]'>Loading…</p>}

          {rows && rows.length === 0 && (
            <p className='text-sm text-[#757575] bg-white border border-gray-100 rounded-md px-4 py-4'>
              Nobody is in onboarding. Hire a candidate to start.
            </p>
          )}

          {rows && rows.length > 0 && (
            <div className='bg-white border border-gray-100 rounded-md divide-y divide-gray-50 overflow-hidden'>
              {rows.map((e) => (
                <button
                  key={e.id}
                  type='button'
                  onClick={() => setSelected(e)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selected?.id === e.id ? 'bg-gray-50' : ''}`}
                >
                  <p className='text-sm font-semibold'>{fullName(e)}</p>
                  <p className='text-[11px] text-[#959595]'>
                    {STAGE_LABEL[e.onboardingStage] || e.onboardingStage} · {e.email}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {!selected && rows && rows.length > 0 && (
            <p className='text-sm text-[#757575] bg-white border border-gray-100 rounded-md px-5 py-6'>
              Select someone to see their onboarding.
            </p>
          )}
          {selected && <Detail employee={selected} onChanged={load} />}
        </div>
      </div>
    </div>
  )
}
