'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { PageLayout, Pagination, Modal } from '@cocarr/ui'
import { LIMIT } from '@cocarr/shared-utils'
import { DocumentImage } from '@/app/_components/DocumentCell'
import { DOC_PILL, DOC_LABEL } from '@/app/_helpers/userStatus'
import { useCan } from '@cocarr/iam-sdk'

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

// The two identity documents the approval gate cares about. `api` is the
// document key the backend endpoint expects ('kyc' for Aadhaar); `key` is the
// field on each row's `documentStatus`. PAN is deliberately excluded — it is a
// payout prerequisite, not part of the identity check that gates approval.
const IDENTITY_DOCS = [
  { key: 'licence', api: 'licence', label: 'Driving licence' },
  { key: 'aadhaar', api: 'kyc', label: 'Aadhaar' },
]

const STATUS = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  suspended: 'bg-orange-100 text-orange-700',
  incomplete: 'bg-gray-100 text-gray-500',
}

const SUSPENSION_REASONS = [
  'Repeated booking cancellations',
  'Damage to a vehicle left unresolved',
  'Outstanding dues',
  'Behaviour reported by a host',
  'Suspected fraudulent documents',
]

const REJECTION_REASONS = [
  'Driving licence is unclear or unreadable',
  'Aadhaar details do not match the profile',
  'Name on documents does not match the profile',
  'Address is incomplete or invalid',
  'Document appears altered or expired',
]

const Field = ({ label, value }) => (
  <div>
    <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
    <p className='text-xs text-[#454545]'>{value || '—'}</p>
  </div>
)

// The name comparison is the reviewer's main signal, so it is rendered per
// document rather than collapsed into a single pass/fail.
const NameMatch = ({ result }) => {
  if (!result || !result.comparisons) return null
  const entries = Object.entries(result.comparisons)
  if (!entries.length) return null

  return (
    <div className={`mt-3 rounded-md px-3 py-2 border-l-2 ${
      result.matched ? 'bg-green-50 border-green-400' : 'bg-amber-50 border-amber-400'}`}>
      <p className={`text-[11px] font-semibold ${result.matched ? 'text-green-800' : 'text-amber-800'}`}>
        {result.summary}
      </p>
      <div className='mt-1.5 grid gap-0.5'>
        {entries.map(([source, c]) => (
          <p key={source} className='text-[11px] text-[#454545]'>
            <span className='uppercase font-semibold text-[#757575]'>{source}</span>{' '}
            <span className={c.matched ? 'text-green-700' : 'text-red-600'}>
              {c.matched ? '✓' : '✕'}
            </span>{' '}
            {c.firstName?.a} {c.lastName?.a} vs {c.firstName?.b} {c.lastName?.b}
            {!c.matched && <span className='text-red-600'> — {c.reason}</span>}
          </p>
        ))}
      </div>
    </div>
  )
}

