'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { LIMIT, getValidDateFormat } from '@cocarr/shared-utils'
import { PageLayout, Pagination } from '@cocarr/ui'
import { DataTable } from '@cocarr/datagrid'
import {
  Avatar, EmptyState, Explainer, FilterSelect, ListState, Pill, SearchBox, useDebounced,
} from '@/app/_components/ui'

// Hosts / Partners — everyone who has listed a car.
//
// WHAT THIS SCREEN CAN HONESTLY SHOW. `GET /host` runs against the hosts table
// with NO joins (see getAllHosts in hostService) — no user row, no vehicle
// count, no payout account. So every column here comes off the host record
// itself. The previous version rendered `rcVerificationId` and `rcVerified` in
// a "Status" column; both are VEHICLE fields that never appear on a host row,
// so those two icons were unconditionally grey on every host since the screen
// was written. They are replaced with the three verification flags the host row
// genuinely carries.
//
// NO CLIENT-SIDE FILTER CHIPS EITHER. The endpoint paginates server-side, so a
// chip filtering the 25 rows currently loaded would report "3 unverified" out
// of a page, not out of the platform — a number that looks like an answer and
// is not one. Search and sort go to the server, which is why they are the only
// two controls here.
//
// THERE IS NO "ADD HOST" BUTTON ANY MORE, AND IT WAS NOT A DESIGN CHOICE.
// `POST /host` is the MOBILE APP's become-a-host call. It is mounted behind
// `authenticateUser`, not `authenticateAdmin` — so an admin token 401s on it —
// and `createHost` ignores the body's name/email/contactNumber entirely,
// reading `userId` off the authenticated caller and copying their own user row.
// Pressing the old button could only ever have failed, and had it somehow
// succeeded it would have made the ADMIN a host with every typed field
// discarded. A host record appears here when a user lists their first car.

const SORTS = [
  { value: '-createdAt', label: 'Newest first' },
  { value: 'createdAt', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
  { value: 'contactNumber', label: 'Phone number' },
]

// Three independent facts, three pills. Collapsing them into one "verified"
// badge loses the distinction ops acts on: an unverified PHONE blocks the OTP
// handover at pickup, an unverified KYC blocks payout.
const VerificationPills = ({ host }) => (
  <div className='flex items-center gap-1.5 flex-wrap'>
    <Pill tone={host.kycVerified ? 'good' : 'warn'}>KYC</Pill>
    <Pill tone={host.contactVerified ? 'good' : 'neutral'}>Phone</Pill>
    <Pill tone={host.emailVerified ? 'good' : 'neutral'}>Email</Pill>
  </div>
)

export default function Hosts() {
  const navigate = useRouter()

  const [searchText, setSearchText] = useState('')
  const search = useDebounced(searchText)
  const [sort, setSort] = useState('-createdAt')
  const [offset, setOffset] = useState(0)

  const [hosts, setHosts] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await coreApi().get('/host', {
        params: { populate: true, offset, limit: LIMIT, sort, search: search || undefined },
      })
      setHosts(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setError('')
    } catch (err) {
      // Kept on the page, not only in a toast: a toast that has faded leaves an
      // empty table behind, which reads as "there are no hosts".
      setError(apiErrorMessage(err, 'Could not load hosts.'))
    } finally {
      setLoading(false)
    }
  }, [offset, sort, search])

  useEffect(() => { load() }, [load])

  // A new search must not land on page 4 of the previous result set.
  useEffect(() => { setOffset(0) }, [search, sort])

  const columns = [
    {
      accessorKey: 'name',
      id: 'name',
      header: 'Host',
      size: 260,
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <Avatar src={row.original.profilePhoto} name={row.original.name} />
          <div className='min-w-0'>
            <p className='text-sm font-medium text-[#1a1a1a] truncate'>{row.original.name || 'Unnamed host'}</p>
            <p className='text-[11px] text-[#959595]'>
              Joined {getValidDateFormat(row.original.createdAt)}
              {row.original.adminAdded ? ' · added by admin' : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'contactNumber',
      id: 'contact',
      header: 'Contact',
      size: 230,
      cell: ({ row }) => (
        <div className='min-w-0'>
          <p className='text-sm text-[#454545] truncate'>
            {row.original.countryCode || ''} {row.original.contactNumber || '—'}
          </p>
          <p className='text-[11px] text-[#959595] truncate'>{row.original.email || 'No email on file'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'kycVerified',
      id: 'verification',
      header: 'Verification',
      size: 190,
      cell: ({ row }) => <VerificationPills host={row.original} />,
    },
    {
      accessorKey: 'totalRides',
      id: 'rides',
      header: 'Rides',
      size: 150,
      cell: ({ row }) => {
        const cancelled = (row.original.totalHostCancelledRides || 0)
        return (
          <div>
            <p className='text-sm font-medium text-[#454545]'>{row.original.totalRides ?? 0}</p>
            {/* Host-cancelled is the one that reflects on the host; a customer
                cancellation is not their doing and is left to the detail page. */}
            <p className={`text-[11px] ${cancelled > 0 ? 'text-amber-700' : 'text-[#959595]'}`}>
              {cancelled} cancelled by host
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'isActive',
      id: 'status',
      header: 'Status',
      size: 120,
      cell: ({ row }) => (
        <Pill tone={row.original.isActive === false ? 'bad' : 'good'}>
          {row.original.isActive === false ? 'Inactive' : 'Active'}
        </Pill>
      ),
    },
  ]

  return (
    <PageLayout
      title='Hosts & Partners'
      subtitle='Everyone who has listed a car on the platform.'
      breadcrumb={['Operations', 'Hosts']}
      filters={(
        <>
          <SearchBox
            value={searchText}
            onChange={setSearchText}
            placeholder='Search by name, email or phone'
          />
          <FilterSelect value={sort} onChange={setSort} options={SORTS} />
          <span className='text-xs text-[#959595]'>
            {loading ? 'Loading…' : `${count} host${count === 1 ? '' : 's'}`}
          </span>
          <div className='ml-auto'>
            <Pagination count={count} offset={offset} setOffset={setOffset} />
          </div>
        </>
      )}
    >
      <ListState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={hosts.length === 0}
        empty={(
          <EmptyState
            title={search ? 'No hosts match that search' : 'No hosts yet'}
            message={search
              ? 'Search runs across name, email and phone number on the server — try a shorter term.'
              : 'A host record is created the first time somebody lists a car.'}
          />
        )}
      >
        <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
          <DataTable
            columns={columns}
            data={hosts}
            frozenColumns={['name']}
            enableSorting={false}
            onRowClick={(row) => navigate.push(`/dashboard/hosts/${row.id}`)}
          />
        </div>
        <Explainer>
          KYC, phone and email are the host record&apos;s own verification flags. Payout is blocked until
          KYC is verified; the pickup OTP handover depends on the phone number.
        </Explainer>
      </ListState>
    </PageLayout>
  )
}
