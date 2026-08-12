'use client'
import React, { useMemo } from 'react'
import { useParams } from 'next/navigation'
import RidesList from '@/app/_components/RidesList'

// Vehicle › Rides — every booking taken on this car.
//
// THIS TAB FILTERED BY THE WRONG ENTITY. It sent `hostId={vehicleId}` — a
// vehicle id in the host slot. `/admin/booking` accepts both parameters, so
// nothing errored; it filtered by a host that does not exist and the tab was
// empty for every vehicle on the platform.
//
// It also fetched `/city` twice on mount and again on every filter change, into
// state feeding a city filter this tab never rendered — three wasted requests
// per keystroke for a control that does not exist — and carried an "Add Ride"
// button, on a car's ride history.
//
// The vehicle column is dropped: every row is this car.

export default function VehicleRides() {
  const { id } = useParams()
  const scope = useMemo(() => ({ vehicleId: id }), [id])

  return (
    <RidesList
      scope={scope}
      showVehicle={false}
      emptyMessage='Bookings appear here as soon as a rider books this car.'
    />
  )
}