export default function UsersVerification() {
  const [users, setUsers] = useState([])
  const [counts, setCounts] = useState({ pending: 0, verified: 0, rejected: 0 })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('pending')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(null)
  // Every action on this queue — reject, suspend, reactivate, per-document
  // verify — is a `users.update` on the server. A view-only admin gets the
  // queue and the scans, which is genuinely useful, and no buttons that 403.
  // Was can('users','update') against the old team/level grid. Now a permission
  // KEY resolved from the IAM navigation payload — same question, one vocabulary.
  const mayDecide = useCan('operations.users.update')
  const [rejecting, setRejecting] = useState(null)
  const [suspending, setSuspending] = useState(null)
  const [reason, setReason] = useState('')
  // Clicking a user opens the full review screen — the queue itself stays a
  // list, so the reviewer can still triage without opening every submission.
  // Review happens on the user detail page, which is the only screen that shows
  // the OCR-extracted values and gates approval the way the backend does.
  const router = useRouter()
  const openUser = (userId) => router.push(`/dashboard/users/${userId}`)

  const load = async () => {
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/user-verification', {
        params: { offset, limit: LIMIT, status, search: search || undefined },
      })
      setUsers(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setCounts(res.data?.counts || { pending: 0, verified: 0, rejected: 0 })
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load verification queue')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [offset, status, search])

  const submitRejection = async () => {
    const text = reason.trim()
    if (!text) { ErrorToast('Give a reason — the user needs to know what to fix'); return }
    setBusy(rejecting.id)
    try {
      await coreApi().post(`/admin/user-verification/${rejecting.id}/reject`, { reason: text })
      InfoToast('Profile rejected — the user can update and resubmit')
      setRejecting(null); setReason('')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not reject')
    } finally { setBusy(null) }
  }

  // Suspension is an access decision, not a re-review — reactivating puts the
  // profile straight back to active without re-approving any document.
  const submitSuspension = async () => {
    const text = reason.trim()
    if (!text) { ErrorToast('Give a reason — it is recorded against the account'); return }
    setBusy(suspending.id)
    try {
      await coreApi().post(`/admin/user-verification/${suspending.id}/suspend`, { suspended: true, reason: text })
      InfoToast('Account suspended')
      setSuspending(null); setReason('')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not suspend')
    } finally { setBusy(null) }
  }

  const reactivate = async (u) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || 'this user'
    if (!window.confirm(`Reactivate ${name}? Their profile returns to active.`)) return
    setBusy(u.id)
    try {
      await coreApi().post(`/admin/user-verification/${u.id}/suspend`, { suspended: false })
      InfoToast('Account reactivated')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not reactivate')
    } finally { setBusy(null) }
  }

  // Quick per-document verify/reject, right from the queue — no need to open the
  // review screen for a straightforward decision. Rejecting needs a reason (the
  // user sees it), same as the detail page.
  //
  // A document decision moves the DOCUMENT and nothing else. The profile becomes
  // active only when an admin presses Approve on the review screen, and rejected
  // only via the Reject button here or there. Verifying a scan does not mean
  // "this person may now book".
  const setDoc = async (u, docKey, verified) => {
    const api = docKey === 'aadhaar' ? 'kyc' : 'licence'
    let why
    if (!verified) {
      why = window.prompt('Why is this document not acceptable? The user sees this.')
      if (why === null) return
      if (!why.trim()) { ErrorToast('A reason is required'); return }
    }
    setBusy(u.id)
    try {
      await coreApi().post(`/admin/user-verification/${u.id}/document/${api}`,
        verified ? { verified: true } : { verified: false, reason: why.trim() })
      InfoToast(verified ? 'Document verified' : 'Document rejected')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update the document')
    } finally { setBusy(null) }
  }

  const toggleSearchable = async (u) => {
    setBusy(u.id)
    try {
      await coreApi().post(`/admin/user-verification/${u.id}/searchable`, { searchable: !u.isSearchable })
      InfoToast(u.isSearchable ? 'Hidden from search' : 'Now searchable')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not update')
    } finally { setBusy(null) }
  }

  const filters = (
    <>
      <input className={`${input} flex-1 min-w-[220px] max-w-sm`} placeholder='Search by name, email or phone'
        value={search} onChange={(e) => { setOffset(0); setSearch(e.target.value) }} />
      <select className={input} value={status} onChange={(e) => { setOffset(0); setStatus(e.target.value) }}>
        <option value='pending'>Pending review ({counts.pending})</option>
        <option value='active'>Active ({counts.active})</option>
        <option value='suspended'>Suspended ({counts.suspended})</option>
        <option value='rejected'>Rejected ({counts.rejected})</option>
        <option value='incomplete'>Incomplete ({counts.incomplete})</option>
      </select>
      <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
    </>
  )

  return (
    <PageLayout
      title='KYC Verification Queue'
      subtitle='Submissions awaiting review — verify documents inline or open a submission for the full review.'
      breadcrumb={['User Management', 'Verification Queue']}
      filters={filters}
    >
      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}
      {!loading && users.length === 0 && (
        <div className='bg-white border border-gray-100 rounded-md px-5 py-8 text-center'>
          <p className='text-sm text-[#757575]'>Nothing in this queue.</p>
        </div>
      )}

      <div className='grid gap-3'>
        {users.map((u) => {
          const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name
          return (
            <div key={u.id} className='bg-white border border-gray-100 rounded-md p-5'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='flex items-center gap-2'>
                    <button onClick={() => openUser(u.id)}
                      className='font-semibold text-left hover:underline'>
                      {fullName || <span className='text-[#959595]'>No name</span>}
                    </button>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[u.verificationStatus] || STATUS.incomplete}`}>
                      {String(u.verificationStatus || '').replace('_', ' ')}
                    </span>
                    {u.isSearchable && (
                      <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700'>
                        searchable
                      </span>
                    )}
                  </div>
                  <p className='text-[11px] text-[#959595] mt-0.5'>
                    {u.email || '—'} · {u.contactNumber || '—'}
                    {u.verificationSubmittedAt && ` · submitted ${new Date(u.verificationSubmittedAt).toLocaleDateString()}`}
                  </p>
                </div>

                <div className='flex gap-2 shrink-0'>
                  <button onClick={() => openUser(u.id)}
                    className='text-xs font-semibold border border-gray-200 px-4 py-1.5 rounded-md'>
                    Review
                  </button>
                  {mayDecide && u.verificationStatus === 'pending' && (
                    <>
                      {/* No inline Approve: the backend requires every document
                          to be verified first, which can only be done on the
                          review screen. A button here would always error. */}
                      <button onClick={() => openUser(u.id)}
                        className='text-xs font-semibold bg-[#ECC032] text-black px-4 py-1.5 rounded-md'>
                        Review &amp; decide
                      </button>
                      <button disabled={busy === u.id} onClick={() => { setRejecting(u); setReason('') }}
                        className='text-xs font-semibold border border-red-200 text-red-600 px-4 py-1.5 rounded-md disabled:opacity-50'>
                        Reject
                      </button>
                    </>
                  )}
                  {mayDecide && u.verificationStatus === 'active' && (
                    <>
                      <button disabled={busy === u.id} onClick={() => toggleSearchable(u)}
                        className='text-xs font-semibold border border-gray-200 text-[#454545] px-4 py-1.5 rounded-md disabled:opacity-50'>
                        {u.isSearchable ? 'Hide from search' : 'Make searchable'}
                      </button>
                      {/* Withdrawing an approval, kept separate from Suspend:
                          suspension is an access ban for misconduct and says
                          something quite different to the user. */}
                      <button disabled={busy === u.id} onClick={() => { setRejecting(u); setReason('') }}
                        className='text-xs font-semibold border border-red-200 text-red-600 px-4 py-1.5 rounded-md disabled:opacity-50'>
                        Reject
                      </button>
                      <button disabled={busy === u.id} onClick={() => { setSuspending(u); setReason('') }}
                        className='text-xs font-semibold border border-orange-200 text-orange-700 px-4 py-1.5 rounded-md disabled:opacity-50'>
                        Suspend
                      </button>
                    </>
                  )}
                  {/* Nothing actionable for this admin. Said once per row rather
                      than leaving a blank space where buttons clearly used to be. */}
                  {!mayDecide && (
                    <span className='text-[11px] text-[#959595]'>View only</span>
                  )}
                  {mayDecide && u.verificationStatus === 'suspended' && (
                    <button disabled={busy === u.id} onClick={() => reactivate(u)}
                      className='text-xs font-semibold bg-[#ECC032] text-black px-4 py-1.5 rounded-md disabled:opacity-50'>
                      {busy === u.id ? '…' : 'Reactivate'}
                    </button>
                  )}
                </div>
              </div>

              <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-4'>
                <Field label='Date of birth' value={u.dateOfBirth} />
                <Field label='Address' value={[u.address, u.city, u.state, u.pincode].filter(Boolean).join(', ')} />
                <Field label='Licence' value={u.licenseNumber} />
                <Field label='Aadhaar' value={u.kycNumber} />
              </div>

              <div className='flex flex-wrap gap-4 mt-3'>
                {u.licenseFrontImage && <DocumentImage src={u.licenseFrontImage} label='Licence (front)' />}
                {u.licenseBackImage && <DocumentImage src={u.licenseBackImage} label='Licence (back)' />}
                {u.kycImage && <DocumentImage src={u.kycImage} label='Aadhaar document' />}
                {u.panImage && <DocumentImage src={u.panImage} label='PAN card' />}
              </div>

              <NameMatch result={u.nameMatchResult} />

              {/* Quick document actions — the "pending for verification items"
                  surfaced inline so a straightforward case can be cleared here.
                  Approving the profile itself is deliberately not one of them:
                  it belongs on the review screen, where the scans are. */}
              {mayDecide && u.verificationStatus === 'pending' && (
                <div className='mt-4 border-t border-gray-50 pt-3'>
                  <div className='flex items-center justify-between gap-2 mb-2'>
                    <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>
                      Documents to verify
                    </p>
                    <p className='text-[10px] text-[#959595]'>Verify both, then approve on the review screen</p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {IDENTITY_DOCS.map((d) => {
                      const state = (u.documentStatus || {})[d.key] || 'missing'
                      return (
                        <div key={d.key} className='flex items-center gap-1.5 border border-gray-200 rounded-md pl-2.5 pr-1.5 py-1'>
                          <span className='text-[11px] font-medium text-[#454545]'>{d.label}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DOC_PILL[state] || DOC_PILL.missing}`}>
                            {DOC_LABEL[state] || state}
                          </span>
                          {state === 'missing' ? (
                            <span className='text-[10px] text-gray-400 px-1'>not submitted</span>
                          ) : (
                            <>
                              {state !== 'verified' && (
                                <button disabled={busy === u.id} onClick={() => setDoc(u, d.key, true)}
                                  className='text-[10px] font-semibold text-green-700 border border-green-200 rounded px-1.5 py-0.5 disabled:opacity-50'>
                                  Verify
                                </button>
                              )}
                              {state !== 'rejected' && (
                                <button disabled={busy === u.id} onClick={() => setDoc(u, d.key, false)}
                                  className='text-[10px] font-semibold text-red-600 border border-red-200 rounded px-1.5 py-0.5 disabled:opacity-50'>
                                  Reject
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {u.verificationStatus === 'suspended' && (
                <div className='mt-3 bg-orange-50 border-l-2 border-orange-400 px-3 py-2'>
                  <p className='text-[11px] text-orange-800'>
                    <span className='font-semibold'>Suspended
                      {u.suspendedAt && ` ${new Date(u.suspendedAt).toLocaleDateString()}`} · </span>
                    {u.suspensionReason || 'No reason recorded'}
                  </p>
                </div>
              )}

              {u.verificationRejectionReason && u.verificationStatus === 'rejected' && (
                <div className='mt-3 bg-red-50 border-l-2 border-red-400 px-3 py-2'>
                  <p className='text-[11px] text-red-800'>
                    <span className='font-semibold'>Rejected · </span>{u.verificationRejectionReason}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {rejecting && (
        <Modal onClose={() => setRejecting(null)} size='md' label='Reject profile' className='p-5'>
          <div>
            <p className='font-semibold mb-1'>
              Reject {[rejecting.firstName, rejecting.lastName].filter(Boolean).join(' ') || rejecting.name}
            </p>
            <p className='text-xs text-[#757575] mb-4'>
              {rejecting.verificationStatus === 'active'
                // Rejecting an approved profile takes booking away immediately,
                // which is a bigger deal than turning down a new submission.
                ? 'This withdraws your approval. The user stops being able to book straight away, sees this reason, and can correct their details and resubmit.'
                : 'The user sees this reason and can update their details and resubmit.'}
            </p>

            <div className='flex flex-wrap gap-2 mb-3'>
              {REJECTION_REASONS.map((r) => (
                <button key={r} type='button' onClick={() => setReason(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border ${
                    reason === r ? 'bg-[#ECC032] border-[#ECC032] text-black'
                                 : 'bg-white border-gray-200 text-[#757575]'}`}>
                  {r}
                </button>
              ))}
            </div>

            <textarea className={`${input} w-full min-h-[90px]`} value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Explain what the user needs to correct…' />

            <div className='flex justify-end gap-3 mt-4'>
              <button onClick={() => setRejecting(null)} className='text-sm font-semibold text-[#757575]'>
                Cancel
              </button>
              <button onClick={submitRejection} disabled={busy === rejecting.id || !reason.trim()}
                className='bg-red-600 text-white text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-50'>
                {busy === rejecting.id ? 'Rejecting…' : 'Reject profile'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {suspending && (
        <Modal onClose={() => setSuspending(null)} size='md' label='Suspend profile' className='p-5'>
          <div>
            <p className='font-semibold mb-1'>
              Suspend {[suspending.firstName, suspending.lastName].filter(Boolean).join(' ') || suspending.name}
            </p>
            <p className='text-xs text-[#757575] mb-4'>
              Their documents and approval are kept — reactivating restores the account without a re-review.
              They are removed from search while suspended.
            </p>

            <div className='flex flex-wrap gap-2 mb-3'>
              {SUSPENSION_REASONS.map((r) => (
                <button key={r} type='button' onClick={() => setReason(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-md border ${
                    reason === r ? 'bg-[#ECC032] border-[#ECC032] text-black'
                                 : 'bg-white border-gray-200 text-[#757575]'}`}>
                  {r}
                </button>
              ))}
            </div>

            <textarea className={`${input} w-full min-h-[90px]`} value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder='Why is this account being suspended?' />

            <div className='flex justify-end gap-3 mt-4'>
              <button onClick={() => setSuspending(null)} className='text-sm font-semibold text-[#757575]'>
                Cancel
              </button>
              <button onClick={submitSuspension} disabled={busy === suspending.id || !reason.trim()}
                className='bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-50'>
                {busy === suspending.id ? 'Suspending…' : 'Suspend account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <p className='text-[11px] text-[#959595] mt-3'>
        Aadhaar and PAN numbers are masked by the server — check the document scan to confirm them.
        Approving makes the profile searchable but grants no additional application access.
      </p>
    </PageLayout>
  )
}
