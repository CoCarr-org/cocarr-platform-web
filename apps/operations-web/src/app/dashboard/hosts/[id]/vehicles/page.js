'use client'
import React, { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Vehicles from '../../../vehicles/page'

// Host › Vehicles — this host's fleet.
//
// It renders the Vehicles screen with `hostId` pinned rather than carrying its
// own copy of the fetch and the columns. The two used to be separate files with
// the same 120 lines of column definitions, so the host tab froze whatever the
// main list looked like on the day it was cloned — including the unguarded
// `pickupPoint.city.name` that crashes the page on a vehicle with no pickup.
//
// `embedded` drops the page chrome: the title, breadcrumb and sticky header
// belong to the host detail screen, and a second PageLayout would nest one
// inside a tab. The host column is dropped too — every row has the same host,
// which is the whole point of the tab.

export default function HostVehicles() {
  const { id } = useParams()

  // Memoised: this is a dependency of the loader's useCallback, and a fresh
  // object per render would refetch the list on every render.
  const extraQuery = useMemo(() => (id ? { hostId: id } : null), [id])

  return <Vehicles extraQuery={extraQuery} showHost={false} embedded />
}
