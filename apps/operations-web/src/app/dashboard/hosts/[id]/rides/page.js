'use client'
import React, { useMemo } from 'react'
import { useParams } from 'next/navigation'
import RidesList from '@/app/_components/RidesList'

// Host › Rides — every booking taken on this host's cars.
//
// See `_components/RidesList` for what this replaced: two ~235-line copies of
// the same hand-rolled table, one of which had drifted into filtering by the
// wrong entity entirely.

export default function HostRides() {
  const { id } = useParams()
  const scope = useMemo(() => ({ hostId: id }), [id])

  return (
    <RidesList
      scope={scope}
      emptyMessage="Bookings appear here as soon as a rider books one of this host's cars."
    />
  )
}
