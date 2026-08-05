'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import PageLayout from '@/app/_components/PageLayout'

// User Management landing page.
//
// Clicking "User Management" in the sidebar used to drop straight into the raw
// customer list. This is the section overview instead: every queue that needs
// an admin's attention, with a live count, each one a link into the list
// already filtered to it.
//
// All the numbers come from ONE call (`/admin/user-management/overview`) on
// purpose — they are meant to agree with each other, and six separate
// paginated reads taken moments apart would not.

// Module scope: a component declared inside another component's render is a
// new type every render, so React remounts it needlessly.
const Card = ({ label, value, hint, tone = 'plain', onClick }) => {
  const tones = {
    plain: 'border-gray-100',
    warn: 'border-amber-200 bg-amber-50/40',
    good: 'border-green-200 bg-green-50/40',
    bad: 'border-orange-200 bg-orange-50/40',
    info: 'border-gray-200',
  }
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white border rounded-md p-5 transition ${tones[tone]} ${
        onClick ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'}`}
    >
      <p className='text-[11px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
      <p className='text-3xl font-semibold mt-1.5 leading-none'>{value ?? '—'}</p>
      {hint && <p className='text-[11px] text-[#959595] mt-2 leading-snug'>{hint}</p>}
    </button>
  )
}

const Section = ({ title, children }) => (
  <div className='mb-7'>
    <p className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2.5'>{title}</p>
    <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>{children}</div>
  </div>
)

export default function UserManagementPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    authAxios.get('/admin/user-management/overview')
      .then((res) => active && setData(res.data))
      .catch((error) => active
        && ErrorToast(error?.response?.data?.error || 'Could not load the user overview'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  // Each card deep-links into the customers list with the filter pre-applied,
  // so the count and the list it opens can never disagree.
  const toCustomers = (status) => () => router.push(
    status ? `/dashboard/users?status=${status}` : '/dashboard/users',
  )

  const c = data?.counts || {}
  const d = data?.documents || {}

  return (
    <PageLayout
      title='User Management'
      subtitle='Every queue that needs an admin’s attention, with a live count.'
      breadcrumb={['User Management', 'Overview']}
      actions={
        <>
          <button type='button' onClick={() => router.push('/dashboard/users')} className='btn-md'>
            Customers
          </button>
          <button type='button' onClick={() => router.push('/dashboard/users/verification')}
            className='text-sm font-semibold border border-gray-200 px-4 py-2 rounded-md hover:border-gray-300'>
            Verification queue
          </button>
        </>
      }
    >
      {loading ? (
        <p className='px-1 py-6 text-sm text-[#757575]'>Loading…</p>
      ) : (
        <div>
          <Section title='Accounts'>
            <Card label='All users' value={c.total} tone='info'
              hint='Every registered account' onClick={toCustomers(null)} />
            <Card label='Active' value={c.active} tone='good'
              hint='Approved — these are the only users who can book' onClick={toCustomers('active')} />
            <Card label='Pending verification' value={c.pending} tone='warn'
              hint='Submitted and waiting on an admin decision' onClick={toCustomers('pending')} />
            <Card label='Incomplete' value={c.incomplete}
              hint='Profile or documents not finished by the user' onClick={toCustomers('incomplete')} />
          </Section>

          <Section title='Needs attention'>
            <Card label='Suspended' value={c.suspended} tone='bad'
              hint='Blocked from signing in' onClick={toCustomers('suspended')} />
            <Card label='Rejected' value={c.rejected} tone='bad'
              hint='Turned down — the user can fix and resubmit' onClick={toCustomers('rejected')} />
            <Card label='Documents to review' value={d.total} tone='warn'
              hint={`Aadhaar ${d.aadhaar ?? 0} · Licence ${d.licence ?? 0} · PAN ${d.pan ?? 0}`}
              onClick={() => router.push('/dashboard/users/documents')} />
            <Card label='New in last 30 days' value={data?.recentSignups} tone='info'
              hint='Signups — explains a growing pending queue' />
          </Section>

          <div className='flex flex-wrap gap-3'>
            <button type='button' onClick={() => router.push('/dashboard/users')}
              className='text-sm font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md'>
              Customers
            </button>
            <button type='button' onClick={() => router.push('/dashboard/users/verification')}
              className='text-sm font-semibold border border-gray-200 px-5 py-2 rounded-md'>
              Verification queue
            </button>
            <button type='button' onClick={() => router.push('/dashboard/users/documents')}
              className='text-sm font-semibold border border-gray-200 px-5 py-2 rounded-md'>
              KYC &amp; documents
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
