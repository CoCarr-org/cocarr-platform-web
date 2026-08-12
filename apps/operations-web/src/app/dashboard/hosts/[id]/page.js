'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage, InfoToast, ErrorToast } from '@cocarr/notifications'
import { useCan } from '@cocarr/iam-sdk'
import { getValidDateFormat } from '@cocarr/shared-utils'
import {
  Explainer, Field, FieldGrid, LoadingBlock, Pill, SectionCard, Stat, StatRow,
} from '@/app/_components/ui'
import { DOC_LABEL, DOC_PILL } from '@/app/_helpers/userStatus'
import { useHost } from './_HostContext'

// Host overview — identity, what they are owed against, and how they are paid.
//
// ORDERED BY THE DECISION IT SUPPORTS. Ops opens a host record for one of three
// reasons: a payout is stuck, a ride went wrong, or a verification is being
// chased. So: ride record first (is this host a problem?), then verification
// (why is payout blocked?), then the payout account itself (where does the
// money go, and does the name match?).
//
// The previous version rendered three flat label/value grids and a bare table
// of old bank accounts, with the ACTIVE account and the dormant ones styled
// identically apart from a heading — on a screen whose whole purpose is
// deciding where money goes.

// A bank account is verified against the registry, and what comes back is the
// REAL holder name plus the provider's own verdict on how well it matches the
// name the host typed. A mismatch is the single strongest fraud signal on this
// screen, so it is called out rather than left for somebody to spot by reading
// two adjacent fields.
const NameMatch = ({ account }) => {
  // PREFER THE PROVIDER'S VERDICT. Cashfree returns `name_match_status` and a
  // score, stored on the row — a real comparison that tolerates initials,
  // ordering and honorifics. The string equality this used to do flags
  // "RAJESH KUMAR" against "Rajesh Kumar S" as fraud, which is a false alarm
  // on a screen whose whole job is to be believed.
  const status = String(account.nameMatchStatus || '').toUpperCase()
  if (status) {
    const score = account.nameMatchScore != null ? ` (${account.nameMatchScore})` : ''
    if (status.includes('NO_MATCH')) return <Pill tone='bad'>Name mismatch{score}</Pill>
    if (status.includes('PARTIAL')) return <Pill tone='warn'>Partial name match{score}</Pill>
    return <Pill tone='good'>Name matches{score}</Pill>
  }

  // Fallback for rows written before the provider fields were stored.
  const provided = (account.hostProvidedName || '').trim().toLowerCase()
  const actual = (account.accountHolderName || '').trim().toLowerCase()
  if (!provided || !actual) return null
  return provided === actual
    ? <Pill tone='good'>Name matches</Pill>
    : <Pill tone='bad'>Name mismatch</Pill>
}

const PayoutAccount = ({ account, dormant }) => (
  <div className={`rounded-md border p-4 ${dormant ? 'border-gray-100 bg-[#fafafa]' : 'border-gray-200 bg-white'}`}>
    <div className='flex items-center justify-between gap-3 mb-3 flex-wrap'>
      <div className='flex items-center gap-2 flex-wrap'>
        <p className='text-sm font-semibold text-[#1a1a1a]'>{account.bankName || 'Bank account'}</p>
        <Pill tone={dormant ? 'neutral' : 'good'}>{dormant ? 'Replaced' : 'Active'}</Pill>
        {/* Verified and MANUALLY verified are different facts: the first came
            back from a penny-drop against the registry, the second is an admin
            override. Money moves either way, so which one it was matters. */}
        {!dormant && (
          <Pill tone={account.isVerified ? 'good' : 'warn'}>
            {account.isVerified
              ? (account.isManuallyVerified ? 'Verified by admin' : 'Bank-verified')
              : 'Not verified'}
          </Pill>
        )}
        {!dormant && <NameMatch account={account} />}
        {/* Verified but not linked to the payment gateway = cannot actually be
            paid. Settlement resolves these ids, so without them a settlement
            fails at the transfer with the account looking perfectly fine. */}
        {!dormant && !account.razorpayContactId && (
          <Pill tone='warn'>Not linked for payout</Pill>
        )}
      </div>
      {account.createdAt && (
        <span className='text-[11px] text-[#959595]'>Added {getValidDateFormat(account.createdAt)}</span>
      )}
    </div>
    <FieldGrid cols={4}>
      <Field label='Account number' value={account.accountNumber} mono />
      <Field label='IFSC' value={account.ifscCode} mono />
      <Field label='Holder name (bank)' value={account.accountHolderName} />
      <Field label='Holder name (host typed)' value={account.hostProvidedName} />
      <Field label='Method' value={account.paymentMethod} />
      <Field label='UPI id' value={account.upiId} capitalize={false} />
      <Field label='City' value={account.city} />
      <Field label='Branch' value={account.branchName} />
    </FieldGrid>
  </div>
)

