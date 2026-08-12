'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@cocarr/datagrid'
import { STATUS_LABEL, STATUS_PILL } from '@/app/_helpers/vehicleStatus'
import { Pill, StatusPill, Thumb } from '@/app/_components/ui'

// The fleet table, in one place.
//
// It is rendered by BOTH the Vehicles list and a host's Vehicles tab, which
// previously carried two copies of the same 120 lines of column definitions —
// so the host tab kept whatever the main list had when it was cloned, and the
// two drifted. Only the query differs between them, and that belongs to the
// caller.
//
// EVERY ASSOCIATION IS OPTIONAL AND THE LIST QUERY LEFT JOINS THEM. `pickupPoint`
// especially: a vehicle gets its pickup at the listing wizard's Location step,
// so anything mid-listing has none — and including exactly those is why the
// backend join was changed from INNER to LEFT. Dereferencing `pickupPoint.city.name`
// on one of them throws mid-render and unmounts the page, which reads as a
// broken route rather than a missing field.

const cover = (images) => {
  if (!Array.isArray(images) || images.length === 0) return null
  return (images.find((i) => i.isCover) || images[0])?.url || null
}

export default function VehicleTable({ vehicles, showHost = true }) {
  const router = useRouter()

  const columns = [
    {
      accessorKey: 'name',
      id: 'name',
      header: 'Vehicle',
      size: 280,
      cell: ({ row }) => {
        const v = row.original
        return (
          <div className='flex items-center gap-3'>
            <Thumb src={cover(v.images)} alt={v.vehicleName} />
            <div className='min-w-0'>
              <div className='flex items-center gap-1.5'>
                <p className='text-sm font-medium text-[#1a1a1a] truncate'>
                  {[v.brand?.name, v.vehicleName].filter(Boolean).join(' ') || 'Untitled vehicle'}
                </p>
                {/* A draft was never submitted. Without the marker it looks
                    like a listing that ops forgot to approve. */}
                {v.isDraft && <Pill tone='neutral'>Draft</Pill>}
              </div>
              <p className='text-[11px] text-[#959595] font-mono'>{v.vehicleNumber || 'No number'}</p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'approvalStatus',
      id: 'status',
      header: 'Review status',
      size: 190,
      cell: ({ row }) => {
        const v = row.original
        return (
          <div>
            <StatusPill status={v.approvalStatus || 'pending'} labels={STATUS_LABEL} pills={STATUS_PILL} />
            {/* Approved is not the same as bookable. `active` is the host's own
                on/off switch and an approved car with it off takes no bookings,
                which is otherwise invisible from this screen. */}
            {v.approvalStatus === 'approved' && v.active === false && (
              <p className='text-[11px] text-amber-700 mt-1'>Switched off by host</p>
            )}
            {v.approvalStatus === 'rejected' && v.rejectionReason && (
              <p className='text-[11px] text-[#959595] mt-1 truncate' title={v.rejectionReason}>
                {v.rejectionReason}
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'rcVerified',
      id: 'rc',
      header: 'RC',
      size: 130,
      cell: ({ row }) => {
        const v = row.original
        // Two different facts: the provider's verdict on the registration, and
        // an admin's own sign-off on the document. They disagree often enough
        // that collapsing them hides which one is outstanding.
        const verified = v.vehicleRcVerified || v.rcVerified
        return (
          <Pill tone={verified ? 'good' : (v.vehicleRcNumber ? 'warn' : 'neutral')}>
            {verified ? 'Verified' : (v.vehicleRcNumber ? 'Pending' : 'Not submitted')}
          </Pill>
        )
      },
    },
    ...(showHost ? [{
      accessorKey: 'host',
      id: 'host',
      header: 'Host',
      size: 180,
      cell: ({ row }) => (
        <p className='text-sm text-[#454545] truncate'>
          {row.original.host?.name || row.original.host?.user?.name || '—'}
        </p>
      ),
    }] : []),
    {
      accessorKey: 'city',
      id: 'city',
      header: 'Pickup city',
      size: 150,
      cell: ({ row }) => {
        const city = row.original.pickupPoint?.city?.name
        return city
          ? <p className='text-sm text-[#454545] capitalize'>{city}</p>
          : <span className='text-xs text-amber-700'>No pickup set</span>
      },
    },
    {
      accessorKey: 'rate',
      id: 'rate',
      header: 'Rate',
      size: 120,
      cell: ({ row }) => {
        const fee = row.original.vehiclePlan?.[0]?.perHourFee
        return (
          <p className='text-sm text-[#454545]'>
            {fee ? `₹${fee}` : '—'}
            {fee ? <span className='text-[11px] text-[#959595]'>/hr</span> : null}
          </p>
        )
      },
    },
    {
      accessorKey: 'spec',
      id: 'spec',
      header: 'Specification',
      size: 200,
      cell: ({ row }) => {
        const v = row.original
        const parts = [v.vehicleTransmission, v.vehicleFuelType, v.vehicleSeats && `${v.vehicleSeats} seats`]
        return (
          <p className='text-xs text-[#757575] capitalize'>
            {parts.filter(Boolean).join(' · ') || '—'}
          </p>
        )
      },
    },
  ]

  return (
    <div className='bg-white border border-gray-100 rounded-lg overflow-hidden'>
      <DataTable
        columns={columns}
        data={vehicles}
        frozenColumns={['name']}
        enableSorting={false}
        onRowClick={(row) => router.push(`/dashboard/vehicles/${row.id}`)}
      />
    </div>
  )
}
