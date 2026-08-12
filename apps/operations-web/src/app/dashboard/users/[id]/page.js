'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast } from '@cocarr/notifications'
import { photoUrl } from '@cocarr/shared-utils'
import { getValidDateFormat } from '@cocarr/shared-utils'
import { DocumentThumb } from '@/app/_components/DocumentCell'
import {
  STATUS_PILL, STATUS_LABEL, STATUS_MEANING, DOC_PILL, DOC_LABEL, allowedActions,
} from '@/app/_helpers/userStatus'
import { useCan } from '@cocarr/iam-sdk'
import { FaceCompare, Modal } from '@cocarr/ui'

// User detail — everything an admin needs to decide about one person, grouped
// into labelled sections (SectionHeading), in the order they are needed:
//
//   1. Identity   — who this is, their id, and the current status
//   2. Profile    — the details they entered, and the automated name match
//   3. Documents  — driving licence and Aadhaar: extracted values, the scans,
//                   each document's own status. Aadhaar is TWO-FACED — the front
//                   OCR reads the number/name/DOB, the back OCR reads the address.
//   4. Referrals  — a MARKETING record: who brought them in, who they brought in
//   5. Wallet     — the user's points ACCOUNT (a bank statement): balance plus
//                   every credit (referral and other) and debit (bookings).
//                   Referral is one source that feeds this account, not the same
//                   thing as it.
//   6. Decision   — approve / reject / suspend / reactivate
//
// Aadhaar and PAN numbers are masked server-side by design. The reviewer reads
// them OFF THE SCAN, which is why the images render up front rather than behind
// a text link — a masked field next to a link makes the document look optional,
// which is backwards.

const REJECTION_REASONS = [
  'Driving licence is unclear or unreadable',
  'Aadhaar details do not match the profile',
  'Name on documents does not match the profile',
  'Address is incomplete or invalid',
  'Document appears altered or expired',
]

const SUSPENSION_REASONS = [
  'Repeated booking cancellations',
  'Damage to a vehicle left unresolved',
  'Outstanding dues',
  'Behaviour reported by a host',
  'Suspected fraudulent documents',
]

const input = 'border border-gray-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#ECC032]'

// ── Module scope, deliberately ──────────────────────────────────────────────
// A component declared inside another component's render is a new type on
// every render, so React remounts it — which closed the document lightbox on
// this very screen once before. Do not move these inside the page component.

const Row = ({ label, value, masked }) => (
  <div className='flex justify-between gap-6 py-2 border-b border-gray-50 last:border-0'>
    <p className='text-[11px] uppercase tracking-tight text-[#959595] font-semibold shrink-0'>{label}</p>
    <p className={`text-xs text-right ${masked ? 'text-[#959595]' : 'text-[#454545]'}`}>
      {value || '—'}
      {masked && value ? <span className='text-[10px]'> (read from document)</span> : null}
    </p>
  </div>
)

