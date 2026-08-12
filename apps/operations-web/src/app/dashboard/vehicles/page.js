'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast, InfoToast, apiErrorMessage } from '@cocarr/notifications'
import { LIMIT } from '@cocarr/shared-utils'
import { PageLayout, Pagination } from '@cocarr/ui'
import { useCan } from '@cocarr/iam-sdk'
import VehicleTable from './_components/VehicleTable'
import ManageVehicle from './_components/ManageVehicle'
import {
  EmptyState, Explainer, FilterSelect, ListState, SearchBox, useDebounced,
} from '@/app/_components/ui'

// The fleet — every car across every host and city.
//
// SEARCH USED TO DO NOTHING. The box was bound to state that no request ever
// read: `getVehicles` sent offset and limit and nothing else, so typing
// filtered nothing and the list silently stayed on page one of everything. The
// server parameter is `searchTerm` (matched against vehicleName and
// vehicleBrand), which is what is sent now.
//
// THE FILTERS HERE ARE THE ONES THE SERVER ACTUALLY HAS. `approved` and
// `filters[city]` are real query parameters; there is no server-side filter for
// rejected, suspended or maintenance, so those are not offered. A filter that
// silently returns the unfiltered list is worse than no filter — the answer
// looks authoritative.

const APPROVAL = [
  { value: '', label: 'Any review status' },
  { value: 'false', label: 'Pending approval' },
  { value: 'true', label: 'Approved' },
]

export default function Vehicles({ extraQuery = null, title = 'Vehicles', showHost = true, embedded = false } = {}) {
  const canCreate = useCan('operations.vehicles.create')
  const [showCreate, setShowCreate] = useState(false)
  const [searchText, setSearchText] = useState('')
  const search = useDebounced(searchText)
  const [approved, setApproved] = useState('')
  const [city, setCity] = useState('')
  const [cities, setCities] = useState([])
  const [offset, setOffset] = useState(0)

  const [vehicles, setVehicles] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        populate: true,
        offset,
        limit: LIMIT,
        searchTerm: search || undefined,
        approved: approved || undefined,
        // qs (Express's default query parser) reads `filters[city]` back as a
        // nested object, which is the shape getAllVehicles destructures.
        ...(city ? { 'filters[city]': city } : {}),
        ...(extraQuery || {}),
      }
      const res = await coreApi().get('/admin/vehicle', { params })
      setVehicles(res.data?.vehicles || [])
      setCount(res.data?.totalCount || 0)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load vehicles.'))
    } finally {
      setLoading(false)
    }
  }, [offset, search, approved, city, extraQuery])

  useEffect(() => { load() }, [load])
  useEffect(() => { setOffset(0) }, [search, approved, city])

  // Cities are reference data and cheap; a failure here must not take the fleet
  // list with it, so the filter simply does not appear.
  useEffect(() => {
    let cancelled = false
    coreApi().get('/city')
      .then((res) => { if (!cancelled) setCities(res.data?.data || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // `POST /vehicle` is authenticateAdmin (unlike `POST /host`, which is the
  // mobile app's own call) — so an admin listing a car on a host's behalf is a
  // real, supported flow.
  const createVehicle = async (e, data, images) => {
    e.preventDefault()
    try {
      const imageList = (images || []).map((item) => ({ src: item.src, isCover: !!item.isCover }))
      await coreApi().post('/vehicle', { ...data, images: imageList })
      InfoToast('Vehicle created')
      setShowCreate(false)
      setOffset(0)
      await load()
    } catch (err) {
      // The old handler indexed into `error.response.data.error[<first key>]`,
      // which throws inside the catch on any network failure and replaces the
      // real error with a TypeError pointing at the handler.
      ErrorToast(apiErrorMessage(err, 'Could not create the vehicle.'))
    }
  }

  const isFiltered = Boolean(search || approved || city)

  const body = (
    <ListState
      loading={loading}
      error={error}
      onRetry={load}
      isEmpty={vehicles.length === 0}
      empty={(
        <EmptyState
          title={isFiltered ? 'No vehicles match these filters' : 'No vehicles yet'}
          message={isFiltered
            ? 'Search matches the vehicle name and brand only — a registration number will not find anything.'
            : 'A vehicle appears here as soon as a host starts a listing, including drafts they have not submitted.'}
        />
      )}
    >
      <VehicleTable vehicles={vehicles} showHost={showHost} />
      <Explainer>
        Review status is the admin decision. A car is bookable only when it is approved, the host has it
        switched on, and an availability window covers the time — see Scheduling.
      </Explainer>
    </ListState>
  )

  // Embedded inside a host's tab bar, the page chrome belongs to the host
  // detail screen; rendering a second PageLayout would put a title and
  // breadcrumb inside a tab.
  if (embedded) {
    return (
      <div className='w-full'>
        <div className='flex items-center gap-3 flex-wrap mb-4'>
          <SearchBox value={searchText} onChange={setSearchText} placeholder='Search by name or brand' />
          <FilterSelect value={approved} onChange={setApproved} options={APPROVAL} />
          <span className='text-xs text-[#959595]'>
            {loading ? 'Loading…' : `${count} vehicle${count === 1 ? '' : 's'}`}
          </span>
          <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
        </div>
        {body}
      </div>
    )
  }

  return (
    <PageLayout
      title={title}
      subtitle='Every car on the platform, across all hosts and cities.'
      breadcrumb={['Operations', 'Vehicles']}
      actions={canCreate ? (
        <button type='button' className='btn-md' onClick={() => setShowCreate(true)}>+ Add vehicle</button>
      ) : null}
      filters={(
        <>
          <SearchBox value={searchText} onChange={setSearchText} placeholder='Search by name or brand' />
          <FilterSelect value={approved} onChange={setApproved} options={APPROVAL} />
          {cities.length > 0 && (
            <FilterSelect
              value={city}
              onChange={setCity}
              options={[{ value: '', label: 'All cities' },
                ...cities.map((c) => ({ value: c.id, label: c.name }))]}
            />
          )}
          <span className='text-xs text-[#959595]'>
            {loading ? 'Loading…' : `${count} vehicle${count === 1 ? '' : 's'}`}
          </span>
          <div className='ml-auto'><Pagination count={count} offset={offset} setOffset={setOffset} /></div>
        </>
      )}
    >
      {body}
      {showCreate && (
        <ManageVehicle onClose={() => setShowCreate(false)} onSubmit={createVehicle} edit={null} />
      )}
    </PageLayout>
  )
}
