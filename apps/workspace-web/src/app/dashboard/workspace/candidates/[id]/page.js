'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { workspaceApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'
import {
  Row, Card, Pill, BackLink, useLookup, errMsg, fmtDate, fmtDateTime, personName,
} from '@cocarr/datagrid'

// ONE APPLICATION — the candidate, where they are in the pipeline, their résumé,
// their interview rounds, their offers, and the full stage history.
//
// The list can show a stage; only here can you move somebody through one, read
// their CV, schedule an interview, send an offer and record its answer — and see
// that `hired` is not a stage change but a conversion into an employee.

// Ordered pipeline. `rejected`/`withdrawn` are exits, not steps, so they aren't
// drawn on the rail.
const PIPELINE = ['applied', 'screening', 'shortlisted', 'interview', 'selected', 'offer', 'hired']
// Stages a recruiter can move to directly (hired is via an accepted offer/hire).
const MOVE_TARGETS = ['screening', 'shortlisted', 'interview', 'selected', 'offer']

const inputCls = 'w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm'
const OFFER_TONE = { draft: 'neutral', sent: 'info', accepted: 'good', rejected: 'bad', withdrawn: 'neutral', expired: 'warn' }
const ROUND_TONE = { scheduled: 'info', completed: 'good', cancelled: 'neutral' }
const RESULT_TONE = { pending: 'neutral', pass: 'good', fail: 'bad', hold: 'warn' }

const fileToDataUri = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(r.result)
  r.onerror = reject
  r.readAsDataURL(file)
})

