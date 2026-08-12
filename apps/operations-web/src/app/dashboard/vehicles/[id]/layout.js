'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { NavigationTabBar } from '@cocarr/ui'
import { STATUS_LABEL, STATUS_PILL } from '@/app/_helpers/vehicleStatus'
import { DetailHeader, ErrorState, Pill, StatusPill, Thumb } from '@/app/_components/ui'
import { VehicleContext } from './_VehicleContext'

// Vehicle detail shell.
//
// TWO ROUTING BUGS FIXED HERE, BOTH INVISIBLE FROM THE CODE THAT HELD THEM:
//
//   1. The tab bar linked to `/dashboard/vehicles/{id}/payment`, which does not
//      exist as a route — the Payments tab 404'd for every vehicle.
//   2. It did NOT link to `/review`, which is the vehicle verification screen.
//      That screen was reachable only from the approvals queue, so anyone
//      arriving at a vehicle any other way could not get to the one page that
//      decides whether it goes live.
//
// The header carries identity AND review status above the tab bar, so the
// answer to "is this car approved?" does not depend on which tab is open. It
// previously rendered a bare concatenated name and nothing else.

export default function VehicleDetailLayout({ children }) {
  const { id } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await coreApi().get(`/admin/vehicle/${id}`)
      setVehicle(res.data || null)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this vehicle.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const tabs = [
    { label: 'Overview', url: `/dashboard/vehicles/${id}` },
    { label: 'Review', url: `/dashboard/vehicles/${id}/review` },
    { label: 'Availability', url: `/dashboard/vehicles/${id}/availability-schedule` },
    { label: 'Rides', url: `/dashboard/vehicles/${id}/rides` },
    { label: 'Reviews', url: `/dashboard/vehicles/${id}/reviews` },
  ]

  const cover = Array.isArray(vehicle?.images)
    ? (vehicle.images.find((i) => i.isCover) || vehicle.images[0])?.url
    : null

  const title = vehicle
    ? [vehicle.brand?.name, vehicle.vehicleName].filter(Boolean).join(' ') || 'Vehicle'
    : (loading ? 'Loading…' : 'Vehicle')

  const value = React.useMemo(
    () => ({ vehicle, loading, error, reload: load }),
    [vehicle, loading, error, load],
  )

  return (
    <VehicleContext.Provider value={value}>
      <div className='max-w-7xl mx-auto px-6'>
        <DetailHeader
          backHref='/dashboard/vehicles'
          backLabel='All vehicles'
          media={<Thumb src={cover} alt={title} className='w-20 h-14' />}
          title={title}
          subtitle={vehicle?.vehicleNumber}
          pills={vehicle ? (
            <>
              <StatusPill status={vehicle.approvalStatus || 'pending'} labels={STATUS_LABEL} pills={STATUS_PILL} />
              {/* The host's own on/off switch, which is not the same as the
                  admin decision — an approved car with it off takes no
                  bookings and nothing else on the page says so. */}
              {vehicle.active === false && <Pill tone='warn'>Switched off by host</Pill>}
              {vehicle.isDraft && <Pill tone='neutral'>Draft</Pill>}
            </>
          ) : null}
          meta={vehicle ? [
            { label: 'Host', value: vehicle.host?.name || vehicle.host?.user?.name },
            { label: 'City', value: vehicle.pickupPoint?.city?.name || 'No pickup set' },
            { label: 'Vehicle id', value: vehicle.id },
          ] : []}
        />

        <NavigationTabBar options={tabs} />

        {/* Children render regardless: the Rides, Reviews and Availability tabs
            fetch by id and are usable without the vehicle record. */}
        {error && <div className='pt-4'><ErrorState message={error} onRetry={load} /></div>}
        <div className='py-6'>{children}</div>
      </div>
    </VehicleContext.Provider>
  )
}
