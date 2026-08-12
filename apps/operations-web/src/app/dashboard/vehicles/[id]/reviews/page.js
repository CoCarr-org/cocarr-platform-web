'use client'
import React from 'react'
import { EmptyState, Explainer } from '@/app/_components/ui'

// Vehicle › Reviews — honestly empty, because there is no endpoint behind it.
//
// WHAT THIS PAGE WAS. A 236-line copy of the rides list. Its loader was still
// called `getRides`, it fetched `GET /booking?populate=true&offset=…` — the
// PUBLIC rider endpoint, not an admin one — with no vehicle id anywhere in the
// query, and rendered the resulting bookings under a heading that said Reviews.
// So the tab showed the platform's bookings, unscoped, labelled as this car's
// customer reviews. A screen that is wrong is worse than a screen that is
// missing: the first gets believed.
//
// The data exists — `reviews` rows carry `vehicleId`, `totalRating` and the
// four sub-ratings — but nothing exposes them to an admin. `GET
// /admin/vehicle/:id/review` is the VERIFICATION payload (documents, physical
// checks, approval gate) and is a different thing entirely, despite the name.
//
// Building `GET /admin/vehicle/:id/customer-reviews` in cocarr-core-api is what
// unblocks this. Until then the tab says so.

export default function VehicleReviews() {
  return (
    <div className='w-full'>
      <EmptyState
        title='Customer reviews are not available here yet'
        message='Riders rate a car on cleanliness, comfort, handling and the host after each ride, and those ratings feed the average shown on the overview. There is no admin endpoint to read the individual reviews back.'
      />
      <div className='mt-4'>
        <Explainer tone='warn'>
          Needs <code>GET /admin/vehicle/:id/customer-reviews</code> in cocarr-core-api. The rows already
          exist — <code>reviews.vehicleId</code> with <code>totalRating</code> and the four sub-ratings —
          they are simply not exposed to the panel.
        </Explainer>
      </div>
    </div>
  )
}
