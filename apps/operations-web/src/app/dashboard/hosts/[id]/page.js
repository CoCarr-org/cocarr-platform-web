'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
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
// REAL holder name. The host also types one in. A mismatch between them is the
// single strongest fraud signal on this screen, so it is called out rather
// than left for someone to spot by reading two adjacent fields.
const NameMatch = ({ account }) => {
  const provided = (account.hostProvidedName || '').trim().toLowerCase()
  const actual = (account.accountHolderName || '').trim().toLowerCase()
  if (!provided || !actual) return null
  if (provided === actual) return <Pill tone='good'>Name matches</Pill>
  return <Pill tone='bad'>Name mismatch</Pill>
}

// A document's state, from the document ROW when there is one.
//
// `null` (never submitted) is deliberately distinct from `pending` (submitted,
// awaiting review). The old screen collapsed both into "Not verified", which
// tells an admin to chase a host who has already sent everything. The boolean
// is only a fallback for a payload that predates the document tables.
const docStatus = (doc, verifiedFlag) => {
  if (doc?.status) return doc.status
  if (verifiedFlag) return 'verified'
  return 'missing'
}

const DocumentSummary = ({ label, status, number, name, note, mismatch }) => (
  <div className='rounded-md border border-gray-100 bg-[#fafafa] p-4'>
    <div className='flex items-center justify-between gap-2 mb-2'>
      <p className='text-[11px] font-semibold uppercase tracking-tight text-[#757575]'>{label}</p>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${DOC_PILL[status] || DOC_PILL.missing}`}>
        {DOC_LABEL[status] || DOC_LABEL.missing}
      </span>
    </div>
    <p className='text-sm font-medium text-[#454545] font-mono break-all'>{number || '—'}</p>
    <p className='text-xs text-[#757575] capitalize'>{name || 'No name on file'}</p>
    {mismatch && <p className='text-[11px] text-red-600 mt-1'>Name does not match the profile</p>}
    {note && <p className='text-[10px] text-[#959595] mt-1'>{note}</p>}
  </div>
)

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
      <Field label='City' value={account.city} />
      <Field label='Branch' value={account.branch} />
    </FieldGrid>
  </div>
)

export default function HostOverview() {
  const { id } = useParams()
  const { host, loading } = useHost()

  // Commission is per-host and versioned (start/end dated), so what a host is
  // actually on cannot be read off the host row. It is its own admin endpoint.
  const [commissions, setCommissions] = useState([])
  const [commissionError, setCommissionError] = useState('')

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

      <SectionCard
        title='Identity verification'
        description='Aadhaar, PAN and driving licence. These belong to the person, not to the host role.'
        actions={host.userId ? (
          <Link href={`/dashboard/users/${host.userId}`} className='btn-md'>Review documents</Link>
        ) : null}
      >
        {/* ONE SUBMISSION COVERS BOTH ROLES, AND THE SCREEN SAYS SO.
            Documents are keyed by USER id, and a host is a user — so somebody
            who verified as a rider is already verified as a host. Without this
            sentence an admin sees a verification panel on a second screen and
            reasonably concludes a second submission is owed. */}
        <div className='mb-4'>
          <Explainer>
            Shared with the user profile. The same person books rides and lists cars, so they verify
            <strong> once</strong> — if these are verified here, nothing further is needed for hosting,
            and vice versa.
          </Explainer>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <DocumentSummary
            label='Aadhaar / KYC'
            status={docStatus(v.documents?.kyc, v.kycVerified)}
            number={v.kycNumber}
            name={v.kycName}
            note='Masked server-side — read the number off the scan.'
          />
          <DocumentSummary
            label='PAN'
            status={docStatus(v.documents?.pan, v.panVerified)}
            number={v.panNumber}
            name={v.panName}
            note={v.panProviderStatus ? `Registry: ${v.panProviderStatus}` : null}
            mismatch={v.panNameMatch === false}
          />
          <DocumentSummary
            label='Driving licence'
            status={docStatus(v.documents?.licence, v.licenseVerified)}
            number={v.licenseNumber}
            name={v.licenseName}
          />
        </div>

        <div className='mt-4'>
          {/* The decision lives on ONE screen. Two screens acting on the same
              document is how a document gets approved from whichever one
              happens to show less evidence — the same rule the vehicle
              overview follows by deferring to /review. */}
          <Explainer>
            Decisions are made on the user profile, where the scans, the extracted values and the provider
            verdict are shown together. This panel reports; it does not decide.
          </Explainer>
        </div>
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
