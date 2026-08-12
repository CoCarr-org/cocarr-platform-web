'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { LIMIT, getTimeFormat, getValidDateFormat } from '@cocarr/shared-utils'
import { Pagination } from '@cocarr/ui'
import { DataTable } from '@cocarr/datagrid'
import {
  EmptyState, FilterSelect, ListState, Pill, SearchBox, useDebounced,
} from './ui'

// A scoped booking list, for the Rides tab of a host and of a vehicle.
//
// ONE COMPONENT BECAUSE THEY WERE TWO COPIES THAT HAD ALREADY DIVERGED. Both
// tabs were ~235 lines of the same hand-rolled table, and the vehicle one had
// drifted into passing `hostId={vehicleId}` — a vehicle id in the host slot.
// `/admin/booking` accepts both parameters, so nothing errored: it filtered by
// a host that does not exist and the tab was empty for every vehicle on the
// platform. `scope` makes the difference between the two explicit and is the
// only thing either caller supplies.
//
// `initiated` IS SHOWN AND IS NOT A GLITCH. Payment captured, confirm-booking
// never completed — a real, non-transient stuck state, and the one an ops admin
// most needs to see. Hiding it, or lumping it in with `booked`, is a recurring
// bug across these clients.

const STATUS_TONE = {
  initiated: 'warn',
  booked: 'info',
  ongoing: 'brand',
  finished: 'good',
  cancelled: 'bad',
}

const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'initiated', label: 'Initiated (stuck)' },
  { value: 'booked', label: 'Booked' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'finished', label: 'Finished' },
  { value: 'cancelled', label: 'Cancelled' },
]

const money = (v) => (v || v === 0 ? `₹${Number(v).toLocaleString('en-IN')}` : '—')

export default function RidesList({ scope, emptyMessage, showVehicle = true }) {
  const router = useRouter()

  const [searchText, setSearchText] = useState('')
  const search = useDebounced(searchText)
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)

  const [rides, setRides] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // `scope` is an object literal at most call sites, so it is stringified for
  // the dependency rather than compared by reference — otherwise every render
  // of the parent refetches the list.
  const scopeKey = JSON.stringify(scope || {})

  const load = useCallback(async () => {
    const parsed = JSON.parse(scopeKey)
    if (!parsed || Object.values(parsed).every((v) => !v)) return
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/booking', {
        params: {
          ...parsed,
          populate: true,
          offset,
          limit: LIMIT,
          search: search || undefined,
          status: status || undefined,
          sort: '-createdAt',
        },
      })
      setRides(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load rides.'))
    } finally {
      setLoading(false)
    }
  }, [scopeKey, offset, search, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setOffset(0) }, [search, status, scopeKey])

  const columns = [
    {
      accessorKey: 'bookingId',
      id: 'booking',
      header: 'Booking',
      size: 190,
      cell: ({ row }) => (
        <div>
          <p className='text-xs font-mono uppercase text-[#1a1a1a]'>{row.original.bookingId || '—'}</p>
          <p className='text-[11px] text-[#959595]'>{getValidDateFormat(row.original.createdAt)}</p>
        </div>
      ),
    },
    {
      accessorKey: 'user',
      id: 'rider',
      header: 'Rider',
      size: 190,
      cell: ({ row }) => (
        <div className='min-w-0'>
          {/* The backend resolves names centrally — do not re-invent a fallback
              here, or the "Unknown" bug returns one screen at a time. */}
          <p className='text-sm text-[#454545] truncate'>{row.original.user?.name || '—'}</p>
          <p className='text-[11px] text-[#959595]'>{row.original.user?.contactNumber || ''}</p>
        </div>
      ),
    },
    ...(showVehicle ? [{
      accessorKey: 'vehicle',
      id: 'vehicle',
      header: 'Vehicle',
      size: 190,
      cell: ({ row }) => (
        <div className='min-w-0'>
          <p className='text-sm text-[#454545] truncate'>{row.original.vehicle?.vehicleName || '—'}</p>
          <p className='text-[11px] text-[#959595] font-mono'>{row.original.vehicle?.vehicleNumber || ''}</p>
        </div>
      ),
    }] : []),
    {
      accessorKey: 'startTime',
      id: 'window',
      header: 'Ride window',
      size: 200,
      cell: ({ row }) => (
        <div>
          <p className='text-xs text-[#454545]'>
            {getValidDateFormat(row.original.startTime)} {getTimeFormat(row.original.startTime)}
          </p>
          <p className='text-[11px] text-[#959595]'>
            to {getValidDateFormat(row.original.endTime)} {getTimeFormat(row.original.endTime)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'totalAmount',
      id: 'amount',
      header: 'Amount',
      size: 120,
      cell: ({ row }) => <p className='text-sm text-[#454545]'>{money(row.original.totalAmount)}</p>,
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: 'Status',
      size: 160,
      cell: ({ row }) => (
        <div>
          <Pill tone={STATUS_TONE[row.original.status] || 'neutral'}>{row.original.status || '—'}</Pill>
          {row.original.status === 'initiated' && (
            <p className='text-[10px] text-amber-700 mt-1'>Payment taken, never confirmed</p>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className='w-full'>
      <div className='flex items-center gap-3 flex-wrap mb-4'>
        <SearchBox value={searchText} onChange={setSearchText} placeholder='Search rides' />
        <FilterSelect value={status} onChange={setStatus} options={STATUSES} />
        <span className='text-xs text-[#959595]'>
          {loading ? 'Loading…' : `${count} ride${count === 1 ? '' : 's'}`}
        </span>
        <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
      </div>

      <ListState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={rides.length === 0}
        empty={(
          <EmptyState
            title={search || status ? 'No rides match these filters' : 'No rides yet'}
            message={search || status ? undefined : emptyMessage}
          />
        )}
      >
        <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
          <DataTable
            columns={columns}
            data={rides}
            frozenColumns={['booking']}
            enableSorting={false}
            // `/dashboard` prefix: both copies of this table pushed to
            // `/rides/{id}`, so every row click 404'd.
            onRowClick={(row) => router.push(`/dashboard/rides/${row.bookingId || row.id}`)}
          />
        </div>
      </ListState>
    </div>
  )
}
