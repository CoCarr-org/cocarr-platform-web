'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { LIMIT, getTimeFormat, getValidDateFormat } from '@cocarr/shared-utils'
import { Pagination } from '@cocarr/ui'
import { DataTable } from '@cocarr/datagrid'
import {
  EmptyState, FilterSelect, ListState, Pill, SearchBox, useDebounced,
} from '@/app/_components/ui'

// Host › Rides — every booking taken on this host's cars.
//
// FOUR THINGS WERE BROKEN HERE, none of them visual:
//
//   1. Clicking a row went to `/rides/{id}` — no `/dashboard` prefix, so every
//      row in the table 404'd.
//   2. `getCities()` did `setCities(res.data)` where `/city` answers
//      `{ data: [...] }`, so `cities` held an object; the city filter it fed
//      rendered nothing and filtered nothing.
//   3. It was called twice on mount, and again on every filter change, for a
//      list that never changes.
//   4. An "Add Ride" button, on a host's ride history.
//
// `initiated` IS SHOWN AND IS NOT A GLITCH. Payment captured, confirm-booking
// never completed — a real, non-transient stuck state, and the one an ops admin
// most needs to see on a host's history. Filtering it out (or lumping it in
// with booked) is a recurring bug across these clients.

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

export default function HostRides() {
  const { id } = useParams()
  const router = useRouter()

  const [searchText, setSearchText] = useState('')
  const search = useDebounced(searchText)
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)

  const [rides, setRides] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/booking', {
        params: {
          hostId: id,
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
      setError(apiErrorMessage(err, 'Could not load rides for this host.'))
    } finally {
      setLoading(false)
    }
  }, [id, offset, search, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setOffset(0) }, [search, status])

  const columns = [
    {
      accessorKey: 'bookingId',
      id: 'booking',
      header: 'Booking',
      size: 200,
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
      size: 200,
      cell: ({ row }) => (
        <div className='min-w-0'>
          {/* The backend resolves names centrally now — do not re-invent a
              fallback here, or the "Unknown" bug comes back one screen at a
              time. */}
          <p className='text-sm text-[#454545] truncate'>{row.original.user?.name || '—'}</p>
          <p className='text-[11px] text-[#959595]'>{row.original.user?.contactNumber || ''}</p>
        </div>
      ),
    },
    {
      accessorKey: 'vehicle',
      id: 'vehicle',
      header: 'Vehicle',
      size: 200,
      cell: ({ row }) => (
        <div className='min-w-0'>
          <p className='text-sm text-[#454545] truncate'>{row.original.vehicle?.vehicleName || '—'}</p>
          <p className='text-[11px] text-[#959595] font-mono'>{row.original.vehicle?.vehicleNumber || ''}</p>
        </div>
      ),
    },
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
      accessorKey: 'status',
      id: 'status',
      header: 'Status',
      size: 150,
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
            message="Bookings appear here as soon as a rider books one of this host's cars."
          />
        )}
      >
        <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
          <DataTable
            columns={columns}
            data={rides}
            frozenColumns={['booking']}
            enableSorting={false}
            onRowClick={(row) => router.push(`/dashboard/rides/${row.bookingId || row.id}`)}
          />
        </div>
      </ListState>
    </div>
  )
}