export default function ApplicationDetail() {
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
    } catch (e) { setError(errMsg(e, 'Could not load this application')) }
  }, [id])
  useEffect(() => { load() }, [load])

  const run = async (fn, ok) => {
    setBusy(true)
    try { await fn(); if (ok) InfoToast(ok); await load() }
    catch (e) { ErrorToast(errMsg(e, 'Something went wrong')) }
    finally { setBusy(false) }
  }

  const advance = (stage) => run(
    () => workspaceApi().post(`/candidates/${id}/advance`, { stage }), `Moved to ${stage}`,
  )
  const hire = () => {
    if (!window.confirm('Create an employee in onboarding from this candidate? This cannot be undone here.')) return
    run(async () => {
      const res = await workspaceApi().post(`/candidates/${id}/hire`)
      const emp = res.data?.employee || res.data?.data || res.data
      if (emp?.id) window.location.href = `/dashboard/workspace/employees/${emp.id}`
    }, 'Employee created — onboarding started')
  }

  // Résumé is private and authenticated — fetch it as a blob (the api-sdk
  // attaches the token) and open it, rather than a bare link that would 401.
  const openResume = () => run(async () => {
    const res = await workspaceApi().get(`/candidates/${id}/resume`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  })

  if (error) {
    return (
      <div className='max-w-5xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>{error}</p>
        <BackLink href='/dashboard/workspace/candidates'>Applications</BackLink>
      </div>
    )
  }
  if (!row) return <div className='p-8 text-sm text-[#757575]'>Loading…</div>

  const atIndex = PIPELINE.indexOf(row.stage)
  const isClosed = row.stage === 'hired' || row.stage === 'rejected' || row.stage === 'withdrawn'
  const interviews = row.interviews || []
  const offers = row.offers || []
  const history = row.stageEvents || []

  return (
    <div className='max-w-5xl mx-auto pb-12'>
      <BackLink href='/dashboard/workspace/candidates'>Applications</BackLink>
      <Header title={personName(row) || 'Applicant'} parent={row.positionTitle || row.jobPosting?.title || 'Application'} />

      {/* Pipeline */}
      <Card title='Pipeline'>
        <div className='flex items-center gap-1 flex-wrap mb-4'>
          {PIPELINE.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <span className='text-[#d5d5d5] text-xs'>›</span>}
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${
                row.stage === s ? 'bg-[#252525] text-white'
                  : atIndex > i ? 'bg-gray-100 text-[#757575]' : 'text-[#c5c5c5]'
              }`}
              >{s}</span>
            </React.Fragment>
          ))}
          {(row.stage === 'rejected' || row.stage === 'withdrawn') && (
            <span className='ml-2'><Pill tone='bad'>{row.stage}</Pill></span>
          )}
        </div>

        {canUpdate && !isClosed && (
          <div className='flex gap-2 flex-wrap pt-3 border-t border-gray-50'>
            {MOVE_TARGETS.filter((s) => s !== row.stage).map((s) => (
              <button key={s} type='button' disabled={busy} onClick={() => advance(s)}
                className='text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-[#f3f3f3] disabled:opacity-40'
              >Move to {s}</button>
            ))}
            <button type='button' disabled={busy} onClick={() => advance('rejected')}
              className='text-xs font-semibold px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40'
            >Reject</button>
            <button type='button' disabled={busy} onClick={() => advance('withdrawn')}
              className='text-xs font-semibold px-3 py-1.5 rounded-md text-[#757575] hover:bg-gray-50 disabled:opacity-40'
            >Withdrawn</button>
            <button type='button' disabled={busy} onClick={hire} className='btn-md ml-auto'>Hire → employee</button>
          </div>
        )}
        {row.stage === 'hired' && (
          <p className='text-xs text-[#757575] pt-3 border-t border-gray-50'>
            Hired.{' '}
            {row.convertedEmployeeId
              ? <Link href={`/dashboard/workspace/employees/${row.convertedEmployeeId}`} className='font-semibold hover:underline'>Open their employee record →</Link>
              : 'No employee record is linked — the hire may have half-completed.'}
          </p>
        )}
      </Card>

      <div className='grid md:grid-cols-2 gap-0 md:gap-4'>
        <div>
          <Card title='Applicant'>
            <Row label='Email'>{row.email}</Row>
            <Row label='Phone'>{row.phone}</Row>
            <Row label='Source'>{row.source}</Row>
            <Row label='Applied'>{fmtDate(row.createdAt)}</Row>
            <Row label='Résumé'>
              {row.resumeKey
                ? <button type='button' onClick={openResume} disabled={busy} className='font-semibold text-[#252525] hover:underline disabled:opacity-40'>View résumé ↗</button>
                : <span className='text-[#9a9a9a]'>None on file</span>}
            </Row>
          </Card>
          <Card title='Role applied for'>
            <Row label='Posting'>
              {row.jobPosting
                ? <Link href={`/dashboard/workspace/jobs/${row.jobPosting.id}`} className='font-semibold hover:underline'>{row.jobPosting.title}</Link>
                : (row.positionTitle || '—')}
            </Row>
            <Row label='Department'>{deptName(row.departmentId)}</Row>
            <Row label='Designation'>{desigName(row.designationId)}</Row>
          </Card>
        </div>

        <div>
          <Interviews candidateId={id} rounds={interviews} canUpdate={canUpdate} reload={load} />
          <Offers candidateId={id} offers={offers} canUpdate={canUpdate} reload={load} />
        </div>
      </div>

      {row.notes && (
        <Card title='Notes'>
          <p className='text-sm text-[#252525] whitespace-pre-wrap'>{row.notes}</p>
        </Card>
      )}

      <Card title='History'>
        {history.length === 0
          ? <p className='text-xs text-[#757575]'>No stage changes recorded yet.</p>
          : (
            <ul className='space-y-1.5'>
              {history.map((h) => (
                <li key={h.id} className='text-xs text-[#555] flex gap-2'>
                  <span className='text-[#9a9a9a] shrink-0'>{fmtDateTime(h.createdAt)}</span>
                  <span>{h.fromStage ? `${h.fromStage} → ` : ''}<strong>{h.toStage}</strong>{h.note ? ` — ${h.note}` : ''}</span>
                </li>
              ))}
            </ul>
          )}
      </Card>
    </div>
  )
}

// ── Interview rounds ─────────────────────────────────────────────────────────
function Interviews({ candidateId, rounds, canUpdate, reload }) {
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', mode: 'online', scheduledAt: '', interviewerName: '' })

  const add = async () => {
    setBusy(true)
    try {
      await workspaceApi().post(`/candidates/${candidateId}/interviews`, form)
      InfoToast('Interview round added')
      setForm({ title: '', mode: 'online', scheduledAt: '', interviewerName: '' })
      setAdding(false)
      await reload()
    } catch (e) { ErrorToast(errMsg(e, 'Could not add the round')) } finally { setBusy(false) }
  }
  const update = async (roundId, patch, ok) => {
    setBusy(true)
    try { await workspaceApi().put(`/candidates/${candidateId}/interviews/${roundId}`, patch); if (ok) InfoToast(ok); await reload() }
    catch (e) { ErrorToast(errMsg(e, 'Could not update the round')) } finally { setBusy(false) }
  }

  return (
    <Card title={`Interviews (${rounds.length})`}>
      {rounds.length === 0 && <p className='text-xs text-[#757575] mb-2'>No rounds scheduled.</p>}
      <ul className='space-y-2'>
        {rounds.map((r) => (
          <li key={r.id} className='border border-gray-100 rounded-md p-2'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-semibold'>{r.title || `Round ${r.roundNumber}`}</span>
              <span className='flex gap-1'>
                <Pill tone={ROUND_TONE[r.status] || 'neutral'}>{r.status}</Pill>
                <Pill tone={RESULT_TONE[r.result] || 'neutral'}>{r.result}</Pill>
              </span>
            </div>
            <div className='text-[11px] text-[#757575] mt-1'>
              {r.mode}{r.scheduledAt ? ` · ${fmtDateTime(r.scheduledAt)}` : ''}{r.interviewerName ? ` · ${r.interviewerName}` : ''}
            </div>
            {canUpdate && r.result === 'pending' && (
              <div className='flex gap-2 mt-2'>
                <button type='button' disabled={busy} onClick={() => update(r.id, { status: 'completed', result: 'pass' }, 'Marked passed')} className='text-[11px] font-semibold text-green-700 hover:underline disabled:opacity-40'>Pass</button>
                <button type='button' disabled={busy} onClick={() => update(r.id, { status: 'completed', result: 'fail' }, 'Marked failed')} className='text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-40'>Fail</button>
                <button type='button' disabled={busy} onClick={() => update(r.id, { result: 'hold' }, 'Put on hold')} className='text-[11px] font-semibold text-amber-600 hover:underline disabled:opacity-40'>Hold</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canUpdate && (adding ? (
        <div className='mt-3 space-y-2 border-t border-gray-50 pt-3'>
          <input className={inputCls} placeholder='Round title (e.g. Technical)' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className='flex gap-2'>
            <select className={inputCls} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value='online'>Online</option><option value='onsite'>Onsite</option><option value='phone'>Phone</option>
            </select>
            <input type='datetime-local' className={inputCls} value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </div>
          <input className={inputCls} placeholder='Interviewer' value={form.interviewerName} onChange={(e) => setForm({ ...form, interviewerName: e.target.value })} />
          <div className='flex gap-2'>
            <button type='button' disabled={busy} onClick={add} className='btn-md'>Add round</button>
            <button type='button' onClick={() => setAdding(false)} className='btn-md-disabled'>Cancel</button>
          </div>
        </div>
      ) : (
        <button type='button' onClick={() => setAdding(true)} className='mt-3 text-xs font-semibold hover:underline'>+ Add round</button>
      ))}
    </Card>
  )
}

// ── Offers ───────────────────────────────────────────────────────────────────
function Offers({ candidateId, offers, canUpdate, reload }) {
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ designationTitle: '', ctcAmount: '', expectedJoiningDate: '', notes: '', letter: null })

  const create = async () => {
    setBusy(true)
    try {
      const body = { ...form }
      if (form.letter) body.letter = await fileToDataUri(form.letter)
      else delete body.letter
      await workspaceApi().post(`/candidates/${candidateId}/offers`, body)
      InfoToast('Offer drafted')
      setForm({ designationTitle: '', ctcAmount: '', expectedJoiningDate: '', notes: '', letter: null })
      setCreating(false)
      await reload()
    } catch (e) { ErrorToast(errMsg(e, 'Could not create the offer')) } finally { setBusy(false) }
  }
  const action = async (offerId, path, body, ok) => {
    setBusy(true)
    try { await workspaceApi().post(`/offers/${offerId}/${path}`, body || {}); if (ok) InfoToast(ok); await reload() }
    catch (e) { ErrorToast(errMsg(e, 'Action failed')) } finally { setBusy(false) }
  }
  const respond = (offerId, decision) => {
    const note = window.prompt(`Note for this ${decision} response (optional):`) || ''
    return action(offerId, 'respond', { decision, note },
      decision === 'accepted' ? 'Offer accepted — candidate moved to onboarding' : 'Offer marked rejected')
  }
  const openLetter = (offerId) => {
    setBusy(true)
    workspaceApi().get(`/offers/${offerId}/letter`, { responseType: 'blob' })
      .then((res) => { const u = URL.createObjectURL(res.data); window.open(u, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(u), 60000) })
      .catch((e) => ErrorToast(errMsg(e, 'No letter'))).finally(() => setBusy(false))
  }

  return (
    <Card title={`Offers (${offers.length})`}>
      {offers.length === 0 && <p className='text-xs text-[#757575] mb-2'>No offers yet.</p>}
      <ul className='space-y-2'>
        {offers.map((o) => (
          <li key={o.id} className='border border-gray-100 rounded-md p-2'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-semibold'>{o.designationTitle || 'Offer'}</span>
              <Pill tone={OFFER_TONE[o.status] || 'neutral'}>{o.status}</Pill>
            </div>
            <div className='text-[11px] text-[#757575] mt-1'>
              {o.ctcAmount ? `${o.ctcCurrency || 'INR'} ${o.ctcAmount}` : 'CTC —'}
              {o.expectedJoiningDate ? ` · joins ${fmtDate(o.expectedJoiningDate)}` : ''}
            </div>
            <div className='flex gap-3 mt-2 flex-wrap'>
              {o.letterKey && <button type='button' disabled={busy} onClick={() => openLetter(o.id)} className='text-[11px] font-semibold hover:underline disabled:opacity-40'>Letter ↗</button>}
              {canUpdate && o.status === 'draft' && <button type='button' disabled={busy} onClick={() => action(o.id, 'send', null, 'Offer sent')} className='text-[11px] font-semibold text-[#252525] hover:underline disabled:opacity-40'>Send</button>}
              {canUpdate && o.status === 'sent' && (
                <>
                  <button type='button' disabled={busy} onClick={() => respond(o.id, 'accepted')} className='text-[11px] font-semibold text-green-700 hover:underline disabled:opacity-40'>Accepted</button>
                  <button type='button' disabled={busy} onClick={() => respond(o.id, 'rejected')} className='text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-40'>Rejected</button>
                  <button type='button' disabled={busy} onClick={() => action(o.id, 'withdraw', null, 'Offer withdrawn')} className='text-[11px] font-semibold text-[#757575] hover:underline disabled:opacity-40'>Withdraw</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canUpdate && (creating ? (
        <div className='mt-3 space-y-2 border-t border-gray-50 pt-3'>
          <input className={inputCls} placeholder='Designation offered' value={form.designationTitle} onChange={(e) => setForm({ ...form, designationTitle: e.target.value })} />
          <div className='flex gap-2'>
            <input type='number' className={inputCls} placeholder='CTC amount' value={form.ctcAmount} onChange={(e) => setForm({ ...form, ctcAmount: e.target.value })} />
            <input type='date' className={inputCls} value={form.expectedJoiningDate} onChange={(e) => setForm({ ...form, expectedJoiningDate: e.target.value })} />
          </div>
          <textarea className={inputCls} rows={2} placeholder='Notes' value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <label className='block text-[11px] text-[#757575]'>Offer letter (PDF, optional)
            <input type='file' accept='.pdf,.doc,.docx' className='mt-1 block text-xs' onChange={(e) => setForm({ ...form, letter: e.target.files?.[0] || null })} />
          </label>
          <div className='flex gap-2'>
            <button type='button' disabled={busy} onClick={create} className='btn-md'>Create offer</button>
            <button type='button' onClick={() => setCreating(false)} className='btn-md-disabled'>Cancel</button>
          </div>
        </div>
      ) : (
        <button type='button' onClick={() => setCreating(true)} className='mt-3 text-xs font-semibold hover:underline'>+ Create offer</button>
      ))}
    </Card>
  )
}
