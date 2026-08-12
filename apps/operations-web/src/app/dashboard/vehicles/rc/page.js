'use client'
import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { coreApi } from '@cocarr/api-sdk'
import { InfoToast, ErrorToast, apiErrorMessage } from '@cocarr/notifications'
import { PageLayout, Pagination } from '@cocarr/ui'
import { LIMIT } from '@cocarr/shared-utils'
import { useCan } from '@cocarr/iam-sdk'
import { DocumentThumb, StatusPill, VerifyActions, docState } from '@/app/_components/DocumentCell'
import {
  EmptyState, Explainer, Field, FieldGrid, FilterSelect, ListState, SearchBox, useDebounced,
} from '@/app/_components/ui'

// Vehicle RC details — the registration certificate behind every listing.
//
// A ROW IS NOT ENOUGH TO VERIFY AN RC, SO THE SCAN IS ON THE ROW.
//
// The previous version put the document behind a text link (`DocumentImage`),
// which made the typed number look like the primary data and the document
// optional. It is the other way round: engine, chassis, maker and colour are
// captured FROM the RC record at verification time, and the reviewer's job is
// to check the scan against them. Same reasoning as the user KYC screens, which
// moved to `DocumentThumb` for exactly this.
//
// Verify is per row and reversible. Un-verify matters — an RC approved by
// mistake has to be undoable, and the reversal is what the activity log records.

const STATUS = [
  { value: '', label: 'Any status' },
  { value: 'pending', label: 'Pending review' },
  { value: 'verified', label: 'Verified' },
]

export default function VehicleRc() {
  const canUpdate = useCan('operations.vehicles.update')

  const [searchText, setSearchText] = useState('')
  const search = useDebounced(searchText)
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)

  const [vehicles, setVehicles] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await coreApi().get('/admin/vehicle-rc', {
        params: { offset, limit: LIMIT, search: search || undefined, status: status || undefined },
      })
      setVehicles(res.data?.data || [])
      setCount(res.data?.totalCount || 0)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load RC details.'))
    } finally {
      setLoading(false)
    }
  }, [offset, search, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setOffset(0) }, [search, status])

  const setVerified = async (id, verified) => {
    setBusy(id)
    try {
      await coreApi().put(`/admin/vehicle-rc/${id}`, { verified })
      InfoToast(verified ? 'RC verified' : 'Verification removed')
      await load()
    } catch (err) {
      ErrorToast(apiErrorMessage(err, 'Could not update this RC.'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageLayout
      title='Vehicle RC details'
      subtitle='Registration certificates, and the vehicle data read off them.'
      breadcrumb={['Operations', 'Vehicles', 'RC details']}
      filters={(
        <>
          <SearchBox value={searchText} onChange={setSearchText}
            placeholder='Search by vehicle name, number or RC number' />
          <FilterSelect value={status} onChange={setStatus} options={STATUS} />
          <span className='text-xs text-[#959595]'>
            {loading ? 'Loading…' : `${count} vehicle${count === 1 ? '' : 's'}`}
          </span>
          <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
        </>
      )}
    >
      <ListState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={vehicles.length === 0}
        empty={(
          <EmptyState
            title={search || status ? 'No RC records match these filters' : 'No RC records yet'}
            message='An RC record is created when a host uploads their registration certificate during listing.'
          />
        )}
      >
        <div className='space-y-3'>
          {vehicles.map((v) => {
            const state = docState(!!v.vehicleRcNumber, v.vehicleRcVerified)
            const isOpen = expanded === v.id
            return (
              <div key={v.id} className='bg-white border border-gray-100 rounded-lg p-4'>
                <div className='flex gap-4 items-start'>
                  {/* The artifact first. Everything to the right of it is
                      read OFF this image, so it cannot be a link. */}
                  <div className='w-40 shrink-0'>
                    <DocumentThumb src={v.vehicleRcImage} label='RC document' />
                  </div>

                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <Link href={`/dashboard/vehicles/${v.id}`}
                        className='text-sm font-semibold text-[#1a1a1a] hover:underline'>
                        {v.vehicleName || 'Untitled vehicle'}
                      </Link>
                      <span className='text-xs text-[#959595] font-mono'>{v.vehicleNumber || '—'}</span>
                      <StatusPill state={state} />
                      {/* The provider's verdict and an admin's sign-off are
                          different facts. A provider-verified RC that no admin
                          has accepted is the common case worth surfacing. */}
                      {v.rcVerified && !v.vehicleRcVerified && (
                        <span className='text-[11px] font-semibold text-green-700'>Provider-verified</span>
                      )}
                    </div>

                    <FieldGrid cols={4}>
                      <Field label='RC number' value={v.vehicleRcNumber} mono />
                      <Field label='Owner on RC' value={v.ownerName} />
                      <Field label='Host' value={v.host?.name} />
                      <Field label='Model' value={v.model} />
                    </FieldGrid>

                    {isOpen && (
                      <div className='mt-4 pt-4 border-t border-gray-50'>
                        <FieldGrid cols={4}>
                          <Field label='Maker' value={v.vehicleMaker} />
                          <Field label='Year' value={v.vehicleYear} />
                          <Field label='Colour' value={v.vehicleColor} />
                          <Field label='Fuel type' value={v.vehicleFuelType} />
                          <Field label='Engine number' value={v.vehicleEngineNumber} mono />
                          <Field label='Chassis number' value={v.vehicleChassisNumber} mono />
                          <Field label='Verification reference' value={v.rcVerificationId} mono />
                        </FieldGrid>
                        <div className='mt-3'>
                          <Explainer>
                            Engine, chassis, maker and colour are captured from the RC record at verification
                            time — they are not typed by the host, so a mismatch against the scan is a real signal.
                          </Explainer>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className='flex flex-col items-end gap-2 shrink-0'>
                    {canUpdate ? (
                      <VerifyActions
                        state={state}
                        busy={busy === v.id}
                        onVerify={() => setVerified(v.id, true)}
                        onUnverify={() => setVerified(v.id, false)}
                      />
                    ) : (
                      <span className='text-[11px] text-[#959595]'>View only</span>
                    )}
                    <button onClick={() => setExpanded(isOpen ? null : v.id)}
                      className='text-xs font-semibold text-[#757575] hover:text-[#151515]'>
                      {isOpen ? 'Hide details' : 'RC details'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ListState>
    </PageLayout>
  )
}
