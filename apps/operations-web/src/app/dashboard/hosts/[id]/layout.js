'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { coreApi } from '@cocarr/api-sdk'
import { apiErrorMessage } from '@cocarr/notifications'
import { getValidDateFormat } from '@cocarr/shared-utils'
import { NavigationTabBar, PageLayout } from '@cocarr/ui'
import { Avatar, DetailHeader, ErrorState, Pill } from '@/app/_components/ui'
import { hostKycState } from '@/app/_helpers/hostKyc'
import { HostContext } from './_HostContext'

// Host detail shell — identity, status and tabs.
//
// The header sits ABOVE the tab bar and does not change as you move between
// tabs, so it always answers "whose record am I looking at?". Previously the
// layout rendered a bare `SimpleHeader` with the host's name and nothing else:
// on the Rides or Vehicles tab there was no way to tell an unverified host from
// a verified one without navigating back to the overview.
//
// The host is fetched ONCE here and handed down through context. The overview
// tab used to issue the same `GET /host/:id` a second time, so opening the page
// made two identical requests and the two copies could disagree for a beat.

export default function HostDetailLayout({ children }) {
  const { id } = useParams()
  const [host, setHost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await coreApi().get(`/host/${id}`)
      setHost(res.data || null)
      setError('')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this host.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const tabs = [
    { label: 'Overview', url: `/dashboard/hosts/${id}` },
    { label: 'Vehicles', url: `/dashboard/hosts/${id}/vehicles` },
    { label: 'Rides', url: `/dashboard/hosts/${id}/rides` },
    { label: 'Payouts', url: `/dashboard/hosts/${id}/payment` },
  ]

  const name = host?.name || host?.user?.name

  // Memoised, or every render of the layout hands the tabs a new object and
  // re-renders all of them for no change.
  const value = React.useMemo(
    () => ({ host, loading, error, reload: load }),
    [host, loading, error, load],
  )

  return (
    <HostContext.Provider value={value}>
      {/* SAME THREE BANDS AS EVERY LIST SCREEN (see PageLayout):
          navigation header -> tabs -> content. Detail screens used to be a
          plain container with the header and tab bar scrolling away with the
          page, so on a long tab you lost both which record you were in and the
          means to leave it. The identity + tabs are now one sticky block and
          only the data scrolls. */}
      <div className='min-h-full min-w-0'>
        <div className='sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur-sm'>
          <div className='max-w-7xl mx-auto min-w-0 px-6'>
        <DetailHeader
          backHref='/dashboard/hosts'
          backLabel='All hosts'
          media={<Avatar src={host?.profilePhoto} name={name} size={52} />}
          title={loading && !host ? 'Loading…' : (name || 'Unnamed host')}
          subtitle={host?.email || host?.user?.email}
          pills={host ? (
            <>
              <Pill tone={host.isActive === false ? 'bad' : 'good'}>
                {host.isActive === false ? 'Inactive' : 'Active'}
              </Pill>
              {/* NOT `host.kycVerified` — that column has never been written by
                  anything, so this pill said "KYC pending" about every host on
                  the platform, including the ones holding a verified Aadhaar and
                  PAN. The real state is resolved from the USER's documents and
                  arrives under `verification`; see _helpers/hostKyc.js, which is
                  also what the panel below the fold reads, so the header and the
                  section cannot disagree. */}
              {(() => {
                const kyc = hostKycState(host.verification)
                return <Pill tone={kyc.tone}>{kyc.label}</Pill>
              })()}
            </>
          ) : null}
          meta={host ? [
            { label: 'Phone', value: `${host.countryCode || ''} ${host.contactNumber || ''}`.trim() },
            { label: 'Joined', value: getValidDateFormat(host.createdAt) },
            { label: 'Host id', value: host.id },
          ] : []}
        />

          <NavigationTabBar options={tabs} />
          </div>
        </div>

        {/* Children are rendered even while the host is still loading, and even
            if it failed: the Rides and Vehicles tabs fetch their own data by id
            and are perfectly usable without the host record. Only the identity
            block above depends on it, so only that reports the failure. */}
        {/* Content band — same max width and gutters as the header above, so
            the two line up instead of the body sitting off-centre from its own
            title. */}
        <div className='max-w-7xl mx-auto min-w-0 px-6'>
          {error && (
            <div className='pt-4'>
              <ErrorState message={error} onRetry={load} />
            </div>
          )}
          <div className='py-6'>{children}</div>
        </div>
      </div>
    </HostContext.Provider>
  )
}