// What each host section is actually FOR. The label alone ("PAN") says what it
// is, not why a host is blocked on it — and "why" is what an admin arrives with.
const SECTION_HINT = {
  pan: 'The tax identity required to pay them at all',
  bank: 'Where settlements are sent',
  kycCheck: 'Who they are — shared with the rider profile',
}

// The answer first, the sections under it. Same shape as the user screen's, so
// the two read alike.
const HostVerdict = ({ chain, status }) => {
  const tone = status === 'verified' ? 'good'
    : status === 'rejected' ? 'bad'
      : chain?.complete ? 'ready' : 'warn'
  const skin = {
    good: 'border-green-100 bg-green-50 text-green-800',
    ready: 'border-green-100 bg-green-50 text-green-800',
    warn: 'border-amber-100 bg-amber-50 text-amber-800',
    bad: 'border-red-100 bg-red-50 text-red-800',
  }[tone]
  const label = status === 'verified' ? 'Host verified'
    : status === 'rejected' ? 'Host rejected'
      : chain?.complete ? 'Ready to verify' : 'Host not verified'
  const detail = status === 'verified' ? 'PAN, bank and KYC are all verified — payouts can run.'
    : status === 'rejected' ? 'This host was rejected. They are shown the reason below.'
      : chain?.complete ? 'Every section is verified. Press Verify host below to allow payouts.'
        : `${(chain?.outstanding || []).join(' · ') || 'Nothing submitted yet'}.`
  return (
    <div className={`rounded-md border px-4 py-3 ${skin}`}>
      <p className='text-sm font-semibold'>{label}</p>
      <p className='text-xs mt-0.5 opacity-90'>{detail}</p>
    </div>
  )
}