// What the OCR provider read off the scan, and whether it agrees with what the
// user typed and with the profile. This IS the reviewer's job, so it is shown
// as a first-class panel rather than buried — and the agree/disagree markers are
// computed server-side so every screen judges it identically.
const OcrPanel = ({ ocr, title = 'OCR' }) => {
  if (!ocr) return null

  const verdict = {
    VALID: ['bg-green-50 border-green-400', 'text-green-800', 'Read successfully'],
    INVALID: ['bg-red-50 border-red-400', 'text-red-700', 'Provider says this is not that document'],
    FAILED: ['bg-amber-50 border-amber-400', 'text-amber-800', 'Could not read the details'],
    UNCHECKED: ['bg-gray-50 border-gray-300', 'text-[#757575]', 'Provider did not respond'],
  }[ocr.status] || ['bg-gray-50 border-gray-300', 'text-[#757575]', ocr.status || 'Not checked']

  const Flag = ({ ok, label }) => {
    if (ok === null || ok === undefined) return null
    return (
      <p className={`text-[11px] mt-1 ${ok ? 'text-green-700' : 'text-red-600'}`}>
        {ok ? '✓' : '✕'} {label}
      </p>
    )
  }

  const e = ocr.extracted || {}
  const rows = [
    ['Number', e.documentNumber || e.licenceNumber],
    ['Name', e.holderName],
    ['Date of birth', e.dateOfBirth],
    ['Issued', e.issuedDate],
    ['Expires', e.expiryDate],
    ['Gender', e.gender],
    ['Address', e.address],
  ].filter(([, v]) => v)

  return (
    <div className={`mt-4 rounded-md px-4 py-3 border-l-2 ${verdict[0]}`}>
      <div className='flex items-center justify-between gap-3'>
        <p className={`text-xs font-semibold ${verdict[1]}`}>{title} — {verdict[2]}</p>
        {ocr.checkedAt && (
          <p className='text-[10px] text-[#959595]'>{new Date(ocr.checkedAt).toLocaleString()}</p>
        )}
      </div>

      {/* Consent is only recorded when OCR failed, so its presence is itself
          the signal that this document needs human eyes. */}
      {ocr.manualConsent && (
        <p className='text-[11px] text-amber-800 mt-1.5 font-semibold'>
          The user agreed to manual verification
          {ocr.manualConsentAt && ` on ${new Date(ocr.manualConsentAt).toLocaleDateString()}`} —
          check this one by hand.
        </p>
      )}

      <Flag ok={ocr.numberMatchesTyped} label='Number matches what the user typed' />
      <Flag ok={ocr.nameMatchesProfile} label='Name matches the profile' />

      {rows.length > 0 && (
        <div className='mt-2.5 grid md:grid-cols-2 gap-x-8'>
          {rows.map(([label, value]) => (
            <div key={label} className='flex justify-between gap-4 py-1'>
              <span className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</span>
              <span className='text-xs text-[#454545] text-right'>{value}</span>
            </div>
          ))}
        </div>
      )}
      {rows.length === 0 && (
        <p className='text-[11px] text-[#959595] mt-2'>Nothing was extracted from the scan.</p>
      )}

      {/* Everything else the provider returned. The named fields above are a
          whitelist, and a whitelist silently discards what it does not know —
          father's name, pincode, issuing authority. Those are exactly what
          settles a borderline verification, so they are shown rather than
          dropped. Anything that looks like an Aadhaar number is masked
          server-side before it gets here. */}
      {Object.keys(ocr.additional || {}).length > 0 && (
        <details className='mt-3'>
          <summary className='text-[11px] font-semibold text-[#757575] cursor-pointer select-none'>
            Everything else the provider read ({Object.keys(ocr.additional).length})
          </summary>
          <div className='mt-2 grid md:grid-cols-2 gap-x-8'>
            {Object.entries(ocr.additional).map(([k, v]) => (
              <div key={k} className='flex justify-between gap-4 py-1'>
                <span className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>
                  {k.replace(/[_-]/g, ' ')}
                </span>
                <span className='text-xs text-[#454545] text-right break-all'>{String(v)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

// Referral lifecycle, in the vocabulary the backend now writes. The legacy
// spellings map to the same thing — rows written before the rename still hold
// `eligible`/`rewarded`, and both mean the wallet credit landed.
const REFERRAL_STATUS = {
  pending: ['bg-amber-100 text-amber-700', 'Pending'],
  completed: ['bg-green-100 text-green-700', 'Completed'],
  rewarded: ['bg-green-100 text-green-700', 'Completed'],
  eligible: ['bg-green-100 text-green-700', 'Completed'],
  cancelled: ['bg-red-100 text-red-600', 'Cancelled'],
  fraud: ['bg-red-100 text-red-600', 'Blocked (fraud)'],
}

const StatusPill = ({ status }) => {
  const [cls, label] = REFERRAL_STATUS[status] || ['bg-gray-100 text-gray-600', status || 'Unknown']
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

// The wallet rows a single referral produced for THIS user. Shown inline under
// the relationship rather than in a separate ledger, because "who referred me"
// and "what did I get for it" are one question.
const ReferralTxns = ({ transactions }) => {
  if (!transactions?.length) {
    return (
      <p className='text-[11px] text-[#959595] mt-1.5'>
        No points credited yet — this happens when the referred user is approved.
      </p>
    )
  }
  return (
    <div className='mt-2 border-t border-gray-50 pt-2'>
      {transactions.map((t) => (
        <div key={t.id} className='flex justify-between gap-4 py-1'>
          <p className='text-[11px] text-[#757575]'>
            {t.description}
            <span className='text-gray-400'> · {getValidDateFormat(t.createdAt)}</span>
          </p>
          <p className={`text-[11px] font-semibold shrink-0 ${t.isCredit ? 'text-green-700' : 'text-red-600'}`}>
            {t.isCredit ? '+' : '−'}{t.points}
          </p>
        </div>
      ))}
    </div>
  )
}

// One person in a referral relationship. Never renders a bare id or "Unknown" —
// the backend resolves the name from firstName/lastName, which is where it
// actually lives for anyone who signed up through the OTP flow.
const PersonLine = ({ user, onOpenUser }) => {
  if (!user) return <p className='text-xs text-[#959595]'>Deleted user</p>
  return (
    <button onClick={() => onOpenUser(user.id)} className='text-left'>
      <p className='text-xs font-semibold text-[#454545] hover:text-[#ECC032]'>
        {user.name || 'Unnamed user'}
      </p>
      <p className='text-[11px] text-[#959595]'>
        {[user.phone, user.email].filter(Boolean).join(' · ') || 'No contact details'}
      </p>
    </button>
  )
}

// ── Referrals — a MARKETING record, not the wallet ──────────────────────────
// Who brought this person in, and who they have brought in since, in both
// directions (meaningless apart). A referral is one SOURCE of wallet points; the
// small credit note under each relationship shows what THAT referral produced.
// The account itself — every credit and debit — lives in the Wallet section
// below, because a wallet is the user's account and referral is only one of the
// things that feeds it.
const ReferralSection = ({ referrals, onOpenUser }) => (
  <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
    <div className='flex items-center justify-between gap-3 mb-3'>
      <p className='font-semibold text-sm'>Referrals</p>
      <span className='text-[10px] uppercase tracking-tight text-[#bdbdbd] font-semibold'>Marketing</span>
    </div>

    {!referrals ? (
      <p className='text-xs text-[#959595]'>Referral details could not be loaded.</p>
    ) : (
      <>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
          <div>
            <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>Their code</p>
            <p className='text-xs font-mono text-[#454545]'>
              {referrals.code?.code || '—'}
              {referrals.code && referrals.code.status !== 'active' && (
                <span className='text-[10px] text-amber-700 font-sans'> (inactive)</span>
              )}
            </p>
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>Referred by them</p>
            <p className='text-xs text-[#454545]'>{referrals.totals?.referralsMade ?? 0}</p>
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>Completed</p>
            <p className='text-xs text-[#454545]'>
              {referrals.totals?.completed ?? 0}
              {referrals.totals?.pending ? (
                <span className='text-amber-700'> · {referrals.totals.pending} pending</span>
              ) : null}
            </p>
          </div>
          <div>
            <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>Referral points</p>
            <p className='text-xs text-[#454545]'>{referrals.totals?.pointsFromReferrals ?? 0}</p>
          </div>
        </div>

        {/* A code is only minted and switched on when the profile is approved,
            so an inactive one here is expected on a pending user rather than a
            fault worth chasing. */}
        {referrals.code && referrals.code.status !== 'active' && (
          <p className='text-[11px] text-[#757575] mb-3'>
            Their code is inactive — it is switched on when the profile is approved, and
            cannot be used by anyone until then.
          </p>
        )}

        <div className='border-t border-gray-50 pt-3 mb-3'>
          <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold mb-2'>
            Referred by
          </p>
          {referrals.referredBy ? (
            <div className='border border-gray-100 rounded-md p-3'>
              <div className='flex items-start justify-between gap-3'>
                <PersonLine user={referrals.referredBy.referrer} onOpenUser={onOpenUser} />
                <StatusPill status={referrals.referredBy.status} />
              </div>
              <p className='text-[11px] text-[#959595] mt-1.5'>
                Used code <span className='font-mono'>{referrals.referredBy.referralCode}</span>
                {' · signed up '}{getValidDateFormat(referrals.referredBy.signedUpAt)}
                {referrals.referredBy.completedAt
                  ? ` · credited ${getValidDateFormat(referrals.referredBy.completedAt)}`
                  : ' · not credited yet'}
              </p>
              <ReferralTxns transactions={referrals.referredBy.walletTransactions} />
            </div>
          ) : (
            <p className='text-xs text-[#959595]'>Signed up without a referral code.</p>
          )}
        </div>

        <div className='border-t border-gray-50 pt-3'>
          <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold mb-2'>
            People they referred
          </p>
          {referrals.referralsMade?.length ? (
            <div className='grid gap-2'>
              {referrals.referralsMade.map((r) => (
                <div key={r.referralId} className='border border-gray-100 rounded-md p-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <PersonLine user={r.referee} onOpenUser={onOpenUser} />
                    <StatusPill status={r.status} />
                  </div>
                  <p className='text-[11px] text-[#959595] mt-1.5'>
                    Signed up {getValidDateFormat(r.signedUpAt)}
                    {r.completedAt
                      ? ` · credited ${getValidDateFormat(r.completedAt)}`
                      : ' · waiting on their approval'}
                    {r.pointsEarned ? ` · ${r.pointsEarned} points earned` : ''}
                  </p>
                  <ReferralTxns transactions={r.walletTransactions} />
                </div>
              ))}
            </div>
          ) : (
            <p className='text-xs text-[#959595]'>They have not referred anyone yet.</p>
          )}
        </div>
      </>
    )}
  </div>
)

// ── Wallet — the user's points ACCOUNT, like a bank statement ───────────────
// A wallet belongs to one user (a unique id, keyed by userId) and is created the
// moment they become active. Points are earned by several means (referral is
// one) — each earning is a CREDIT — and spent on bookings — each a DEBIT. This
// section shows the balance and the full ledger, so an admin reads it the way
// the user does: what is in the account, and every movement that got it there.
const WalletStat = ({ label, value, hint }) => (
  <div className='bg-[#fafafa] border border-gray-100 rounded-md px-3 py-2.5'>
    <p className='text-lg font-semibold my-0'>{value}</p>
    <p className='text-[11px] my-0 text-[#757575]'>{label}</p>
    {hint ? <p className='text-[10px] my-0 text-[#bdbdbd]'>{hint}</p> : null}
  </div>
)

const WalletSection = ({ wallet, ownerName }) => {
  const w = wallet?.wallet || {}
  const txns = wallet?.transactions || []
  return (
    <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
      <div className='flex items-center justify-between gap-3 mb-1'>
        <p className='font-semibold text-sm'>Wallet</p>
        <span className='text-[10px] uppercase tracking-tight text-[#bdbdbd] font-semibold'>Points account</span>
      </div>
      <p className='text-[11px] text-[#959595] mb-3'>
        Belongs to <span className='font-semibold text-[#757575]'>{ownerName || 'this user'}</span>
        {w.id
          ? <span className='font-mono'> · {w.id}</span>
          : ' · no wallet yet — created when the profile is approved'}
        {w.status === false && <span className='text-amber-700'> · inactive</span>}
      </p>

      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4'>
        <WalletStat label='Available points' value={w.walletPoints ?? 0} />
        <WalletStat label='Points used' value={w.walletPointsUsed ?? 0} hint='spent on bookings' />
        <WalletStat label='From referrals' value={w.referralPoints ?? 0} hint='of points earned' />
      </div>

      <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold mb-2'>
        Transactions
      </p>
      {txns.length ? (
        <div>
          {txns.map((t) => (
            <div key={t.id} className='flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0'>
              <div className='min-w-0'>
                <p className='text-[11px] text-[#454545] my-0 truncate'>{t.description || 'Wallet transaction'}</p>
                <p className='text-[10px] text-gray-400 my-0'>
                  {getValidDateFormat(t.createdAt)}
                  {t.referenceType ? ` · ${t.referenceType}` : ''}
                </p>
              </div>
              <p className={`text-xs font-semibold shrink-0 ${t.isCredit ? 'text-green-700' : 'text-red-600'}`}>
                {t.isCredit ? '+' : '−'}{t.points}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className='text-xs text-[#959595]'>No wallet activity yet.</p>
      )}
    </div>
  )
}

const Card = ({ title, status, children, actions }) => (
  <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
    <div className='flex items-center justify-between gap-3 mb-3'>
      <p className='font-semibold text-sm'>{title}</p>
      {status && (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_PILL[status] || DOC_PILL.missing}`}>
          {DOC_LABEL[status] || status}
        </span>
      )}
    </div>
    {children}
    {actions}
  </div>
)

// Segments the page into labelled groups so a reviewer scans by section —
// Identity, Profile, Documents, Referrals, Wallet, Decision — rather than one
// undifferentiated scroll.
const SectionHeading = ({ children, hint }) => (
  <div className='flex items-baseline gap-2 mt-6 mb-2 px-1'>
    <p className='text-[11px] uppercase tracking-wide text-[#454545] font-bold my-0'>{children}</p>
    {hint ? <p className='text-[11px] text-[#bdbdbd] my-0'>{hint}</p> : null}
  </div>
)

// ────────────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams()
  // Must be called before the early returns below — React requires hooks in the
  // same order on every render, and `if (loading) return …` sits between here
  // and where `mayDecide` is used.
  //
  // A PERMISSION, not a role: `useCan` asks the server-filtered navigation
  // payload whether this principal holds the key, so a role being renamed
  // cannot silently change what this screen offers.
  const mayDecide = useCan('operations.users.update')
  const router = useRouter()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [dialog, setDialog] = useState(null) // 'reject' | 'suspend'
  const [reason, setReason] = useState('')
  const [referrals, setReferrals] = useState(null)
  const [wallet, setWallet] = useState(null)

  // Referrals and wallet load alongside the profile but are NOT allowed to
  // break it: a referral lookup failing must not blank out the review screen an
  // admin came here to use. Hence Promise.allSettled and the null defaults.
  // The four-section chain, read from the server rather than recomputed here.
  const [chain, setChain] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [profile, referrals, wallet, chainRes] = await Promise.allSettled([
        coreApi().get(`/admin/user-verification/${id}`),
        coreApi().get(`/admin/wallet/user/${id}/referrals`),
        coreApi().get(`/admin/wallet/user/${id}`),
        coreApi().get(`/admin/user-verification/${id}/sections`),
      ])
      if (profile.status === 'rejected') throw profile.reason
      setData(profile.value.data)
      setReferrals(referrals.status === 'fulfilled' ? referrals.value.data : null)
      setWallet(wallet.status === 'fulfilled' ? wallet.value.data : null)
      // allSettled, like the others: a chain that fails to load must not blank
      // the review screen an admin came here to use. It leaves Approve
      // unavailable, which is the safe direction — the server would refuse it
      // anyway, and the page says why below.
      setChain(chainRes.status === 'fulfilled' ? chainRes.value.data : null)
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load this user')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (id) load() }, [id])

  const act = async (label, fn) => {
    setBusy(label)
    try {
      await fn()
      setDialog(null)
      setReason('')
      await load()
    } catch (error) {
      ErrorToast(error?.response?.data?.error || `Could not ${label}`)
    } finally { setBusy(null) }
  }

  const approve = () => {
    if (!window.confirm('Approve this user? Their profile becomes active and they can book rides.')) return
    act('approve', async () => {
      await coreApi().post(`/admin/user-verification/${id}/approve`)
      InfoToast('Profile approved — the user is now active')
    })
  }

  const submitReject = () => {
    if (!reason.trim()) { ErrorToast('Give a reason — the user sees this and needs to know what to fix'); return }
    act('reject', async () => {
      await coreApi().post(`/admin/user-verification/${id}/reject`, { reason: reason.trim() })
      InfoToast('Profile rejected — the user can update and resubmit')
    })
  }

  const submitSuspend = () => {
    if (!reason.trim()) { ErrorToast('Give a reason — it is recorded against the account'); return }
    act('suspend', async () => {
      await coreApi().post(`/admin/user-verification/${id}/suspend`, { suspended: true, reason: reason.trim() })
      InfoToast('Account suspended')
    })
  }

  const reactivate = () => {
    if (!window.confirm('Reactivate this account? The profile returns to active.')) return
    act('reactivate', async () => {
      await coreApi().post(`/admin/user-verification/${id}/suspend`, { suspended: false })
      InfoToast('Account reactivated')
    })
  }

  // Re-runs the provider lookup. Worth an explicit action: the check at
  // submission time may have returned UNCHECKED because the provider was down,
  // and re-checking beats rejecting a legitimate user.
  const recheck = (type) => act(`re-check ${type}`, async () => {
    const res = await coreApi().post(`/admin/user-verification/${id}/recheck/${type}`)
    const providerStatus = res.data?.result?.status
    InfoToast(providerStatus === 'UNCHECKED'
      ? 'Provider did not respond — try again shortly'
      : `Provider says: ${providerStatus}`)
  })

  // A document decision moves the DOCUMENT and nothing else. The profile's own
  // status is only ever changed by Approve or Reject below, so the toast points
  // at that remaining step rather than announcing an outcome that hasn't
  // happened. The response's `readyToApprove` says whether Approve would now
  // succeed.
  const profileNote = (res) =>
    res?.complete ? ' — every section is verified, this profile is ready to approve' : ''

  // THREE DECISIONS, NOT A BOOLEAN — see the server's verificationSections.js.
  //
  // The old call took `{verified: true|false}`, and `false` was recorded as a
  // REJECTION carrying the filler reason "Verification withdrawn by admin". So
  // an admin undoing a mis-click sent the user a rejection they then had to act
  // on. Unverify is now its own decision and tells the user nothing, because
  // nothing has been decided about them.
  //
  // `section` is the chain key (aadhaar | licence | kycCheck | photoMatch), not
  // the document type — the same vocabulary the gate and the server's refusal
  // message use, so all three say the same words.
  const decide = (section, decision, label) => {
    let reason = null
    if (decision === 'rejected') {
      const why = window.prompt(`Why is the ${label.toLowerCase()} not acceptable? The user sees this.`)
      if (why === null) return undefined
      if (!why.trim()) { ErrorToast('A reason is required'); return undefined }
      reason = why.trim()
    }
    return act(`${decision} ${section}`, async () => {
      const res = await coreApi().post(
        `/admin/user-verification/${id}/section/${section}`, { decision, reason },
      )
      const done = { verified: 'verified', unverified: 'moved back to pending', rejected: 'rejected' }[decision]
      InfoToast(`${label} ${done}` + (decision === 'verified' ? profileNote(res.data) : ''))
    })
  }

  if (loading) return <div className='max-w-5xl mx-auto p-8 text-sm text-[#757575]'>Loading…</div>

  if (!data) {
    return (
      <div className='max-w-5xl mx-auto p-8'>
        <p className='text-sm text-[#757575]'>This user could not be found.</p>
        <button onClick={() => router.push('/dashboard/users')}
          className='mt-3 text-sm font-semibold text-[#454545]'>← Back to customers</button>
      </div>
    )
  }

  const u = data.user || {}
  const docs = data.documents || {}
  const nameMatch = data.nameMatch || {}
  const licence = docs.licence
  const aadhaar = docs.aadhaar

  const status = u.verificationStatus || 'incomplete'
  // TWO gates, and they answer different questions.
  //   allowedActions(status) — is this action valid FROM THIS STATE? (you
  //     cannot approve an already-active profile)
  //   can('users','update')  — may THIS ADMIN take it at all?
  // Both must pass. Before this, an Agent on the Operations team saw Approve,
  // Reject and Suspend, clicked one, and got a 403 — the same "learn your
  // access by collecting errors" problem as the nav, one level down.
  const byStatus = allowedActions(status)
  const can = {
    approve: byStatus.approve && mayDecide,
    reject: byStatus.reject && mayDecide,
    suspend: byStatus.suspend && mayDecide,
    reactivate: byStatus.reactivate && mayDecide,
  }
  // ── The gate is READ FROM THE SERVER, never recomputed here ───────────────
  //
  // This used to mirror the backend's conditions in local code — two documents,
  // hardcoded. Every time the gate changed, this copy had to change with it, and
  // when it didn't the screen and the server disagreed about why Approve was
  // disabled: the button greys out and the page explains a reason that is no
  // longer the real one. The chain now comes from
  // GET /admin/user-verification/:id/sections and the server's own refusal
  // message is built from the same list, so they cannot drift.
  //
  // `chain` is null only while loading; treat that as "not ready" rather than
  // "ready", or Approve flashes enabled on every page load.
  const sections = chain?.sections || []
  const chainComplete = !!chain?.complete
  const outstanding = (chain?.outstanding || [])
  const sectionOf = (key) => sections.find((sec) => sec.key === key)
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name

  // Re-reads the stored SCAN through OCR. Available for both documents, and
  // distinct from `recheck`, which re-queries the licence registry by number.
  const reRunOcr = (kind) => act(`re-read ${kind}`, async () => {
    const res = await coreApi().post(`/admin/user-verification/${id}/ocr/${kind}`)
    const s = res.data?.status
    InfoToast(s === 'VALID'
      ? 'Document re-read successfully'
      : res.data?.message || `OCR result: ${s}`)
  })

  // Every one of these is a `users.update` on the server, including the two
  // re-check buttons — they re-query a provider and write the result. A
  // view-only admin gets the document cards and the scans, and no action row at
  // all rather than a row of buttons that 403.
  // ONE ACTION ROW FOR ALL FOUR SECTIONS.
  //
  // Verify / Unverify / Reject, offered only where the transition means
  // something: no Verify on something already verified, no Unverify on
  // something that was never verified. Buttons that do nothing teach people to
  // stop reading them.
  //
  // Unverify is neutral, not destructive — it is a correction, and colouring it
  // red would make the safe direction look like the dangerous one. Reject is the
  // one that reaches the user, so it is the one in red.
  const SectionActions = ({ sectionKey, label, extra = null }) => {
    if (!mayDecide) return null
    const sec = sectionOf(sectionKey)
    const st = sec?.status
    // 'missing' means nothing has been submitted — there is nothing to decide
    // on yet, and offering Verify would let an admin approve an absence.
    const submitted = st && st !== 'missing'
    return (
      <div className='flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-50'>
        {extra}
        {submitted && st !== 'verified' && (
          <button disabled={!!busy} onClick={() => decide(sectionKey, 'verified', label)}
            className='text-xs font-semibold border border-green-200 text-green-700 px-3 py-1.5 rounded-md disabled:opacity-50'>
            Mark verified
          </button>
        )}
        {st === 'verified' && (
          <button disabled={!!busy} onClick={() => decide(sectionKey, 'unverified', label)}
            className='text-xs font-semibold border border-gray-200 text-[#454545] px-3 py-1.5 rounded-md disabled:opacity-50'>
            Unverify
          </button>
        )}
        {submitted && st !== 'rejected' && (
          <button disabled={!!busy} onClick={() => decide(sectionKey, 'rejected', label)}
            className='text-xs font-semibold border border-red-200 text-red-600 px-3 py-1.5 rounded-md disabled:opacity-50'>
            Reject
          </button>
        )}
        {!submitted && (
          <p className='text-[11px] text-[#959595] self-center'>
            Nothing submitted yet — there is nothing to decide on.
          </p>
        )}
      </div>
    )
  }

  // The OCR / registry re-checks. They belong to the document cards only, so
  // they are passed into the shared row as `extra` rather than living in it.
  // Every one is a `users.update` on the server — including the re-checks, which
  // re-query a provider and write the result — so a view-only admin gets the
  // scans and no action row at all rather than buttons that 403.
  const docExtras = (type, doc) => (
    <>
      {/* type is the API's document key: 'kyc' for Aadhaar, 'licence'. */}
      <button disabled={!!busy} onClick={() => reRunOcr(type === 'kyc' ? 'aadhaar' : 'licence')}
        className='text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-md disabled:opacity-50'>
        {type === 'kyc' ? 'Re-read front (OCR)' : 'Re-read scan (OCR)'}
      </button>
      {/* Aadhaar's back is a distinct scan (the address side), read into its own
          columns, so it gets its own re-read. */}
      {type === 'kyc' && doc?.backImageKey && (
        <button disabled={!!busy} onClick={() => reRunOcr('aadhaar-back')}
          className='text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-md disabled:opacity-50'>
          Re-read back (OCR)
        </button>
      )}
      {type === 'licence' && (
        <button disabled={!!busy} onClick={() => recheck(type)}
          className='text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-md disabled:opacity-50'>
          Re-check registry
        </button>
      )}
    </>
  )

  const docRow = (type, doc) => (
    <SectionActions
      sectionKey={type === 'kyc' ? 'aadhaar' : 'licence'}
      label={type === 'kyc' ? 'Aadhaar' : 'Driving licence'}
      extra={docExtras(type, doc)}
    />
  )

  return (
    <div className='max-w-5xl mx-auto pb-10'>
      <button onClick={() => router.push('/dashboard/users')}
        className='text-sm font-semibold text-[#454545] mt-4 mb-3'>← Back to customers</button>

      {/* ── 1. Identity, id and current status ── */}
      <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
        <div className='flex flex-wrap items-start gap-4'>
          {u.profilePhoto
            ? <img src={photoUrl(u.profilePhoto)} alt='' className='w-16 h-16 rounded-full object-cover' />
            : <div className='w-16 h-16 rounded-full bg-gray-200' />}
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <p className='font-semibold text-lg capitalize'>
                {fullName || <span className='text-[#959595]'>No name</span>}
              </p>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[status] || STATUS_PILL.incomplete}`}>
                {STATUS_LABEL[status] || status}
              </span>
              {u.isSearchable && (
                <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700'>
                  searchable
                </span>
              )}
            </div>
            <p className='text-[11px] text-[#959595] mt-1 font-mono break-all'>{u.id}</p>
            <p className='text-xs text-[#757575] mt-1'>{STATUS_MEANING[status]}</p>
          </div>
        </div>

        {status === 'suspended' && (
          <div className='mt-4 bg-orange-50 border-l-2 border-orange-400 px-3 py-2'>
            <p className='text-[11px] text-orange-800'>
              <span className='font-semibold'>Suspended
                {u.suspendedAt && ` ${new Date(u.suspendedAt).toLocaleDateString()}`} · </span>
              {u.suspensionReason || 'No reason recorded'}
            </p>
          </div>
        )}
        {/* This is not a first submission. Without it a resubmitted profile
            arrives looking brand new — same queue position, no sign it has been
            seen before, and no record of what it was turned down for. */}
        {(u.verificationAttempts > 1 || u.previousRejectionReason) && status !== 'rejected' && (
          <div className='bg-amber-50 border-l-2 border-amber-400 rounded-md px-4 py-3 mb-3'>
            <p className='text-xs font-semibold text-amber-800'>
              Resubmission{u.verificationAttempts ? ` — attempt ${u.verificationAttempts}` : ''}
            </p>
            {u.previousRejectionReason && (
              <p className='text-xs text-amber-800 mt-1'>
                <span className='font-semibold'>Previously rejected</span>
                {u.previousRejectedAt && ` on ${getValidDateFormat(u.previousRejectedAt)}`}:
                {' '}{u.previousRejectionReason}
              </p>
            )}
            <p className='text-[11px] text-[#757575] mt-1'>
              Check whether what you asked for has actually changed.
            </p>
          </div>
        )}

        {status === 'rejected' && u.verificationRejectionReason && (
          <div className='mt-4 bg-red-50 border-l-2 border-red-400 px-3 py-2'>
            <p className='text-[11px] text-red-800'>
              <span className='font-semibold'>Rejected · </span>{u.verificationRejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* ── 2. Entered details ── */}
      <SectionHeading hint='What the user entered, and the automated name match'>
        Profile
      </SectionHeading>
      <Card title='Profile details'>
        <div className='grid md:grid-cols-2 gap-x-8'>
          <Row label='Name' value={fullName} />
          <Row label='Date of birth' value={u.dateOfBirth} />
          <Row label='Email' value={u.email} />
          <Row label='Phone' value={[u.countryCode, u.contactNumber].filter(Boolean).join(' ')} />
          <Row label='Address' value={u.address} />
          <Row label='City / State' value={[u.city, u.state].filter(Boolean).join(', ')} />
          <Row label='PIN code' value={u.pincode} />
          <Row label='Joined' value={u.createdAt ? getValidDateFormat(u.createdAt) : null} />
          <Row label='Submitted' value={u.verificationSubmittedAt
            ? new Date(u.verificationSubmittedAt).toLocaleString() : null} />
        </div>

        {/* Name matching across every document — the main automated signal. */}
        {nameMatch.compared?.length > 0 && (
          <div className={`mt-4 rounded-md px-4 py-3 border-l-2 ${
            nameMatch.matched ? 'bg-green-50 border-green-400' : 'bg-amber-50 border-amber-400'}`}>
            <p className={`text-xs font-semibold ${nameMatch.matched ? 'text-green-800' : 'text-amber-800'}`}>
              {nameMatch.summary}
            </p>
            {Object.entries(nameMatch.comparisons || {}).map(([source, c]) => (
              <p key={source} className='text-[11px] text-[#454545] mt-1'>
                <span className='uppercase font-semibold text-[#757575]'>{source}</span>{' '}
                <span className={c.matched ? 'text-green-700' : 'text-red-600'}>{c.matched ? '✓' : '✕'}</span>{' '}
                {c.firstName?.a} {c.lastName?.a} vs {c.firstName?.b} {c.lastName?.b}
                {!c.matched && <span className='text-red-600'> — {c.reason}</span>}
              </p>
            ))}
          </div>
        )}
      </Card>

      {/* ── 3. Identity documents ── */}
      <SectionHeading hint='Extracted values, the scans, and each document’s own status'>
        Identity documents
      </SectionHeading>

      {/* Driving licence */}
      <Card title='Driving licence' status={licence?.status || 'missing'}
        actions={docRow('licence', licence)}>
        {licence ? (
          <>
            <div className='grid md:grid-cols-2 gap-x-8'>
              <Row label='Licence number' value={licence.licenceNumber} />
              <Row label='Name on licence' value={licence.holderName} />
              <Row label='Date of birth' value={licence.dateOfBirth} />
              <Row label='Issued' value={licence.issuedDate} />
              <Row label='Expires' value={licence.expiryDate} />
              <Row label='Provider verdict' value={licence.providerStatus || 'Not checked'} />
            </div>
            {licence.expiryDate && new Date(licence.expiryDate) < new Date() && (
              <p className='text-[11px] text-red-600 font-semibold mt-2'>
                This licence expired on {licence.expiryDate}.
              </p>
            )}
            {licence.rejectionReason && (
              <p className='text-[11px] text-red-700 mt-2'>
                <span className='font-semibold'>Rejected · </span>{licence.rejectionReason}
              </p>
            )}
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4'>
              <DocumentThumb src={licence.frontImageKey} label='Licence (front)' />
              <DocumentThumb src={licence.backImageKey} label='Licence (back)' />
            </div>
            <OcrPanel ocr={licence.ocr} />
          </>
        ) : (
          <p className='text-xs text-[#959595]'>The user has not uploaded a driving licence.</p>
        )}
      </Card>

      {/* Aadhaar — two faces, each read separately: the front carries the
          number/name/DOB, the back the address. */}
      <Card title='Aadhaar' status={aadhaar?.status || 'missing'}
        actions={docRow('kyc', aadhaar)}>
        {aadhaar ? (
          <>
            <div className='grid md:grid-cols-2 gap-x-8'>
              <Row label='Aadhaar number' value={aadhaar.documentNumber} masked />
              <Row label='Name on Aadhaar' value={aadhaar.holderName} />
              <Row label='OTP verified' value={aadhaar.referenceId ? 'Yes' : 'No'} />
              <Row label='Provider verdict' value={aadhaar.providerStatus || 'Not checked'} />
            </div>
            {aadhaar.rejectionReason && (
              <p className='text-[11px] text-red-700 mt-2'>
                <span className='font-semibold'>Rejected · </span>{aadhaar.rejectionReason}
              </p>
            )}
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4'>
              <DocumentThumb src={aadhaar.imageKey} label='Aadhaar (front)' />
              <DocumentThumb src={aadhaar.backImageKey} label='Aadhaar (back)' />
            </div>
            {/* The front reads the number/name/DOB; the back reads the address.
                Both are OCR'd, so both verdicts are shown. */}
            <OcrPanel ocr={aadhaar.ocr} title='Front OCR' />
            <OcrPanel ocr={aadhaar.ocrBack} title='Back OCR (address)' />
            {aadhaar.backImageKey && !aadhaar.ocrBack && (
              <p className='text-[11px] text-[#959595] mt-2'>
                The back of the Aadhaar has not been read yet — use “Re-read back (OCR)” below.
              </p>
            )}
            {!aadhaar.imageKey && (
              <p className='text-[11px] text-[#959595] mt-2'>
                No scan attached — the number was verified by OTP only.
              </p>
            )}
          </>
        ) : (
          <p className='text-xs text-[#959595]'>The user has not verified their Aadhaar.</p>
        )}
      </Card>

      {/* ── KYC verification — a DIFFERENT question from the Aadhaar card ──
          The card above is "is this scan real and does it match the profile".
          This is "is this person's identity established", which the Aadhaar OTP
          normally answers on its own. When the OTP could not run — a provider
          outage, or the development bypass — it stays pending until an admin
          says otherwise, and this is where they say it. */}
      <Card title='KYC verification' status={sectionOf('kycCheck')?.status}
        actions={<SectionActions sectionKey='kycCheck' label='KYC' />}>
        {aadhaar?.otpVerified ? (
          <p className='text-xs text-green-700'>
            The Aadhaar OTP was verified — the holder proved control of the mobile number
            registered against this Aadhaar. Nothing further is needed here.
          </p>
        ) : (
          <p className='text-xs text-amber-700'>
            No Aadhaar OTP is recorded against this profile. That is not necessarily the
            user&apos;s fault — the provider may have been unreachable, or the development
            bypass may be on. Verify here only if you have established their identity
            another way.
          </p>
        )}
        {sectionOf('kycCheck')?.reason && (
          <p className='text-xs text-red-600 mt-2'>{sectionOf('kycCheck').reason}</p>
        )}
        <p className='text-[11px] text-[#959595] mt-2'>
          A decision here overrides the OTP in both directions — including unverifying a
          profile whose OTP passed.
        </p>
      </Card>

      {/* Faces first: it is the check most likely to fail a submission, and the
          one that used to require opening three lightboxes in turn.
          It had no DECISION attached — a reviewer could compare the three faces
          and had nowhere to record what they concluded. */}
      <Card title='Photo / identity match' status={sectionOf('photoMatch')?.status}
        actions={<SectionActions sectionKey='photoMatch' label='Photo match' />}>
        <p className='text-xs text-[#757575] mb-3'>
          Is the live selfie the same person as the photos printed on the Aadhaar and the
          licence? Every document can be genuine and still belong to somebody else — this
          is the only check that looks at the three faces together.
        </p>
        <FaceCompare
          selfie={u.profilePhoto}
          aadhaarFront={aadhaar?.imageKey}
          licenceFront={licence?.frontImageKey}
        />
        {sectionOf('photoMatch')?.reason && (
          <p className='text-xs text-red-600 mt-2'>{sectionOf('photoMatch').reason}</p>
        )}
      </Card>

      {/* ── 4. Referrals (marketing) ── */}
      <SectionHeading hint='Who brought them in, who they have brought in'>
        Referrals
      </SectionHeading>
      <ReferralSection
        referrals={referrals}
        onOpenUser={(uid) => router.push(`/dashboard/users/${uid}`)}
      />

      {/* ── 5. Wallet (the user's points account) ── */}
      <SectionHeading hint='Balance and every credit / debit — points earned and spent'>
        Wallet
      </SectionHeading>
      <WalletSection wallet={wallet} ownerName={fullName} />

      {/* ── 6. The decision ── */}
      <SectionHeading>Decision</SectionHeading>
      <div className='bg-white border border-gray-100 rounded-md p-5'>
        {status === 'pending' && (
          chainComplete ? (
            <p className='text-xs text-green-700 font-semibold mb-3'>
              Every verification section is complete — this profile is ready to approve.
              It stays pending until you press Approve.
            </p>
          ) : (
            <div className='mb-3'>
              <p className='text-xs text-amber-700 font-semibold'>
                Approve is unavailable until every section is verified.
              </p>
              <ul className='mt-1.5 ml-4 list-disc'>
                {outstanding.map((o) => (
                  <li key={o} className='text-[11px] text-[#757575]'>{o}</li>
                ))}
              </ul>
              <p className='text-[11px] text-[#757575] mt-1.5'>
                Verify each section above, then approve here — verifying one does not
                activate the profile on its own. Reject with a reason if the details
                don&apos;t match.
              </p>
              {/* A profile reaches this queue as soon as the user finishes the
                  wizard, whether or not the automatic checks passed. An OCR or
                  Aadhaar-OTP failure is not the user's fault and is exactly what
                  this screen is for — so say so, rather than letting the amber
                  document pills read as the user's mistake. */}
              <p className='text-[11px] text-[#757575] mt-1.5'>
                A document that failed automatic verification arrives here unverified. Read
                the scans and decide.
              </p>
            </div>
          )
        )}

        {/* Withdrawing an approval. Kept distinct from Suspend, which is an
            access ban for misconduct and means something quite different to the
            user. */}
        {status === 'active' && (
          <p className='text-xs text-[#757575] mb-3'>
            This profile is approved and can book. Reject it if the approval has to be
            withdrawn — the user is told why and can correct and resubmit. Suspend instead
            to block sign-in entirely.
          </p>
        )}

        <div className='flex flex-wrap gap-2'>
          {can.approve && bothVerified && (
            <button disabled={!!busy} onClick={approve}
              className='text-sm font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md disabled:opacity-50'>
              {busy === 'approve' ? '…' : 'Approve'}
            </button>
          )}
          {can.reject && (
            <button disabled={!!busy} onClick={() => { setDialog('reject'); setReason('') }}
              className='text-sm font-semibold border border-red-200 text-red-600 px-5 py-2 rounded-md disabled:opacity-50'>
              {status === 'active' ? 'Reject (withdraw approval)' : 'Reject'}
            </button>
          )}
          {can.suspend && (
            <button disabled={!!busy} onClick={() => { setDialog('suspend'); setReason('') }}
              className='text-sm font-semibold border border-orange-200 text-orange-700 px-5 py-2 rounded-md disabled:opacity-50'>
              Suspend
            </button>
          )}
          {can.reactivate && (
            <button disabled={!!busy} onClick={reactivate}
              className='text-sm font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md disabled:opacity-50'>
              {busy === 'reactivate' ? '…' : 'Reactivate'}
            </button>
          )}
          {/* Read-only viewer: the state allows something, but this admin's level
              does not. Said explicitly, because an empty action bar otherwise
              looks like the screen failed to load its buttons. */}
          {!mayDecide && (byStatus.approve || byStatus.reject || byStatus.suspend || byStatus.reactivate) && (
            <p className='text-xs text-[#959595]'>
              You have view-only access to user verification. Ask a Super Admin if you
              need to approve or reject profiles.
            </p>
          )}
          {mayDecide && !can.approve && !can.reject && !can.suspend && !can.reactivate && (
            <p className='text-xs text-[#959595]'>
              No action available while this profile is <strong>{STATUS_LABEL[status]}</strong>.
              {status === 'incomplete' && ' The user has to finish onboarding first.'}
              {status === 'rejected' && ' The user has to correct their details and resubmit.'}
            </p>
          )}
        </div>
      </div>

      {/* Reject and suspend both need a mandatory reason, so they share a dialog. */}
      {dialog && (
        <Modal onClose={() => setDialog(null)} size='md' label='Confirm' className='p-5'>
          <div>
            <p className='font-semibold mb-1'>
              {dialog === 'reject' ? 'Reject' : 'Suspend'} {fullName || 'this account'}
            </p>
            <p className='text-xs text-[#757575] mb-4'>
              {dialog === 'reject'
                ? (status === 'active'
                  // Rejecting an approved profile takes booking away immediately,
                  // which is a bigger deal than turning down a new submission —
                  // don't let the same neutral sentence cover both.
                  ? 'This withdraws your approval. The user stops being able to book straight away, sees this reason, and can correct their details and resubmit.'
                  : 'The user sees this reason and can update their details and resubmit.')
                : 'Their documents and approval are kept — reactivating restores the account without a re-review. They cannot sign in while suspended.'}
            </p>

            <div className='flex flex-wrap gap-2 mb-3'>
              {(dialog === 'reject' ? REJECTION_REASONS : SUSPENSION_REASONS).map((r) => (
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
              placeholder={dialog === 'reject'
                ? 'Explain what the user needs to correct…'
                : 'Why is this account being suspended?'} />

            <div className='flex justify-end gap-3 mt-4'>
              <button onClick={() => setDialog(null)} className='text-sm font-semibold text-[#757575]'>
                Cancel
              </button>
              <button
                onClick={dialog === 'reject' ? submitReject : submitSuspend}
                disabled={!!busy || !reason.trim()}
                className={`text-white text-sm font-semibold px-5 py-2 rounded-md disabled:opacity-50 ${
                  dialog === 'reject' ? 'bg-red-600' : 'bg-orange-600'}`}>
                {busy ? 'Working…' : dialog === 'reject' ? 'Reject profile' : 'Suspend account'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <p className='text-[11px] text-[#959595] mt-3'>
        Aadhaar and PAN numbers are masked by the server — confirm them from the document scan.
        Only an <strong>active</strong> profile can book a ride.
      </p>
    </div>
  )
}
