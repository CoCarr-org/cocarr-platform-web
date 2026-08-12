'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ImageSlider, RcInfo } from '@cocarr/ui'
import { getValidDateFormat } from '@cocarr/shared-utils'
import { STATUS_MEANING } from '@/app/_helpers/vehicleStatus'
import {
  EmptyState, Explainer, Field, FieldGrid, LoadingBlock, SectionCard, Stat, StatRow,
} from '@/app/_components/ui'
import { useVehicle } from './_VehicleContext'

// Vehicle overview — the record, not the decision.
//
// THE DECISION MOVED OUT. This page carried a "Vehicle is Pending for Approval"
// bar whose button opened a slide-in listing RC fields beside typed ones and
// ending in a single Approve. That is a thinner version of the `/review` tab,
// which reviews the RC and the host's PAN as documents, shows the host's
// identity status, the payout account and the physical checks, and gates
// Approve on `readyToApprove` from the server. Two screens approving the same
// vehicle with different amounts of evidence in front of you is how a car gets
// approved on the thinner one.
//
// The `menu` useState that PR #29 added a Verification entry to was never
// rendered by anything — the tab bar lives in layout.js. That is why the review
// screen has been unreachable from here; the layout now carries the tab and
// this dead state is gone.
//
// `RcInfo` stays: reading the raw RC record is a lookup, not a decision.

export default function VehicleOverview() {
  const { id } = useParams()
  const { vehicle, loading } = useVehicle()
  const [showRc, setShowRc] = useState(false)

  if (loading && !vehicle) return <LoadingBlock label='Loading vehicle…' />
  if (!vehicle) return null

  const status = vehicle.approvalStatus || 'pending'
  const images = Array.isArray(vehicle.images) ? vehicle.images : []

  return (
    <>
      <StatRow cols={4}>
        <Stat label='Rating' value={vehicle.rating ? Number(vehicle.rating).toFixed(1) : '—'}
          hint={`${vehicle.reviews || 0} review${vehicle.reviews === 1 ? '' : 's'}`} />
        <Stat label='Photos' value={images.length}
          hint={images.length < 3 ? 'Usually too few to approve' : undefined} />
        <Stat label='Listed' value={getValidDateFormat(vehicle.createdAt)} />
        <Stat label='Host switch' value={vehicle.active === false ? 'Off' : 'On'}
          hint="The host's own availability toggle" />
      </StatRow>

      <SectionCard
        title='Review status'
        description={STATUS_MEANING[status]}
        actions={<Link href={`/dashboard/vehicles/${id}/review`} className='btn-md'>Open review</Link>}
      >
        <FieldGrid cols={4}>
          <Field label='Status' value={status} />
          <Field label='Admin approved' value={vehicle.isAdminApproved ? 'Yes' : 'No'} />
          <Field label='RC verified' value={(vehicle.vehicleRcVerified || vehicle.rcVerified) ? 'Yes' : 'No'} />
          <Field label='Draft' value={vehicle.isDraft ? 'Not yet submitted' : 'Submitted'} />
        </FieldGrid>

        {vehicle.rejectionReason && (
          <div className='mt-4'>
            <Explainer tone='warn'>
              Rejected: {vehicle.rejectionReason} — editing the vehicle resubmits it and returns it to pending.
            </Explainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title='Vehicle'
        description='What the host entered when listing the car.'
        actions={(
          <button type='button' onClick={() => setShowRc(true)}
            className='text-xs font-semibold text-[#454545] hover:text-[#151515]'>
            View RC record →
          </button>
        )}
      >
        <FieldGrid cols={4}>
          <Field label='Name' value={vehicle.vehicleName} />
          <Field label='Registration' value={vehicle.vehicleNumber} mono />
          <Field label='Brand' value={vehicle.brand?.name} />
          <Field label='Type' value={vehicle.vehicleType} />
          <Field label='Year' value={vehicle.vehicleYear} />
          <Field label='Colour' value={vehicle.color} />
          <Field label='Seats' value={vehicle.vehicleSeats} />
          <Field label='Fuel' value={vehicle.vehicleFuelType} />
          <Field label='Transmission' value={vehicle.vehicleTransmission} />
          <Field label='Pickup city' value={vehicle.pickupPoint?.city?.name || 'No pickup set'} />
        </FieldGrid>
      </SectionCard>

      <SectionCard
        title='Host'
        description='Who owns this car.'
        actions={vehicle.hostId ? (
          <Link href={`/dashboard/hosts/${vehicle.hostId}`}
            className='text-xs font-semibold text-[#454545] hover:text-[#151515]'>
            Open host →
          </Link>
        ) : null}
      >
        <FieldGrid cols={3}>
          <Field label='Name' value={vehicle.host?.name} />
          <Field label='Email' value={vehicle.host?.email} capitalize={false} />
          <Field label='Phone' value={vehicle.host?.contactNumber} />
        </FieldGrid>
      </SectionCard>

      <SectionCard title='Photos' description='What a rider sees on the listing.'>
        {images.length === 0 ? (
          <EmptyState
            title='No photos'
            message='A listing with no photographs cannot be approved — the in-person vehicle check needs something to check against.'
          />
        ) : (
          <ImageSlider images={images} />
        )}
      </SectionCard>

      {showRc && <RcInfo show={showRc} setShow={setShowRc} id={id} />}
    </>
  )
}