export default function HostOverview() {
  const { id } = useParams()
  const { host, loading, reload } = useHost()

  // Commission is per-host and versioned (start/end dated), so what a host is
  // actually on cannot be read off the host row. It is its own admin endpoint.
  const [commissions, setCommissions] = useState([])
  const [commissionError, setCommissionError] = useState('')

  // The PAN + bank + KYC chain. Read from the server rather than derived here,
  // so this screen and the gate that refuses a Verify quote the same list.
  const [chain, setChain] = useState(null)
  const [chainError, setChainError] = useState('')
  const [busy, setBusy] = useState('')

  // A PERMISSION, not a role — and `payouts`, not `users`: this screen decides
  // whether somebody can be PAID, which is a finance judgement. The team that
  // reviews a driving licence is not necessarily the team that should be
  // clearing a bank account, and the server gates these routes the same way.
  const mayDecide = useCan('operations.payouts.update')

  const loadChain = useCallback(async () => {
    if (!id) return
    try {
      const res = await coreApi().get(`/admin/host-verification/${id}`)
      setChain(res.data)
      setChainError('')
    } catch (e) {
      // Soft, like the commission load: a chain that will not load must not
      // blank the payout details somebody came here to read. It leaves Verify
      // unavailable, which is the safe direction.
      setChain(null)
      setChainError(apiErrorMessage(e, 'Verification status could not be loaded.'))
    }
  }, [id])

  useEffect(() => { loadChain() }, [loadChain])

  const run = async (label, fn) => {
    setBusy(label)
    try {
      await fn()
      await loadChain()
      await reload?.()
    } catch (e) {
      ErrorToast(apiErrorMessage(e, `Could not ${label}`))
    } finally { setBusy('') }
  }

  // Verify / Unverify / Reject on ONE section. Same three decisions and the same
  // vocabulary as the user screen and the server.
  const decideSection = (sectionKey, decision, label) => {
    let reason = null
    if (decision === 'rejected') {
      const why = window.prompt(`Why is the ${label.toLowerCase()} not acceptable? The host sees this.`)
      if (why === null) return undefined
      if (!why.trim()) { ErrorToast('A reason is required'); return undefined }
      reason = why.trim()
    }
    return run(`${decision} ${sectionKey}`, async () => {
      await coreApi().post(`/admin/host-verification/${id}/section/${sectionKey}`, { decision, reason })
      const done = { verified: 'verified', unverified: 'moved back to pending', rejected: 'rejected' }[decision]
      InfoToast(`${label} ${done}`)
    })
  }

  // The host-level decision, deliberately separate from the sections.
  const hostDecision = (decision) => {
    let reason = null
    if (decision === 'rejected') {
      const why = window.prompt('Why is this host being rejected? They are shown this.')
      if (why === null) return undefined
      if (!why.trim()) { ErrorToast('A reason is required'); return undefined }
      reason = why.trim()
    }
    if (decision === 'verified'
      && !window.confirm('Verify this host? Payouts to them can run once verified.')) return undefined
    return run(decision, async () => {
      await coreApi().post(`/admin/host-verification/${id}/decision`, { decision, reason })
      InfoToast({
        verified: 'Host verified — payouts can run',
        unverified: 'Host moved back to pending — payouts are on hold',
        rejected: 'Host rejected — they are shown the reason',
      }[decision])
    })
  }

  // Offered only where the transition means something, and Unverify is neutral
  // rather than red: it is a correction, not a decision against the host.
  const SectionActions = ({ sec }) => {
    if (!mayDecide) return null
    const submitted = sec.status && sec.status !== 'missing'
    if (!submitted) {
      return (
        <p className='text-[11px] text-[#959595] mt-3'>
          Nothing submitted yet — there is nothing to decide on.
        </p>
      )
    }
    return (
      <div className='flex flex-wrap gap-2 mt-3'>
        {sec.status !== 'verified' && (
          <button disabled={!!busy} onClick={() => decideSection(sec.key, 'verified', sec.label)}
            className='text-xs font-semibold border border-green-200 text-green-700 px-3 py-1.5 rounded-md disabled:opacity-50'>
            Mark verified
          </button>
        )}
        {sec.status === 'verified' && (
          <button disabled={!!busy} onClick={() => decideSection(sec.key, 'unverified', sec.label)}
            className='text-xs font-semibold border border-gray-200 text-[#454545] px-3 py-1.5 rounded-md disabled:opacity-50'>
            Unverify
          </button>
        )}
        {sec.status !== 'rejected' && (
          <button disabled={!!busy} onClick={() => decideSection(sec.key, 'rejected', sec.label)}
            className='text-xs font-semibold border border-red-200 text-red-600 px-3 py-1.5 rounded-md disabled:opacity-50'>
            Reject
          </button>
        )}
      </div>
    )
  }

  const loadCommissions = useCallback(async () => {
    if (!id) return
    try {
      const res = await coreApi().get(`/admin/host/${id}/commissions`)
      setCommissions(res.data?.data || res.data?.commissions || (Array.isArray(res.data) ? res.data : []))
      setCommissionError('')
    } catch {
      // Deliberately soft. A missing commission history must not blank out the
      // verification and payout details somebody came here to read.
      setCommissionError('Commission history could not be loaded.')
    }
  }, [id])

  useEffect(() => { loadCommissions() }, [loadCommissions])

  if (loading && !host) return <LoadingBlock label='Loading host…' />
  if (!host) return null

  // Resolved server-side from the USER's documents — `host.kyc*` is a set of
  // columns nothing has ever written (see hostService.getHostById).
  const v = host.verification || {}
  const accounts = Array.isArray(host.hostPayoutAccount) ? host.hostPayoutAccount : []
  const active = accounts.find((a) => a.isActive)
  const previous = accounts.filter((a) => !a.isActive)
  const activeCommission = commissions.find((c) => c.isActive)

  return (
    <>
      <StatRow cols={4}>
        <Stat label='Total rides' value={host.totalRides ?? 0} />
        <Stat label='Cancelled by host' value={host.totalHostCancelledRides ?? 0}
          hint='Counts against the host' />
        <Stat label='Cancelled by customer' value={host.totalCustomerCancelledRides ?? 0}
          hint="Not the host's doing" />
        <Stat label='Reported unclean' value={host.totalUncleanRides ?? 0} />
      </StatRow>

      <SectionCard
        title='Contact & identity'
        description='The host record. Name, email and phone are copied from the user account when the host is created.'
        actions={host.userId ? (
          <Link href={`/dashboard/users/${host.userId}`} className='text-xs font-semibold text-[#454545] hover:text-[#151515]'>
            Open user profile →
          </Link>
        ) : null}
      >
        <FieldGrid cols={4}>
          <Field label='Name' value={host.name || host.user?.name} />
          <Field label='Email' value={host.email || host.user?.email} capitalize={false}
            hint={host.emailVerified ? 'Verified' : 'Not verified'} />
          <Field label='Phone' value={`${host.countryCode || ''} ${host.contactNumber || ''}`.trim()}
            hint={host.contactVerified ? 'Verified' : 'Not verified'} />
          <Field label='Address' value={host.user?.address} />
          <Field label='Joined' value={getValidDateFormat(host.createdAt)} />
          <Field label='Referral code' value={host.referralCode} mono />
          <Field label='Created by' value={host.adminAdded ? 'Admin' : 'Self sign-up'} />
          <Field label='Host id' value={host.id} mono />
        </FieldGrid>
      </SectionCard>

      {/* ── Host verification: PAN + bank + KYC, and it DECIDES here ────────
          This panel used to report and defer everything to the user profile.
          That was right while the only decisions were about rider documents; it
          is wrong now that being a host is its own chain. Being PAID asks for a
          tax identity and an account, and neither is a rider question.

          What still lives on the user profile: Aadhaar, the driving licence and
          the photo match. Those gate BOOKING, not payouts. */}
      <SectionCard
        title='Host verification'
        description='PAN, bank account and KYC. All three, and only these three — a host lists a car, they do not drive it.'
        actions={host.userId ? (
          <Link href={`/dashboard/users/${host.userId}`} className='btn-md'>Open user profile</Link>
        ) : null}
      >
        <div className='mb-4'>
          <HostVerdict chain={chain} status={host.verificationStatus} />
        </div>

        {/* ONE IDENTITY, AND THE SCREEN SAYS SO. KYC is the same check the user
            profile shows, on the same row — verifying it here satisfies it
            there, and vice versa. Without this sentence an admin sees the same
            item on two screens and reasonably concludes there are two of them. */}
        <div className='mb-4'>
          <Explainer>
            KYC is shared with the rider profile — the same person, verified <strong>once</strong>.
            A decision here shows up there immediately. PAN and the bank account belong to
            hosting alone and are decided here.
          </Explainer>
        </div>

        {chainError ? (
          <p className='text-sm text-amber-700'>{chainError}</p>
        ) : (
          <div className='space-y-3'>
            {(chain?.sections || []).map((sec) => (
              <div key={sec.key} className='rounded-md border border-gray-100 bg-[#fafafa] p-4'>
                <div className='flex items-center justify-between gap-2 flex-wrap'>
                  <div className='min-w-0'>
                    <p className='text-[11px] font-semibold uppercase tracking-tight text-[#757575]'>
                      {sec.label}
                    </p>
                    <p className='text-sm font-medium text-[#454545]'>{SECTION_HINT[sec.key] || ''}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_PILL[sec.status] || DOC_PILL.missing}`}>
                    {DOC_LABEL[sec.status] || sec.status}
                  </span>
                </div>
                {sec.reason && <p className='text-xs text-red-600 mt-2'>{sec.reason}</p>}
                {/* KYC carries the evidence ops is deciding on. A passing OTP
                    does not verify the section — it is what makes verifying it
                    reasonable, and the difference is the whole point of asking. */}
                {sec.evidence && (
                  <div className='mt-2'>
                    <p className={`text-xs ${sec.evidence.otpVerified ? 'text-green-700' : 'text-amber-700'}`}>
                      {sec.evidence.otpVerified
                        ? 'Aadhaar OTP verified — the holder proved control of the registered mobile.'
                        : 'No Aadhaar OTP recorded. Verify only if you have established their identity another way.'}
                    </p>
                    {sec.evidence.kycNumber && (
                      <p className='text-xs text-[#454545] mt-1'>
                        Aadhaar on file: <span className='font-mono'>{sec.evidence.kycNumber}</span>
                      </p>
                    )}
                    {sec.evidence.verifiedNumber && sec.evidence.kycNumber
                      && sec.evidence.verifiedNumber !== sec.evidence.kycNumber && (
                      <p className='text-xs text-red-600 mt-1'>
                        Verified against <span className='font-mono'>{sec.evidence.verifiedNumber}</span>,
                        which is not the Aadhaar currently on file.
                      </p>
                    )}
                  </div>
                )}
                <SectionActions sec={sec} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── The host-level decision ─────────────────────────────────────────
          Separate from the sections above, exactly as Approve is on the user
          screen: verifying a PAN says the PAN is good, not "this host may now be
          paid". One click must never silently mean the other. */}
      <SectionCard
        title='Host decision'
        description='Verifying a host is what allows payouts. It is not implied by the sections above.'
      >
        {!mayDecide ? (
          <p className='text-sm text-[#757575]'>You have view-only access to host verification.</p>
        ) : (
          <>
            {host.verificationStatus === 'verified' ? (
              <p className='text-xs text-green-700 font-semibold mb-3'>
                This host is verified and can be paid.
              </p>
            ) : chain?.complete ? (
              <p className='text-xs text-green-700 font-semibold mb-3'>
                Every section is verified — this host is ready to verify. They stay unverified
                until you press the button.
              </p>
            ) : (
              <div className='mb-3'>
                <p className='text-xs text-amber-700 font-semibold'>
                  Verify is unavailable until every section is complete.
                </p>
                <ul className='mt-1.5 ml-4 list-disc'>
                  {(chain?.outstanding || []).map((o) => (
                    <li key={o} className='text-[11px] text-[#757575]'>{o}</li>
                  ))}
                </ul>
              </div>
            )}
            {host.verificationReason && (
              <p className='text-xs text-red-600 mb-3'>{host.verificationReason}</p>
            )}
            <div className='flex flex-wrap gap-2'>
              {host.verificationStatus !== 'verified' && chain?.complete && (
                <button disabled={!!busy} onClick={() => hostDecision('verified')}
                  className='text-sm font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md disabled:opacity-50'>
                  {busy === 'verified' ? '…' : 'Verify host'}
                </button>
              )}
              {host.verificationStatus === 'verified' && (
                <button disabled={!!busy} onClick={() => hostDecision('unverified')}
                  className='text-sm font-semibold border border-gray-200 text-[#454545] px-5 py-2 rounded-md disabled:opacity-50'>
                  Unverify
                </button>
              )}
              {host.verificationStatus !== 'rejected' && (
                <button disabled={!!busy} onClick={() => hostDecision('rejected')}
                  className='text-sm font-semibold border border-red-200 text-red-600 px-5 py-2 rounded-md disabled:opacity-50'>
                  Reject
                </button>
              )}
            </div>
            <p className='text-[11px] text-[#959595] mt-3'>
              Unverify puts the host back to pending — a correction, and the host is told nothing.
              Reject is a decision against, needs a reason, and the host is expected to act on it.
              Both stop payouts.
            </p>
          </>
        )}
      </SectionCard>

      <SectionCard
        title='Commission'
        description='What the platform takes from this host. Versioned — a change adds a new row rather than editing the old one.'
      >
        {commissionError && <p className='text-xs text-amber-700 mb-3'>{commissionError}</p>}
        {!commissionError && commissions.length === 0 && (
          <p className='text-sm text-[#757575]'>
            No commission rows on file. Hosts are created with a 30% default, so an empty list usually
            means this host predates commission tracking.
          </p>
        )}
        {activeCommission && (
          <FieldGrid cols={4}>
            <Field label='Current rate' value={`${activeCommission.commissionPercentage}%`} />
            <Field label='In force since' value={getValidDateFormat(activeCommission.startDate)} />
            <Field label='Previous rates' value={commissions.length > 1 ? commissions.length - 1 : 0} />
          </FieldGrid>
        )}
      </SectionCard>

      <SectionCard
        title='Bank / payout account'
        description='Where settlements are paid. Only one account is active at a time.'
        actions={(
          <Link href='/dashboard/finance/bank-accounts'
            className='text-xs font-semibold text-[#454545] hover:text-[#151515]'>
            Verify in Host Bank Accounts →
          </Link>
        )}
      >
        {!active && previous.length === 0 && (
          <div className='rounded-md border border-amber-100 bg-amber-50 px-4 py-3'>
            <p className='text-sm font-medium text-amber-800'>No bank account on file — settlements are blocked.</p>
            {/* Naming the cause matters: an ops admin cannot add this for the
                host, so the action is to chase them, not to look for a form. */}
            <p className='text-xs text-amber-700 mt-1'>
              The host adds this themselves from the app (Profile → Bank Details, or the listing wizard&apos;s
              Bank step). Nothing can be paid out until they do — this is not something ops can enter for them.
            </p>
          </div>
        )}
        {active && <PayoutAccount account={active} />}
        {!active && previous.length > 0 && (
          <p className='text-sm text-amber-700 mb-3'>
            No active account — every account on file has been replaced. Settlements are blocked.
          </p>
        )}

        {previous.length > 0 && (
          <div className='mt-4'>
            <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold mb-2'>
              Replaced accounts ({previous.length})
            </p>
            <div className='space-y-3'>
              {previous.map((a) => <PayoutAccount key={a.id} account={a} dormant />)}
            </div>
          </div>
        )}
      </SectionCard>
    </>
  )
}
